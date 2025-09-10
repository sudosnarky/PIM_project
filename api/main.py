
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import List, Optional
import sqlite3
import hashlib
import secrets




app = FastAPI()
"""
Main FastAPI app instance.
"""

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "https://pim-project.onrender.com", "http://localhost:8000"],  # Add your render.com domain
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*", "Authorization", "Content-Type"],
    expose_headers=["*"]
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


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# --- Models ---

class User(BaseModel):
    """
    User model for registration and login.
    """
    username: str
    password: str


class Particle(BaseModel):
    """
    Particle model. Represents a note, task, or resource.
    """
    id: Optional[int] = None
    title: str
    content: str
    tags: List[str] = []
    section: str
    created: Optional[str] = None
    user: Optional[str] = None

# --- Auth ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# In-memory token store (for demo)
tokens = {}

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    cur = db.execute("SELECT * FROM users WHERE username=?", (form_data.username,))
    user = cur.fetchone()
    if not user or user["password"] != hash_password(form_data.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = secrets.token_hex(16)
    tokens[token] = form_data.username
    return {"access_token": token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme)):
    username = tokens.get(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    return username

# --- User Registration (for demo) ---
@app.post("/register")
def register(user: User):
    db = get_db()
    try:
        db.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user.username, hash_password(user.password)))
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    return {"msg": "User registered"}

# --- Particle CRUD ---
@app.get("/particles", response_model=List[Particle])
def list_particles(section: Optional[str] = None, q: Optional[str] = None, user: str = Depends(get_current_user)):
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
    Create a new particle/note.
    
    Args:
        p (Particle): The particle data
        user (str): Current authenticated username
        
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
        
        cur = db.execute(
            "INSERT INTO particles (title, content, tags, section, user, created) VALUES (?, ?, ?, ?, ?, datetime('now'))",
            (p.title, p.content, ",".join(tags), section, user)
        )
        db.commit()
        pid = cur.lastrowid
        return get_particle(pid, user)
    except Exception as e:
        db.rollback() if 'db' in locals() else None
        raise HTTPException(status_code=500, detail=f"Failed to create particle: {str(e)}")

@app.put("/particles/{pid}", response_model=Particle)
def update_particle(pid: int, p: Particle, user: str = Depends(get_current_user)):
    db = get_db()
    db.execute(
        "UPDATE particles SET title=?, content=?, tags=?, section=? WHERE id=? AND user=?",
        (p.title, p.content, ",".join(p.tags), p.section, pid, user)
    )
    db.commit()
    return get_particle(pid, user)

@app.delete("/particles/{pid}")
def delete_particle(pid: int, user: str = Depends(get_current_user)):
    db = get_db()
    db.execute("DELETE FROM particles WHERE id=? AND user=?", (pid, user))
    db.commit()
    return {"msg": "Deleted"}

# --- DB Init (run once) ---
@app.on_event("startup")
def init_db():
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
