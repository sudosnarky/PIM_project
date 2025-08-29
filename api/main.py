
from fastapi import FastAPI, HTTPException, Depends, Request, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict, Any
import sqlite3
import hashlib
import secrets
import os
import re
import time
import logging
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import bcrypt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("api.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Security constants
SECRET_KEY = os.environ.get("SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
CSRF_TOKEN_EXPIRE_MINUTES = 60

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Rate limiter
limiter = Limiter(key_func=get_remote_address)




app = FastAPI()
"""
Main FastAPI app instance.
"""

# Apply rate limiting to the app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Session middleware for CSRF protection
app.add_middleware(
    SessionMiddleware, 
    secret_key=SECRET_KEY,
    max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
)

# CSRF Middleware
class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "DELETE", "PATCH"):
            csrf_token_header = request.headers.get("X-CSRF-Token")
            csrf_token_cookie = request.cookies.get("csrf_token")
            
            # Skip CSRF for login and register
            if request.url.path not in ["/token", "/register"]:
                if not csrf_token_header or not csrf_token_cookie or csrf_token_header != csrf_token_cookie:
                    logger.warning(f"CSRF attack detected: {request.url.path}")
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"detail": "CSRF token missing or invalid"}
                    )
        
        response = await call_next(request)
        return response

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Set security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response

# Add middlewares to the app
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pim-project.onrender.com", "http://localhost:8000"],  # More restrictive CORS
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
    expose_headers=["X-CSRF-Token"]
)

# Redirect root to login page
@app.get("/", include_in_schema=False)
async def root():
    """
    Redirects the root URL to the login page.
    """
    return RedirectResponse(url="/static/html/index.html")

# Serve static frontend files at /static
app.mount("/static", StaticFiles(directory="static", html=True), name="static")


def get_db():
    """
    Opens a connection to the SQLite database.
    Returns:
        sqlite3.Connection: Database connection.
    """
    conn = sqlite3.connect("pim.db")
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str) -> str:
    """
    Hashes a password using bcrypt.
    Args:
        password (str): The user's password.
    Returns:
        str: The hashed password.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a password against a hash.
    Args:
        plain_password (str): The plain-text password to verify.
        hashed_password (str): The hashed password to compare against.
    Returns:
        bool: True if the password matches, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

# --- Models ---

class User(BaseModel):
    """
    User model for registration and login.
    """
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must contain only letters, numbers, and underscores')
        return v
        
    @validator('password')
    def password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v


class Particle(BaseModel):
    """
    Particle model. Represents a note, task, or resource.
    """
    id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., max_length=50000)
    tags: List[str] = Field(default_factory=list)
    section: str = Field(..., min_length=1, max_length=50)
    created: Optional[str] = None
    user: Optional[str] = None
    
    @validator('title', 'content', 'section')
    def sanitize_text(cls, v):
        # Simple HTML sanitization
        v = html.escape(v)
        return v
        
    @validator('tags')
    def sanitize_tags(cls, tags_list):
        # Sanitize each tag and validate format
        sanitized_tags = []
        for tag in tags_list:
            tag = html.escape(tag.strip())
            # Ensure tag is valid
            if tag and re.match(r'^[a-zA-Z0-9_\-]+$', tag):
                sanitized_tags.append(tag)
        return sanitized_tags

# --- Auth ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# JWT Token utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create a JWT access token.
    
    Args:
        data (dict): The data to encode in the JWT.
        expires_delta (Optional[timedelta]): Token expiration time.
        
    Returns:
        str: Encoded JWT token.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/token")
def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate user and create access token.
    
    Args:
        response (Response): FastAPI response object to set cookie
        form_data (OAuth2PasswordRequestForm): Username and password form data
        
    Returns:
        dict: Access token information
    """
    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE username=?", (form_data.username,))
    user = cur.fetchone()
    
    if not user or not verify_password(form_data.password, user["password"]):
        logger.warning(f"Failed login attempt for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    
    # Create secure HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=not os.environ.get("DEVELOPMENT", False),  # Secure in production
        samesite="lax"
    )
    
    # Create CSRF token
    csrf_token = secrets.token_hex(32)
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        max_age=CSRF_TOKEN_EXPIRE_MINUTES * 60,
        secure=not os.environ.get("DEVELOPMENT", False),  # Secure in production
        samesite="lax"
    )
    
    logger.info(f"Successful login for user: {form_data.username}")
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "csrf_token": csrf_token
    }

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Get current user from JWT token.
    
    Args:
        token (str): JWT token from authorization header
        
    Returns:
        str: Username from token
        
    Raises:
        HTTPException: If token is invalid
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        logger.warning("Invalid JWT token detected")
        raise credentials_exception
        
    # Optional: Verify user still exists in database
    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        logger.warning(f"Token with non-existent user: {username}")
        raise credentials_exception
        
    return username

# --- User Registration (for demo) ---
@app.post("/register")
@limiter.limit("5/minute")
def register(user: User, request: Request):
    """
    Register a new user.
    
    Args:
        user (User): User data with username and password
        request (Request): FastAPI request object for rate limiting
        
    Returns:
        dict: Success message
        
    Raises:
        HTTPException: If username already exists
    """
    logger.info(f"Registration attempt for username: {user.username}")
    db = get_db()
    try:
        # Check if username already exists
        cur = db.execute("SELECT username FROM users WHERE username=?", (user.username,))
        if cur.fetchone():
            logger.warning(f"Registration failed - username already exists: {user.username}")
            raise HTTPException(status_code=400, detail="Username already exists")
            
        # Insert new user with hashed password
        hashed_password = hash_password(user.password)
        db.execute("INSERT INTO users (username, password) VALUES (?, ?)", 
                  (user.username, hashed_password))
        db.commit()
        logger.info(f"User registered successfully: {user.username}")
    except sqlite3.IntegrityError:
        logger.error(f"Database integrity error during registration: {user.username}")
        raise HTTPException(status_code=400, detail="Username already exists")
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        db.rollback() if 'db' in locals() else None
        raise HTTPException(status_code=500, detail="Registration failed")
        
    return {"msg": "User registered successfully"}

# --- Particle CRUD ---
@app.get("/particles", response_model=List[Particle])
@limiter.limit("20/minute")
def list_particles(
    request: Request,
    section: Optional[str] = None, 
    q: Optional[str] = None, 
    user: str = Depends(get_current_user)
):
    """
    Get a list of particles (notes) for the current user.
    
    Args:
        request (Request): FastAPI request for rate limiting
        section (str, optional): Filter by section (Projects, Areas, Resources, Archives)
        q (str, optional): Search query for filtering
        user (str): Current authenticated user
        
    Returns:
        List[Particle]: List of particles matching criteria
    """
    db = get_db()
    
    # Prepare query with parameterization for security
    sql = "SELECT * FROM particles WHERE user=?"
    params = [user]
    
    # Apply filters
    if section:
        # Sanitize section input
        section = html.escape(section)
        sql += " AND section=?"
        params.append(section)
        
    if q:
        # Sanitize search query
        q = html.escape(q)
        sql += " AND (title LIKE ? OR content LIKE ?)"
        params.extend([f"%{q}%", f"%{q}%"])
        
    # Execute query with parameters
    try:
        cur = db.execute(sql, params)
        rows = cur.fetchall()
        
        # Process results
        result = []
        for row in rows:
            data = dict(row)
            data["tags"] = row["tags"].split(",") if row["tags"] else []
            result.append(Particle(**data))
            
        return result
    except Exception as e:
        logger.error(f"Error fetching particles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve particles"
        )

@app.get("/particles/{pid}", response_model=Particle)
@limiter.limit("30/minute")
def get_particle(
    pid: int, 
    user: str = Depends(get_current_user),
    request: Request = None
):
    """
    Get a specific particle by ID.
    
    Args:
        pid (int): Particle ID
        user (str): Current authenticated user
        request (Request): FastAPI request for rate limiting
        
    Returns:
        Particle: Particle data
        
    Raises:
        HTTPException: If particle not found
    """
    try:
        db = get_db()
        # Use parameterized query to prevent SQL injection
        cur = db.execute("SELECT * FROM particles WHERE id=? AND user=?", (pid, user))
        row = cur.fetchone()
        
        if not row:
            logger.info(f"Particle not found: ID {pid} for user {user}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Particle not found"
            )
            
        # Process data
        data = dict(row)
        data["tags"] = row["tags"].split(",") if row["tags"] else []
        
        return Particle(**data)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error retrieving particle {pid}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving particle"
        )

@app.post("/particles", response_model=Particle)
@limiter.limit("15/minute")
def create_particle(
    p: Particle, 
    user: str = Depends(get_current_user),
    request: Request = None
):
    """
    Create a new particle/note.
    
    Args:
        p (Particle): The particle data
        user (str): Current authenticated username
        request (Request): FastAPI request for rate limiting
        
    Returns:
        Particle: The newly created particle with ID
    
    Raises:
        HTTPException: If there's a database error
    """
    try:
        db = get_db()
        
        # Handle missing tags/section gracefully
        tags = p.tags if p.tags is not None else []
        section = p.section if p.section else "Projects"
        
        # Ensure sanitization
        title = html.escape(p.title)
        content = html.escape(p.content)
        section = html.escape(section)
        
        # Filter and sanitize tags
        sanitized_tags = []
        for tag in tags:
            clean_tag = html.escape(tag.strip())
            if clean_tag and re.match(r'^[a-zA-Z0-9_\-]+$', clean_tag):
                sanitized_tags.append(clean_tag)
                
        # Insert with parameterized query
        cur = db.execute(
            "INSERT INTO particles (title, content, tags, section, user, created) VALUES (?, ?, ?, ?, ?, datetime('now'))",
            (title, content, ",".join(sanitized_tags), section, user)
        )
        db.commit()
        
        pid = cur.lastrowid
        logger.info(f"Created particle {pid} for user {user}")
        return get_particle(pid, user)
        
    except Exception as e:
        db.rollback() if 'db' in locals() else None
        logger.error(f"Error creating particle: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to create particle: {str(e)}"
        )

@app.put("/particles/{pid}", response_model=Particle)
@limiter.limit("15/minute")
def update_particle(
    pid: int, 
    p: Particle, 
    user: str = Depends(get_current_user),
    request: Request = None
):
    """
    Update an existing particle.
    
    Args:
        pid (int): Particle ID to update
        p (Particle): Updated particle data
        user (str): Current authenticated username
        request (Request): FastAPI request for rate limiting
        
    Returns:
        Particle: The updated particle
        
    Raises:
        HTTPException: If particle not found or update fails
    """
    try:
        # Verify particle exists and belongs to user
        db = get_db()
        cur = db.execute("SELECT id FROM particles WHERE id=? AND user=?", (pid, user))
        if not cur.fetchone():
            logger.warning(f"Update attempt for non-existent particle: {pid} by user {user}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Particle not found"
            )
        
        # Ensure sanitization
        title = html.escape(p.title)
        content = html.escape(p.content)
        section = html.escape(p.section)
        
        # Filter and sanitize tags
        sanitized_tags = []
        for tag in p.tags:
            clean_tag = html.escape(tag.strip())
            if clean_tag and re.match(r'^[a-zA-Z0-9_\-]+$', clean_tag):
                sanitized_tags.append(clean_tag)
        
        # Update with parameterized query
        db.execute(
            "UPDATE particles SET title=?, content=?, tags=?, section=? WHERE id=? AND user=?",
            (title, content, ",".join(sanitized_tags), section, pid, user)
        )
        db.commit()
        
        logger.info(f"Updated particle {pid} for user {user}")
        return get_particle(pid, user)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        db.rollback() if 'db' in locals() else None
        logger.error(f"Error updating particle {pid}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to update particle: {str(e)}"
        )

@app.delete("/particles/{pid}")
@limiter.limit("15/minute")
def delete_particle(
    pid: int, 
    user: str = Depends(get_current_user),
    request: Request = None
):
    """
    Delete a particle.
    
    Args:
        pid (int): Particle ID to delete
        user (str): Current authenticated username
        request (Request): FastAPI request for rate limiting
        
    Returns:
        dict: Success message
        
    Raises:
        HTTPException: If deletion fails
    """
    try:
        # Verify particle exists and belongs to user
        db = get_db()
        cur = db.execute("SELECT id FROM particles WHERE id=? AND user=?", (pid, user))
        if not cur.fetchone():
            logger.warning(f"Delete attempt for non-existent particle: {pid} by user {user}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Particle not found"
            )
        
        # Delete with parameterized query
        db.execute("DELETE FROM particles WHERE id=? AND user=?", (pid, user))
        db.commit()
        
        logger.info(f"Deleted particle {pid} for user {user}")
        return {"msg": "Particle deleted successfully"}
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        db.rollback() if 'db' in locals() else None
        logger.error(f"Error deleting particle {pid}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to delete particle: {str(e)}"
        )

# --- DB Init (run once) ---
@app.on_event("startup")
def init_db():
    db = get_db()
    db.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        email TEXT,
        needs_password_reset INTEGER DEFAULT 0,
        last_login TEXT,
        login_attempts INTEGER DEFAULT 0,
        locked_until TEXT
    )
    """)
    db.execute("""
    CREATE TABLE IF NOT EXISTS particles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        section TEXT,
        user TEXT,
        created TEXT,
        FOREIGN KEY(user) REFERENCES users(username)
    )
    """)
    db.commit()
