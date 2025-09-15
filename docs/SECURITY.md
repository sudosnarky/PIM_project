# Security Design

## Security Overview

Our app handles personal notes and tasks, so security is important. We follow standard web security practices while keeping things simple enough for a student project.

## Authentication & Authorization

### Password Security

**Hashing**: bcrypt with automatically generated salt
```python
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
```

**Password Requirements:**
- Minimum 8 characters
- Must contain mix of letters/numbers (validated client-side)
- No maximum length limit (bcrypt handles long passwords)
- No password expiration (it's 2025, we know better)

**Why bcrypt over alternatives:**
- Industry standard
- Built-in salt generation
- Adjustable work factor (currently 12 rounds)
- Resistant to timing attacks

### JWT Token Management

**Token Structure:**
```json
{
  "sub": "username",
  "exp": 1693737600,
  "iat": 1693651200,
  "type": "access_token"
}
```

**Token Lifecycle:**
1. **Issue**: After successful login
2. **Store**: Client localStorage (discussed alternatives below)
3. **Send**: Authorization header on each request
4. **Validate**: Server checks signature and expiration
5. **Revoke**: Logout adds token to blacklist

**Token Storage Decision:**

*Considered options:*
- **httpOnly cookies**: More secure but complex with CORS
- **localStorage**: Simple but accessible to XSS
- **sessionStorage**: Gone on tab close
- **In-memory**: Gone on page refresh

*Went with localStorage because:*
- Simpler for SPA architecture
- Good enough for our threat model
- Can upgrade to httpOnly cookies later

### Authorization Model

**Simple Role-Based**: One role (user), data isolation by ownership

```python
# Every particle operation checks ownership
def get_particle_by_id(particle_id: int, username: str):
    # SQL automatically filters by user
    particles = db.execute(
        "SELECT * FROM particles WHERE id = ? AND user = ?",
        (particle_id, username)
    )
```

**Access Control Rules:**
- Users can only see/edit their own particles
- No admin interface yet (future feature)
- No sharing between users (future feature)

## Input Validation & Sanitization

### Backend Validation (Pydantic)

```python
class ParticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=100000)  # 100KB limit
    section: str = Field(..., regex=r'^(Projects|Areas|Resources|Archives)$')
    tags: Optional[List[str]] = Field(default_factory=list)
    
    @validator('tags')
    def validate_tags(cls, v):
        if len(v) > 20:
            raise ValueError('Maximum 20 tags allowed')
        for tag in v:
            if len(tag) > 50:
                raise ValueError('Tag too long (max 50 characters)')
        return v
```

**Why Pydantic:**
- Automatic validation from type hints
- Clear error messages
- JSON serialization built-in
- FastAPI integration

### Frontend Validation (Defense in Depth)

```javascript
// security.js
class SecurityUtils {
  static escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  static validateUsername(username) {
    if (!username || username.length < 3 || username.length > 50) {
      alert('Username must be 3-50 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      alert('Username can only contain letters, numbers, and underscore');
      return false;
    }
    return true;
  }
}
```

**Client-side validation is for UX, not security!**
- Immediate feedback for users
- Reduces server load
- All validation repeated server-side

## Database Security

### SQL Injection Prevention

**Always use parameterized queries:**
```python
# GOOD - parameterized
cursor.execute(
    "SELECT * FROM particles WHERE user = ? AND title LIKE ?",
    (username, f"%{search_term}%")
)

# BAD - string formatting (we don't do this!)
# query = f"SELECT * FROM particles WHERE user = '{username}'"
```

**Why this works:**
- Parameters are escaped automatically
- Query structure is separated from data
- Works with all our database operations

### Database Access Controls

**Connection Security:**
- Database file permissions (600 - owner read/write only)
- No remote database connections yet (SQLite)
- Application-level access control (user ownership)

**Schema Security:**
- Foreign key constraints enforced
- NOT NULL constraints on required fields
- Check constraints on PARA sections

## Cross-Site Scripting (XSS) Protection

### Content Security Policy

```python
# In main.py
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # CSP header
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "  # Inline scripts for now
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self'"
    )
    
    return response
```

**Note**: `unsafe-inline` is temporary - should move to nonce-based CSP later.

### Output Encoding

**Markdown Processing**: 
```javascript
// markdown.js - all content is HTML escaped first
static toHtml(md) {
    // 1. Escape HTML to prevent XSS
    let html = SecurityUtils.escapeHtml(md);
    
    // 2. Apply markdown formatting
    html = this.processHeadings(html);
    // ... more processing
    
    return html;
}
```

**DOM Manipulation**:
```javascript
// Use textContent, not innerHTML for user data
element.textContent = userInput;  // Safe
// element.innerHTML = userInput;  // Dangerous
```

## Cross-Site Request Forgery (CSRF) Protection

**Current Protection**: SameSite cookies + CORS

```python
from fastapi.middleware.cors import CORSMiddleware

# Restrictive CORS in production
if settings.environment == "production":
    allowed_origins = ["https://pim-project-qgyu.onrender.com"]
else:
    allowed_origins = ["*"]  # Development only

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

**Why this works for us:**
- Same origin policy prevents cross-site requests
- JWT tokens in headers (not cookies) require explicit sending
- CORS restricts which domains can make requests

**Future improvement**: Add CSRF tokens for form submissions

## HTTPS & Transport Security

### SSL/TLS Configuration

**Production**: Automatic HTTPS via Render.com
- TLS 1.2+ enforced
- HTTP redirects to HTTPS
- SSL certificate auto-renewal

**Development**: HTTP only (localhost)
- Planning to add local HTTPS for testing

### Security Headers

```python
# Security headers middleware
response.headers.update({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY", 
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
})
```

**What these do:**
- Prevent MIME type sniffing attacks
- Block iframe embedding (clickjacking)
- Enable XSS filtering in older browsers
- Control referrer information leakage
- Restrict dangerous browser APIs

## Data Protection & Privacy

### Data Minimization

**What we collect:**
- Username (required for login)
- Password hash (never plaintext)
- Particle content (user's notes)
- Timestamps (created/updated)

**What we DON'T collect:**
- Email addresses (not required)
- Real names
- IP addresses (not logged)
- Browser fingerprinting
- Analytics/tracking

### Data Retention

**User Data**: Kept until user deletes account
**Logs**: Application logs rotated daily, kept 7 days
**Backups**: No automatic backups yet (SQLite file only)

**Future**: Add data export and account deletion features

## Session Management

### Token Expiration

**Current Settings:**
- Token lifetime: 24 hours
- No refresh tokens yet
- Manual token revocation on logout

**Token Revocation Strategy:**
```python
# Simple in-memory blacklist
revoked_tokens = set()

def revoke_token(token: str):
    revoked_tokens.add(token)

def is_token_revoked(token: str) -> bool:
    return token in revoked_tokens
```

**Limitations**:
- Revoked tokens list grows over time
- Lost on server restart
- Not shared across multiple servers

**Future**: Redis-based token blacklist

### Session Security

**Logout Process:**
1. Add token to revocation list
2. Clear client localStorage
3. Redirect to login page

**Session Timeout:**
- Client checks token expiration before requests
- Automatic logout on expired token
- User warned before expiration (future feature)

## Error Handling Security

### Information Disclosure Prevention

**Error Responses**:
```python
# Don't expose internal details
try:
    result = some_database_operation()
except DatabaseError as e:
    logger.error(f"Database error: {e}")  # Log details
    raise HTTPException(
        status_code=500, 
        detail="Internal server error"  # Generic user message
    )
```

**What we reveal vs hide:**
- ✅ **Show**: Validation errors, user permission errors
- ❌ **Hide**: Database errors, file system errors, internal exceptions

### Logging Security

**What we log:**
```python
# Safe logging
logger.info(f"User {username} created particle {particle_id}")
logger.warning(f"Failed login attempt for user: {username}")
logger.error(f"Database connection failed: {type(e).__name__}")
```

**What we DON'T log:**
- Passwords (even hashed ones in logs)
- Full JWT tokens
- Sensitive particle content
- Personal information

## Security Testing

### Manual Security Testing

**Regular tests we do:**
- SQL injection attempts
- XSS payload testing  
- Authentication bypass attempts
- Authorization boundary testing
- Input validation boundary testing

**Tools we use:**
- Browser dev tools
- curl for API testing
- Manual code review
- OWASP ZAP (occasionally)

### Automated Security Testing

**Future plans:**
- Security testing in CI pipeline
- Dependency vulnerability scanning
- Static code analysis
- Automated penetration testing

## Threat Model

### Assets
- User credentials (usernames, password hashes)
- User particle data (notes, tasks)
- Application availability

### Threats
1. **Data breach** - Attacker gets user data
2. **Account takeover** - Attacker gains user access
3. **Data tampering** - Attacker modifies user data
4. **Denial of service** - App becomes unavailable

### Mitigations
1. **Data breach**: Encryption, access controls, secure coding
2. **Account takeover**: Strong auth, secure sessions, rate limiting
3. **Data tampering**: Input validation, authorization checks
4. **DoS**: Rate limiting (future), resource limits

## Security Team Decisions

### Decisions Made

**Week 4**: JWT vs sessions - went JWT for API simplicity
**Week 6**: localStorage vs cookies - chose localStorage for now  
**Week 8**: CSP implementation - added basic policy
**Week 10**: Error message sanitization - hide internal details

### Future Security Enhancements

**Short term (next version):**
- Rate limiting for login attempts
- CSRF tokens for forms
- Nonce-based CSP
- Password strength meter

**Long term:**
- Two-factor authentication
- Password breach checking  
- Account lockout policies
- Security audit logging
- Data encryption at rest

## Security Compliance

### Current Compliance

**OWASP Top 10 (2021):**
- ✅ A01 (Broken Access Control): User isolation enforced
- ✅ A02 (Cryptographic Failures): bcrypt for passwords
- ✅ A03 (Injection): Parameterized queries
- ✅ A05 (Security Misconfiguration): Security headers
- ⚠️ A06 (Vulnerable Components): Manual dependency updates
- ✅ A07 (ID&Auth Failures): Strong authentication
- ✅ A08 (Software Integrity): Simple architecture
- ⚠️ A09 (Logging Failures): Basic logging only
- ✅ A10 (SSRF): No external requests from user input

### Privacy Compliance

**GDPR Considerations** (if we had EU users):
- Data minimization: Only collect what we need
- Purpose limitation: Data used only for app functionality
- Right to access: Users can view their data
- Right to deletion: Need to implement account deletion
- Data portability: Need export feature

---

*Security is a journey, not a destination! 🔒*