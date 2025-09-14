"""
Unit tests for the authentication module.

This module tests password hashing, token management, and user authentication
with proper isolation and comprehensive coverage.
"""
import time
import pytest
from unittest.mock import patch

from auth import (
    TokenManager, PasswordManager, AuthenticationError,
    token_manager, password_manager
)


class TestPasswordManager:
    """Test password hashing and verification functionality."""
    
    def test_hash_password_creates_valid_hash(self):
        """Test that password hashing creates a valid hash."""
        password = "testpassword123"
        hashed = password_manager.hash_password(password)
        
        assert hashed is not None
        assert isinstance(hashed, str)
        assert len(hashed) > 20  # bcrypt hashes are longer
        assert hashed != password  # Should be different from original
    
    def test_verify_password_with_correct_password(self):
        """Test password verification with correct password."""
        password = "testpassword123"
        hashed = password_manager.hash_password(password)
        
        assert password_manager.verify_password(password, hashed) is True
    
    def test_verify_password_with_incorrect_password(self):
        """Test password verification with incorrect password."""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = password_manager.hash_password(password)
        
        assert password_manager.verify_password(wrong_password, hashed) is False
    
    def test_validate_password_strength_minimum_length(self):
        """Test password strength validation for minimum length."""
        # Valid password
        valid, msg = password_manager.validate_password_strength("validpass123")
        assert valid is True
        assert msg == ""
        
        # Too short
        valid, msg = password_manager.validate_password_strength("123")
        assert valid is False
        assert "at least" in msg.lower()
    
    def test_validate_password_strength_maximum_length(self):
        """Test password strength validation for maximum length."""
        # Too long password (over 100 characters)
        long_password = "a" * 101
        valid, msg = password_manager.validate_password_strength(long_password)
        assert valid is False
        assert "exceed" in msg.lower()
    
    def test_hash_password_with_empty_string(self):
        """Test hashing empty password works (passlib allows it)."""
        # Empty passwords are technically hashable, though not recommended
        hashed = password_manager.hash_password("")
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        # Verify the empty password can be verified
        assert password_manager.verify_password("", hashed) is True


class TestTokenManager:
    """Test token creation, validation, and management functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.token_manager = TokenManager(expire_hours=1)  # 1 hour for testing
        from auth import tokens
        tokens.clear()  # Clear any existing tokens
    
    def test_create_token_returns_valid_token(self):
        """Test token creation returns a valid token."""
        from auth import tokens
        username = "testuser"
        token = self.token_manager.create_token(username)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) == 64  # 32 bytes hex = 64 characters
        assert token in tokens
    
    def test_validate_token_with_valid_token(self):
        """Test token validation with valid token."""
        username = "testuser"
        token = self.token_manager.create_token(username)
        
        validated_username = self.token_manager.validate_token(token)
        assert validated_username == username
    
    def test_validate_token_with_invalid_token(self):
        """Test token validation with invalid token."""
        invalid_token = "invalid_token_123"
        
        validated_username = self.token_manager.validate_token(invalid_token)
        assert validated_username is None
    
    def test_validate_token_updates_last_used(self):
        """Test that token validation updates last_used timestamp."""
        from auth import tokens
        username = "testuser"
        token = self.token_manager.create_token(username)
        
        original_last_used = tokens[token]["last_used"]
        
        # Wait a bit to ensure timestamp difference
        import time
        time.sleep(0.01)
        
        validated_username = self.token_manager.validate_token(token)
        updated_last_used = tokens[token]["last_used"]
        
        assert validated_username == username
        assert updated_last_used > original_last_used
    
    def test_is_token_expired_with_expired_token(self):
        """Test token expiration detection."""
        # Create token data that's expired
        expired_token_data = {
            "username": "testuser",
            "created": time.time() - (2 * 3600)  # 2 hours ago
        }
        
        assert self.token_manager.is_token_expired(expired_token_data) is True
    
    def test_is_token_expired_with_valid_token(self):
        """Test token expiration detection with valid token."""
        # Create token data that's not expired
        valid_token_data = {
            "username": "testuser",
            "created": time.time() - 1800  # 30 minutes ago
        }
        
        assert self.token_manager.is_token_expired(valid_token_data) is False
    
    def test_revoke_token_removes_token(self):
        """Test token revocation removes token from storage."""
        from auth import tokens
        username = "testuser"
        token = self.token_manager.create_token(username)
        
        assert token in tokens
        
        revoked = self.token_manager.revoke_token(token)
        assert revoked is True
        assert token not in tokens
    
    def test_revoke_nonexistent_token(self):
        """Test revoking non-existent token returns False."""
        nonexistent_token = "nonexistent_token"
        
        revoked = self.token_manager.revoke_token(nonexistent_token)
        assert revoked is False
    
    def test_revoke_user_tokens_removes_all_user_tokens(self):
        """Test that revoking user tokens removes all tokens for that user."""
        from auth import tokens
        username = "testuser"
        other_username = "otheruser"
        
        # Create multiple tokens for the user
        token1 = self.token_manager.create_token(username)
        token2 = self.token_manager.create_token(username)
        other_token = self.token_manager.create_token(other_username)
        
        revoked_count = self.token_manager.revoke_user_tokens(username)
        
        assert revoked_count == 2
        assert token1 not in tokens
        assert token2 not in tokens
        assert other_token in tokens  # Other user's token should remain
    
    def test_cleanup_expired_tokens_removes_expired_only(self):
        """Test that cleanup removes only expired tokens."""
        from auth import tokens
        # Create a mix of expired and valid tokens
        valid_username = "validuser"
        expired_username = "expireduser"
        
        valid_token = self.token_manager.create_token(valid_username)
        
        # Manually create expired token
        expired_token = "expired_token"
        tokens[expired_token] = {
            "username": expired_username,
            "created": time.time() - (2 * 3600)  # 2 hours ago
        }
        
        cleaned_count = self.token_manager.cleanup_expired_tokens()
        
        assert cleaned_count == 1
        assert valid_token in tokens
        assert expired_token not in tokens
    
    def test_get_active_sessions_count(self):
        """Test getting count of active sessions."""
        from auth import tokens
        # Create mix of active and expired sessions
        self.token_manager.create_token("user1")
        self.token_manager.create_token("user2")
        
        # Add expired token manually
        expired_token = "expired_token"
        tokens[expired_token] = {
            "username": "expireduser",
            "created": time.time() - (2 * 3600)
        }
        
        active_count = self.token_manager.get_active_sessions()
        assert active_count == 2  # Should not count expired token


class TestGlobalInstances:
    """Test global authentication instances."""
    
    def test_token_manager_instance_exists(self):
        """Test that global token manager instance exists."""
        assert token_manager is not None
        assert isinstance(token_manager, TokenManager)
    
    def test_password_manager_instance_exists(self):
        """Test that global password manager instance exists."""
        assert password_manager is not None
        assert isinstance(password_manager, PasswordManager)
    
    def test_token_manager_default_expiration(self):
        """Test that token manager has correct default expiration."""
        # Should use settings.token_expire_hours
        assert token_manager.expire_hours == 24  # Default from settings


@pytest.mark.integration
class TestAuthenticationIntegration:
    """Integration tests for authentication workflow."""
    
    def setup_method(self):
        """Set up clean state for integration tests."""
        from auth import tokens
        tokens.clear()
    
    def test_complete_authentication_flow(self):
        """Test complete authentication flow from password to token validation."""
        username = "testuser"
        password = "testpassword123"
        
        # Hash password
        hashed_password = password_manager.hash_password(password)
        
        # Verify password
        assert password_manager.verify_password(password, hashed_password)
        
        # Create token
        token = token_manager.create_token(username)
        
        # Validate token
        validated_username = token_manager.validate_token(token)
        assert validated_username == username
        
        # Revoke token
        revoked = token_manager.revoke_token(token)
        assert revoked is True
        
        # Token should no longer be valid
        validated_username = token_manager.validate_token(token)
        assert validated_username is None