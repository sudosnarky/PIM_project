# System Architecture

## Overview

Our PIM system follows a classic 3-tier web architecture. We kept it simple but scalable - no over-engineering here!

```
┌─────────────────┐    HTTP/JSON    ┌──────────────────┐    SQL    ┌─────────────────┐
│   Frontend      │◄──────────────►│    Backend       │◄─────────►│   Database      │
│   (Browser)     │                 │   (FastAPI)      │           │   (SQLite)      │
│                 │                 │                  │           │                 │
│ • HTML/CSS/JS   │                 │ • REST API       │           │ • Users table   │
│ • Auth UI       │                 │ • JWT tokens     │           │ • Particles     │
│ • Dashboard     │                 │ • Business logic │           │ • Indexes       │
│ • CRUD forms    │                 │ • Validation     │           │ • FTS search    │
└─────────────────┘                 └──────────────────┘           └─────────────────┘
```

## Architecture Decisions

### Why FastAPI?
- **Fast to learn**: Coming from Flask, FastAPI was easy to pick up
- **Auto docs**: Swagger UI comes for free
- **Type hints**: Helps catch bugs early
- **Performance**: Actually pretty fast for a Python framework

### Why SQLite?
- **No setup**: Just a file, no server to manage
- **Good enough**: Handles our load fine
- **Portable**: Easy to backup and move around
- **SQLite is actually quite capable**: Full-text search, transactions, etc.

*Note: We initially wanted PostgreSQL but deployment was getting complicated. SQLite turned out to be perfect for our scale.*

### Why Vanilla JavaScript?
This was debated a lot! Initial thoughts were:
- **Sarah**: "Let's use React, everyone uses it"
- **Mike**: "Vue is simpler to learn"  
- **Alex**: "What about just vanilla JS?"

We went with vanilla because:
- Focus on backend learning
- No build tools needed
- Better understanding of fundamentals
- Actually quite powerful with modern ES6+

## Component Architecture

### Backend Structure

```
api/
├── main.py           # FastAPI app setup, CORS, static files
├── routes.py         # HTTP endpoint definitions  
├── services.py       # Business logic layer
├── database.py       # Data access layer
├── models.py         # Pydantic data models
├── auth.py           # Authentication & security
└── config.py         # Configuration management
```

**Layer Separation:**
- **Routes**: Handle HTTP stuff (parsing, responses, status codes)
- **Services**: Business logic (validation, processing, rules)
- **Database**: Data persistence (queries, transactions)

### Frontend Structure

```
static/js/
├── app-modular.js        # Main application controller
├── module-loader.js      # Dynamic module loading
└── modules/
    ├── auth.js           # Authentication management
    ├── auth-controller.js # Login/register UI
    ├── dashboard.js      # Main dashboard logic
    ├── api.js            # HTTP client
    ├── security.js       # Input validation
    └── markdown.js       # Content processing
```

**Module Pattern**: Each module handles one concern. Keeps code organized without a framework.

## Data Flow

### User Registration Flow
```
1. User fills form → 2. Validation → 3. Password hashing → 4. Database insert → 5. Success response
```

### Authentication Flow  
```
1. Login request → 2. Verify password → 3. Generate JWT → 4. Store in localStorage → 5. Redirect
```

### Particle (Note) Creation
```
1. Create form → 2. Markdown processing → 3. Validation → 4. Save to DB → 5. Update UI
```

## Security Architecture

### Authentication
- **JWT tokens**: Stateless, good for APIs
- **bcrypt hashing**: Industry standard for passwords
- **Token expiration**: Configurable timeout
- **Logout**: Token revocation (stored in memory for now)

### Input Validation
- **Frontend**: Basic validation, XSS prevention
- **Backend**: Pydantic models for strict validation
- **Database**: Parameterized queries prevent SQL injection

### CORS Configuration
```python
# Development: Allow localhost
# Production: Specific domain only
```

## Database Design

```sql
Users                     Particles
┌─────────────────┐       ┌──────────────────────┐
│ username (PK)   │◄──────┤ id (PK)             │
│ password_hash   │       │ title               │
│ created         │       │ content             │
└─────────────────┘       │ tags                │
                          │ section (PARA)      │
                          │ user (FK)           │
                          │ created             │
                          │ updated             │
                          └──────────────────────┘
```

**Design Notes:**
- Simple foreign key relationship
- No complex joins needed
- Full-text search on title/content
- Tags stored as comma-separated (good enough for now)

## Deployment Architecture

```
Internet → Render.com → FastAPI App → SQLite File
```

**Production Setup:**
- **Web Service**: Single FastAPI process
- **Static Files**: Served by FastAPI
- **Database**: SQLite file on persistent disk
- **Environment**: Python 3.12 container

## Performance Considerations

### What We Optimized:
- Database indexes on user and section columns
- Pagination for large result sets
- Connection pooling (SQLite handles this)
- Static file caching headers

### What We Didn't (Yet):
- Redis for session storage
- Database connection pooling
- CDN for static assets
- Horizontal scaling

*For our scale (< 1000 users), current setup handles load fine.*

## Monitoring & Logging

**Current Logging:**
- Application logs to `api.log`
- Error tracking with Python logging
- Database query logging in debug mode

**Health Checks:**
- Basic `/health` endpoint
- Database connectivity check
- File system write test

## Future Architecture Ideas

### Short Term:
- PostgreSQL migration path
- Redis for sessions
- Docker containers

### Long Term:
- Microservices (if we get big)
- Real-time features with WebSockets
- CDN integration
- Mobile API endpoints

## Team Architecture Decisions Log

**Week 1**: Decided on FastAPI vs Django - FastAPI won for learning experience
**Week 3**: SQLite vs PostgreSQL debate - went SQLite for simplicity
**Week 4**: Frontend framework discussion - vanilla JS chosen
**Week 6**: Authentication strategy - JWT over sessions
**Week 8**: Deployment platform - Render over Heroku (better free tier)

---

*Architecture evolves with requirements. This worked for us! 🏗️*
