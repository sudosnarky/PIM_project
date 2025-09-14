"""
Authentication and authorization services for the PARA InfoSystem API.

This module provides password hashing, token management, and user authentication
with secure token expiration and session management.
"""
import secrets
import time
import logging
from typing import Dict, Optional, Tuple
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from config import settings

logger = logging.getLogger(__name__)

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Password hashing context
pwd_context = CryptContext(
    schemes=settings.password_hash_schemes,
    deprecated="auto"
)

# In-memory token storage
# In production, consider Redis or database storage
TokenData = Dict[str, Dict[str, float]]
tokens: TokenData = {}


class AuthenticationError(Exception):
    """Custom exception for authentication-related errors."""
    pass


class TokenManager:
    """
    Manages authentication tokens with expiration and cleanup.
    
    This class provides methods for creating, validating, and managing
    authentication tokens with automatic expiration and cleanup.
    """
    
    def __init__(self, expire_hours: int = settings.token_expire_hours):
        """
        Initialize token manager.
        
        Args:
            expire_hours: Token expiration time in hours
        """
        self.expire_hours = expire_hours
        self.expire_seconds = expire_hours * 3600
    
    def create_token(self, username: str) -> str:
        """
        Create a new authentication token for a user.
        
        Args:
            username: Username for the token
            
        Returns:
            str: Generated authentication token
        """
        token = secrets.token_hex(32)  # 256-bit token
        tokens[token] = {
            "username": username,
            "created": time.time(),
            "last_used": time.time()
        }
        
        # Cleanup expired tokens periodically
        self.cleanup_expired_tokens()
        
        logger.info(f"Created token for user: {username}")
        return token
    
    def validate_token(self, token: str) -> Optional[str]:
        """
        Validate a token and return the associated username.
        
        Args:
            token: Token to validate
            
        Returns:
            str: Username if token is valid, None otherwise
        """
        token_data = tokens.get(token)
        if not token_data:
            return None
        
        # Check if token is expired
        if self.is_token_expired(token_data):
            self.revoke_token(token)
            return None
        
        # Update last used timestamp
        token_data["last_used"] = time.time()
        
        return token_data["username"]
    
    def is_token_expired(self, token_data: Dict[str, float]) -> bool:
        """
        Check if a token has expired.
        
        Args:
            token_data: Token data dictionary
            
        Returns:
            bool: True if token is expired
        """
        if not token_data or "created" not in token_data:
            return True
        
        age_seconds = time.time() - token_data["created"]
        return age_seconds > self.expire_seconds
    
    def revoke_token(self, token: str) -> bool:
        """
        Revoke a specific token.
        
        Args:
            token: Token to revoke
            
        Returns:
            bool: True if token was found and revoked
        """
        if token in tokens:
            username = tokens[token].get("username", "unknown")
            del tokens[token]
            logger.info(f"Revoked token for user: {username}")
            return True
        return False
    
    def revoke_user_tokens(self, username: str) -> int:
        """
        Revoke all tokens for a specific user.
        
        Args:
            username: Username whose tokens to revoke
            
        Returns:
            int: Number of tokens revoked
        """
        user_tokens = [
            token for token, data in tokens.items() 
            if data.get("username") == username
        ]
        
        for token in user_tokens:
            del tokens[token]
        
        if user_tokens:
            logger.info(f"Revoked {len(user_tokens)} tokens for user: {username}")
        
        return len(user_tokens)
    
    def cleanup_expired_tokens(self) -> int:
        """
        Remove all expired tokens from storage.
        
        Returns:
            int: Number of tokens cleaned up
        """
        expired_tokens = [
            token for token, data in tokens.items() 
            if self.is_token_expired(data)
        ]
        
        for token in expired_tokens:
            del tokens[token]
        
        if expired_tokens:
            logger.info(f"Cleaned up {len(expired_tokens)} expired tokens")
        
        return len(expired_tokens)
    
    def get_active_sessions(self) -> int:
        """
        Get count of active (non-expired) sessions.
        
        Returns:
            int: Number of active sessions
        """
        return len([
            token for token, data in tokens.items() 
            if not self.is_token_expired(data)
        ])


class PasswordManager:
    """
    Manages password hashing and verification.
    
    This class provides secure password hashing using bcrypt
    with proper salt generation and verification.
    """
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a plain text password.
        
        Args:
            password: Plain text password
            
        Returns:
            str: Hashed password with salt
            
        Raises:
            AuthenticationError: If hashing fails
        """
        try:
            return pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Password hashing failed: {e}")
            raise AuthenticationError("Failed to hash password")
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain text password against a hash.
        
        Args:
            plain_password: Plain text password from user
            hashed_password: Stored hash from database
            
        Returns:
            bool: True if password matches
        """
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification failed: {e}")
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> Tuple[bool, str]:
        """
        Validate password meets strength requirements.
        
        Args:
            password: Password to validate
            
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        if len(password) < settings.min_password_length:
            return False, f"Password must be at least {settings.min_password_length} characters"
        
        if len(password) > settings.max_password_length:
            return False, f"Password must not exceed {settings.max_password_length} characters"
        
        # Additional strength checks can be added here
        # e.g., require uppercase, lowercase, numbers, symbols
        
        return True, ""


# Global instances
token_manager = TokenManager()
password_manager = PasswordManager()


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    FastAPI dependency to get current authenticated user from token.
    
    Args:
        token: Bearer token from Authorization header
        
    Returns:
        str: Username of authenticated user
        
    Raises:
        HTTPException: 401 if token is invalid or expired
    """
    username = token_manager.validate_token(token)
    if not username:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return username


def get_optional_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[str]:
    """
    FastAPI dependency to get current user if authenticated (optional).
    
    Args:
        token: Bearer token from Authorization header (optional)
        
    Returns:
        Optional[str]: Username if authenticated, None otherwise
    """
    if not token:
        return None
    return token_manager.validate_token(token)