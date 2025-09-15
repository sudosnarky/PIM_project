# Design Decisions

This document tracks the major design decisions we made and why. Useful for future reference and for anyone joining the project.

## Technology Stack

### Backend: FastAPI + Python

**Options Considered:**
- Django (too heavy, lots of stuff we don't need)
- Flask (good, but FastAPI has better docs/typing)
- Node.js + Express (we're better at Python)
- FastAPI ✅

**Why FastAPI:**
- Automatic API documentation (Swagger UI)
- Built-in validation with Pydantic
- Type hints everywhere (catches bugs early)
- Good performance for Python
- Easy async support if needed later

### Database: SQLite

**Options Considered:**
- PostgreSQL (production-grade but complex setup)
- MySQL (Sarah's favorite but deployment issues)
- MongoDB (NoSQL seemed overkill)
- SQLite ✅

**Why SQLite:**
- Zero configuration
- Perfect for our scale (< 10k users realistic)
- Full-text search built-in
- Easy backups (just copy the file)
- Can migrate to PostgreSQL later if needed

*Team debate lasted 2 hours! Mike really wanted PostgreSQL but deployment complexity won.*

### Frontend: Vanilla JavaScript

**Options Considered:**
- React (industry standard, big learning curve)
- Vue.js (simpler than React)
- Angular (too complex for our timeline)
- Vanilla JS ✅

**Why Vanilla JS:**
- Focus learning on backend concepts
- No build tools required
- Better understanding of fundamentals
- Modern ES6+ is actually quite powerful
- One less thing to debug

*This was controversial! Almost went with React but glad we didn't.*

## Architecture Patterns

### Service Layer Pattern

**Decision:** Separate business logic from HTTP handling

```python
# routes.py - HTTP concerns only
@router.post("/particles")
async def create_particle(data: ParticleCreate):
    return particle_service.create_particle(data, user)

# services.py - business logic
def create_particle(self, data, username):
    # validation, processing, database calls
```

**Why:**
- Easier to test business logic
- Can reuse services for different interfaces
- Clear separation of concerns
- Learned this pattern in Software Engineering class

### Repository Pattern (Sort Of)

We have a `database.py` module that abstracts database operations. Not a full repository pattern but similar idea.

**Why:**
- Can swap SQLite for PostgreSQL later
- Centralized query logic
- Easier database testing with mocks

## Security Decisions

### Authentication: JWT Tokens

**Options Considered:**
- Session-based auth (traditional but stateful)
- OAuth (too complex for now)
- JWT tokens ✅

**Why JWT:**
- Stateless (good for APIs)
- Can include user info in token
- Industry standard for API auth
- Easy to validate without database hits

**Trade-offs:**
- Can't easily revoke tokens (we work around this)
- Larger than session IDs
- Need to handle expiration properly

### Password Security: bcrypt

**Why bcrypt over others:**
- Industry standard
- Built-in salt generation
- Adjustable work factor
- Python library available

No debate here - this was obvious choice.

### Input Validation: Two Layers

**Frontend:** Basic validation for user experience
**Backend:** Strict validation with Pydantic

**Why both:**
- Frontend for immediate feedback
- Backend for security (never trust the client)
- Pydantic makes backend validation easy

## Database Design Decisions

### User-Particle Relationship

**Decision:** Simple foreign key relationship

```sql
particles.user → users.username
```

**Why not user IDs?**
- Username is unique anyway
- Simpler queries (no joins needed often)
- More readable in logs and debugging
- Can add user ID later if needed

### Tags Storage: Comma-Separated

**Options:**
- Separate tags table with many-to-many
- JSON column
- Comma-separated string ✅

**Why comma-separated:**
- Simple to implement
- Good enough for our use case
- Easy to search with LIKE
- Can migrate to proper table later

*Engineering trade-off: simple now, can optimize later*

### PARA Sections: Enum

Stored as strings with validation:
- "Projects"
- "Areas" 
- "Resources"
- "Archives"

**Why not integers/IDs:**
- More readable in database
- Easier debugging
- Self-documenting
- Performance difference negligible

## User Interface Decisions

### Design System: Keep It Simple

**Decision:** No CSS framework, custom styles

**Why:**
- Learn CSS fundamentals
- Smaller bundle size
- Complete control over styling
- Modern CSS is powerful (Grid, Flexbox)

### Mobile-First: Yes

**Decision:** Responsive design from the start

**Why:**
- Everyone uses phones
- Easier to scale up than down
- CSS Grid makes this straightforward
- Good UX practice

### Color Scheme: Blue/White

**Decision:** Professional blue and white theme

**Why:**
- Blue is calming for productivity
- Good contrast for readability
- Professional appearance
- Easy to maintain consistency

## API Design Decisions

### RESTful Design

**Endpoints follow REST conventions:**
```
GET    /particles/        # List
POST   /particles/        # Create  
GET    /particles/{id}    # Get one
PUT    /particles/{id}    # Update
DELETE /particles/{id}    # Delete
```

**Why REST:**
- Industry standard
- Predictable for other developers
- Good HTTP method usage
- Easy to document

### JSON API

**Decision:** All communication in JSON

**Why:**
- Standard for web APIs
- Easy to parse in JavaScript
- Human readable
- Good tooling support

### Error Handling: HTTP Status Codes

**Decision:** Use proper HTTP status codes

```
200 OK - Success
201 Created - Resource created
400 Bad Request - Validation error
401 Unauthorized - Auth required
404 Not Found - Resource missing
500 Internal Server Error - Server error
```

**Why:**
- Standard HTTP semantics
- Client can handle errors appropriately
- Good API design practice
- Works with existing tools

## Testing Decisions

### Testing Strategy: Pyramid

```
         E2E Tests (few)
      Integration Tests  
    Unit Tests (most)
```

**Why:**
- Unit tests catch most bugs
- Integration tests verify components work together
- E2E tests ensure user workflows work
- Faster feedback with more unit tests

### Testing Tools

**Backend:** pytest (Python standard)
**Frontend:** Vitest (modern, fast)
**E2E:** Playwright (handles auth well)

**Why these:**
- Good ecosystem support
- Easy to learn
- Good documentation
- Active development

## Deployment Decisions

### Platform: Render.com

**Options:**
- Heroku (expensive after free tier ends)
- Vercel (frontend-focused)
- Railway (newer, uncertain)
- Render ✅

**Why Render:**
- Good free tier
- Easy Python deployment
- PostgreSQL available for upgrade
- Good performance

### Environment Management

**Decision:** Environment variables for config

```python
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///pim.db')
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-change-me')
```

**Why:**
- 12-factor app principles
- Different configs for dev/prod
- Secure secret management
- Industry best practice

## Code Organization Decisions

### File Structure: Feature-Based

**Decision:** Group by functionality, not by type

```
api/
├── models.py      # All data models
├── routes.py      # All HTTP routes
├── services.py    # All business logic
└── database.py    # All data access
```

**Why:**
- Easy to find related code
- Clear separation of concerns
- Scales well with team size
- Learned this in Software Architecture

### Import Style: Explicit

**Decision:** Explicit imports over star imports

```python
from models import UserCreate, ParticleCreate  # Good
from models import *                           # Avoid
```

**Why:**
- Clear dependencies
- Better IDE support
- Easier to track where things come from
- Python best practice

## Performance Decisions

### Pagination: Offset-Based

**Decision:** Use LIMIT/OFFSET for pagination

```sql
SELECT * FROM particles ORDER BY created DESC LIMIT 20 OFFSET 40;
```

**Why:**
- Simple to implement
- Good enough for our scale
- Standard SQL approach
- Can optimize later with cursor-based if needed

### Caching: None (Yet)

**Decision:** No caching layer initially

**Why:**
- Premature optimization is evil
- Adds complexity
- Database is fast enough
- Can add Redis later if needed

## Documentation Decisions

### API Docs: OpenAPI/Swagger

**Decision:** Use FastAPI's built-in Swagger UI

**Why:**
- Automatic from code
- Interactive documentation
- Standard format
- Easy for frontend team to use

### Code Comments: Minimal but Meaningful

**Decision:** Docstrings for public functions, comments for complex logic only

**Why:**
- Code should be self-documenting
- Comments get outdated
- Docstrings provide API documentation
- Focus on why, not what

## Future Decision Points

### Things We'll Need to Decide Later:

1. **Database Migration**: When to move to PostgreSQL?
2. **Caching Strategy**: Redis vs in-memory vs none?
3. **File Storage**: Local files vs S3 vs other?
4. **Real-time Features**: WebSockets vs polling vs SSE?
5. **Mobile App**: React Native vs Flutter vs PWA?
6. **Team Collaboration**: Multi-user features design?

---

*Decisions aren't permanent, but document the reasoning! 🤔*
