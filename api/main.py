
# PARA InfoSystem API (FastAPI + SQLite + bcrypt)
"""
A secure note-taking application implementing the PARA method (Projects, Areas, Resources, Archives).
Features user authentication with bcrypt password hashing, SQLite database storage,
and a RESTful API for managing personal knowledge particles.
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import List, Optional
import sqlite3, secrets

app = FastAPI(
    title="PARA InfoSystem API",
    description="Personal knowledge management system using the PARA method",
    version="1.0.0"
)

# CORS for frontend
"""
Cross-Origin Resource Sharing (CORS) configuration allows the frontend JavaScript
to make API requests from different origins (localhost during development, 
render.com in production). Essential for web applications with separate frontend/backend.
"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "https://pim-project.onrender.com", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*", "Authorization", "Content-Type"],
    expose_headers=["*"]
)

# Redirect root to login page
@app.get("/", include_in_schema=False)
async def root():
    """
    Root endpoint that redirects users to the login page.
    include_in_schema=False hides this endpoint from auto-generated API docs.
    """
    return RedirectResponse(url="/static/html/index.html")

# Serve static files
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# Database connection
def get_db():
    """
    Creates and returns a SQLite database connection.
    
    Returns:
        sqlite3.Connection: Database connection with Row factory for dict-like access.
        
    Note:
        Uses sqlite3.Row factory to access columns by name instead of index,
        making the code more readable and maintainable.
    """
    conn = sqlite3.connect("pim.db")
    conn.row_factory = sqlite3.Row
    return conn

# Password hashing
"""
Secure password hashing using bcrypt algorithm.
bcrypt is cryptographically secure, slow by design to prevent brute force attacks,
and includes built-in salt generation for each password.
"""
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        str: Bcrypt-hashed password with salt
    """
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a plain text password against a hashed password.
    
    Args:
        plain: Plain text password from user input
        hashed: Stored bcrypt hash from database
        
    Returns:
        bool: True if password matches, False otherwise
    """
    return pwd_context.verify(plain, hashed)

# Models
class User(BaseModel):
    """
    Pydantic model for user registration and authentication.
    
    Attributes:
        username: Unique identifier for the user
        password: Plain text password (automatically validated and hashed before storage)
    """
    username: str
    password: str

class Particle(BaseModel):
    """
    Pydantic model representing a knowledge particle (note/task/resource).
    
    Attributes:
        id: Auto-generated unique identifier (None for new particles)
        title: Human-readable title for the particle
        content: Main content in markdown format
        tags: List of tags for categorization and search
        section: PARA method section (Projects/Areas/Resources/Archives)
        created: ISO timestamp when particle was created (auto-generated)
        user: Username of the particle owner (auto-assigned)
    """
    id: Optional[int] = None
    title: str
    content: str
    tags: List[str] = []
    section: str
    created: Optional[str] = None
    user: Optional[str] = None

# Auth
"""
Authentication system using OAuth2 with Bearer tokens.
Simple in-memory token storage suitable for development/demo.
In production, consider Redis or database storage for scalability.
"""
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")
tokens = {}  # In-memory token store: {token: username}

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate user and return access token.
    
    Args:
        form_data: OAuth2 form data containing username/password
        
    Returns:
        dict: Access token and token type for Authorization header
        
    Raises:
        HTTPException: 400 if credentials are invalid
        
    Note:
        Expects form data (not JSON) as per OAuth2 specification.
        Frontend should send FormData, not JSON for this endpoint.
    """
    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE username=?", (form_data.username,))
    user = cur.fetchone()
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = secrets.token_hex(16)  # Generate random hex token
    tokens[token] = form_data.username
    return {"access_token": token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency to extract and validate the current user from JWT token.
    
    Args:
        token: Bearer token from Authorization header
        
    Returns:
        str: Username of the authenticated user
        
    Raises:
        HTTPException: 401 if token is invalid or expired
        
    Note:
        Used as a dependency in protected endpoints via Depends().
        FastAPI automatically extracts token from "Authorization: Bearer <token>" header.
    """
    username = tokens.get(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    return username

@app.post("/register")
def register(user: User):
    """
    Register a new user account.
    
    Args:
        user: User model containing username and password
        
    Returns:
        dict: Success message
        
    Raises:
        HTTPException: 400 if username already exists
        
    Note:
        Password is automatically hashed using bcrypt before database storage.
        Username uniqueness is enforced by database PRIMARY KEY constraint.
    """
    db = get_db()
    try:
        db.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user.username, hash_password(user.password)))
        db.commit()
        return {"msg": "User registered"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")

# Particle CRUD
@app.get("/particles", response_model=List[Particle])
def list_particles(section: Optional[str] = None, q: Optional[str] = None, user: str = Depends(get_current_user)):
    """
    Retrieve particles for the authenticated user with optional filtering.
    
    Args:
        section: Filter by PARA section (Projects/Areas/Resources/Archives)
        q: Search query to match against title and content
        user: Current authenticated user (injected by dependency)
        
    Returns:
        List[Particle]: List of particles matching the criteria
        
    Note:
        - Only returns particles owned by the authenticated user
        - Supports full-text search across title and content
        - Tags are stored as comma-separated strings, converted to lists in response
    """
    db = get_db()
    sql = "SELECT * FROM particles WHERE user=?"
    params = [user]
    if section:
        sql += " AND section=?"
        params.append(section)
    if q:
        sql += " AND (title LIKE ? OR content LIKE ?)"
        params.extend([f"%{q}%", f"%{q}%"])
    cur = db.execute(sql, params)
    rows = cur.fetchall()
    result = []
    for row in rows:
        data = dict(row)
        data["tags"] = row["tags"].split(",") if row["tags"] else []
        result.append(Particle(**data))
    return result

@app.get("/particles/{pid}", response_model=Particle)
def get_particle(pid: int, user: str = Depends(get_current_user)):
    """
    Retrieve a specific particle by ID for the authenticated user.
    
    Args:
        pid: Particle ID to retrieve
        user: Current authenticated user (injected by dependency)
        
    Returns:
        Particle: The requested particle
        
    Raises:
        HTTPException: 404 if particle doesn't exist or doesn't belong to user
        
    Note:
        User isolation is enforced - users can only access their own particles.
    """
    db = get_db()
    cur = db.execute("SELECT * FROM particles WHERE id=? AND user=?", (pid, user))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    data = dict(row)
    data["tags"] = row["tags"].split(",") if row["tags"] else []
    return Particle(**data)

@app.post("/particles", response_model=Particle)
def create_particle(p: Particle, user: str = Depends(get_current_user)):
    """
    Create a new particle for the authenticated user.
    
    Args:
        p: Particle data (id, created, user fields are ignored)
        user: Current authenticated user (injected by dependency)
        
    Returns:
        Particle: The newly created particle with generated ID and timestamp
        
    Note:
        - Auto-generates ID and creation timestamp
        - Defaults to "Projects" section if not specified
        - Tags list is converted to comma-separated string for storage
        - Returns the complete particle by fetching it from database
    """
    db = get_db()
    tags = p.tags if p.tags is not None else []
    section = p.section if p.section else "Projects"
    cur = db.execute(
        "INSERT INTO particles (title, content, tags, section, user, created) VALUES (?, ?, ?, ?, ?, datetime('now'))",
        (p.title, p.content, ",".join(tags), section, user)
    )
    db.commit()
    pid = cur.lastrowid
    return get_particle(pid, user)

@app.put("/particles/{pid}", response_model=Particle)
def update_particle(pid: int, p: Particle, user: str = Depends(get_current_user)):
    """
    Update an existing particle for the authenticated user.
    
    Args:
        pid: ID of the particle to update
        p: Updated particle data
        user: Current authenticated user (injected by dependency)
        
    Returns:
        Particle: The updated particle
        
    Note:
        - User isolation enforced via WHERE clause
        - Tags list converted to comma-separated string for storage
        - Returns updated particle by fetching from database
        - No error if particle doesn't exist (SQL UPDATE affects 0 rows)
    """
    db = get_db()
    db.execute(
        "UPDATE particles SET title=?, content=?, tags=?, section=? WHERE id=? AND user=?",
        (p.title, p.content, ",".join(p.tags), p.section, pid, user)
    )
    db.commit()
    return get_particle(pid, user)

@app.delete("/particles/{pid}")
def delete_particle(pid: int, user: str = Depends(get_current_user)):
    """
    Delete a particle for the authenticated user.
    
    Args:
        pid: ID of the particle to delete
        user: Current authenticated user (injected by dependency)
        
    Returns:
        dict: Success message
        
    Note:
        - User isolation enforced via WHERE clause
        - No error if particle doesn't exist (SQL DELETE affects 0 rows)
        - Permanent deletion - no soft delete or archive functionality
    """
    db = get_db()
    db.execute("DELETE FROM particles WHERE id=? AND user=?", (pid, user))
    db.commit()
    return {"msg": "Deleted"}

# DB Init
@app.on_event("startup")
def init_db():
    """
    Initialize SQLite database schema on application startup.
    
    Creates two tables if they don't exist:
    1. users: Stores user credentials with bcrypt-hashed passwords
    2. particles: Stores knowledge particles with foreign key to users
    
    Note:
        - Uses CREATE TABLE IF NOT EXISTS for idempotency
        - Foreign key constraint ensures data integrity
        - Runs once when FastAPI application starts
    """
    db = get_db()
    db.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL
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

