# Database Schema

## Overview

Our database uses SQLite with a simple, normalized structure. Two main tables handle users and their particles (notes).

## Entity Relationship Diagram

```
┌─────────────────────┐         ┌──────────────────────────────┐
│       Users         │         │         Particles            │
├─────────────────────┤         ├──────────────────────────────┤
│ username (PK) TEXT  │◄────────┤ id (PK) INTEGER             │
│ password_hash TEXT  │         │ title TEXT                  │
│ created TEXT        │         │ content TEXT                │
└─────────────────────┘         │ tags TEXT                   │
                                │ section TEXT                │
                                │ user (FK) TEXT              │
                                │ created TEXT                │
                                │ updated TEXT                │
                                └──────────────────────────────┘
```

**Relationship:** One User → Many Particles (1:N)

## Table Definitions

### Users Table

```sql
CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created TEXT NOT NULL
);
```

**Fields:**
- `username`: Unique identifier, 3-50 characters
- `password_hash`: bcrypt hashed password
- `created`: ISO timestamp of account creation

**Design Notes:**
- Username as PK instead of auto-increment ID (debated this!)
- Makes queries simpler (no joins needed often)
- More readable in logs and debugging

### Particles Table

```sql
CREATE TABLE particles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    section TEXT NOT NULL,
    user TEXT NOT NULL,
    created TEXT NOT NULL,
    updated TEXT NOT NULL,
    FOREIGN KEY (user) REFERENCES users(username)
);
```

**Fields:**
- `id`: Auto-increment primary key
- `title`: Particle title (required)
- `content`: Particle content (Markdown supported)
- `tags`: Comma-separated tags (nullable)
- `section`: PARA section (Projects/Areas/Resources/Archives)
- `user`: Foreign key to users.username
- `created`: ISO timestamp when created
- `updated`: ISO timestamp when last modified

**PARA Sections:**
- "Projects" - Things with deadlines
- "Areas" - Ongoing responsibilities  
- "Resources" - Future reference
- "Archives" - Inactive items

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_particles_user ON particles(user);
CREATE INDEX idx_particles_section ON particles(section);  
CREATE INDEX idx_particles_created ON particles(created DESC);
CREATE INDEX idx_particles_user_section ON particles(user, section);
```

**Why These Indexes:**
- `user`: Most queries filter by user
- `section`: Dashboard filters by PARA section
- `created`: Default sort order (newest first)
- `user_section`: Common combined filter

## Full-Text Search

```sql
-- FTS virtual table for search
CREATE VIRTUAL TABLE particles_fts USING fts5(
    title,
    content,
    content='particles',
    content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER particles_insert AFTER INSERT ON particles 
BEGIN
    INSERT INTO particles_fts(rowid, title, content) 
    VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER particles_delete AFTER DELETE ON particles 
BEGIN
    DELETE FROM particles_fts WHERE rowid = old.id;
END;

CREATE TRIGGER particles_update AFTER UPDATE ON particles 
BEGIN
    DELETE FROM particles_fts WHERE rowid = old.id;
    INSERT INTO particles_fts(rowid, title, content) 
    VALUES (new.id, new.title, new.content);
END;
```

**Search Usage:**
```sql
-- Search example
SELECT p.* FROM particles p
JOIN particles_fts fts ON p.id = fts.rowid
WHERE fts MATCH 'project management'
AND p.user = ?;
```

## Data Types & Constraints

### Text Encoding
- All text stored as UTF-8
- Supports emoji and international characters
- Markdown content preserved as plain text

### Date/Time Format
- ISO 8601 format: `2025-09-15T10:30:00Z`
- Stored as TEXT (SQLite best practice)
- Timezone aware (UTC)

### Validation Rules
- Username: 3-50 chars, alphanumeric + underscore
- Password: Min 8 chars (validated before hashing)
- Section: Must be one of PARA values
- Content: Max 100KB per particle (application level)

## Sample Data

```sql
-- Sample user
INSERT INTO users VALUES (
    'alex_student',
    '$2b$12$example_hash...',
    '2025-09-01T08:00:00Z'
);

-- Sample particles
INSERT INTO particles VALUES (
    1,
    'CS 302 Project Plan',
    '# Project Plan\n\n- [ ] Database design\n- [ ] API endpoints\n- [ ] Frontend UI',
    'school,project,cs302',
    'Projects',
    'alex_student',
    '2025-09-15T10:30:00Z',
    '2025-09-15T10:30:00Z'
);

INSERT INTO particles VALUES (
    2,
    'Learning Resources',
    'Great articles I found:\n- FastAPI tutorial\n- SQLite best practices',
    'learning,web-dev',
    'Resources',
    'alex_student',
    '2025-09-14T15:22:00Z',
    '2025-09-14T15:22:00Z'
);
```

## Migration Strategy

### Current: SQLite
- Single file database
- Good for development and small scale
- Full-text search built-in
- No separate server needed

### Future: PostgreSQL
If we need to scale:

```python
# Migration pseudocode
1. Export SQLite data to JSON
2. Create PostgreSQL tables
3. Import data with user mapping
4. Update connection strings
5. Test thoroughly
```

**When to Migrate:**
- > 1000 users
- Need better concurrency
- Team collaboration features
- Advanced search requirements

## Database Operations

### Common Queries

**Get user's particles by section:**
```sql
SELECT * FROM particles 
WHERE user = ? AND section = ?
ORDER BY created DESC;
```

**Search particles:**
```sql
SELECT p.* FROM particles p
JOIN particles_fts fts ON p.id = fts.rowid
WHERE fts MATCH ? AND p.user = ?
ORDER BY rank;
```

**Get statistics:**
```sql
SELECT section, COUNT(*) as count
FROM particles 
WHERE user = ?
GROUP BY section;
```

### Performance Notes

**Typical Query Times (on student laptops):**
- List particles: < 10ms
- Search particles: < 50ms  
- Create particle: < 5ms
- User stats: < 20ms

**Database Size:**
- ~1KB per particle average
- 1000 particles ≈ 1MB
- Indexes add ~20% overhead

## Backup & Recovery

### Backup Strategy
```bash
# Simple file copy
cp api/pim.db backups/pim_$(date +%Y%m%d_%H%M).db

# SQLite dump (more portable)
sqlite3 api/pim.db .dump > backups/pim_backup.sql
```

### Recovery
```bash
# From file backup
cp backups/pim_20250915_1430.db api/pim.db

# From SQL dump  
sqlite3 api/pim.db < backups/pim_backup.sql
```

## Development Notes

### Schema Changes
We track schema changes manually for now:

**v1.0:** Initial schema (users + particles)
**v1.1:** Added FTS search
**v1.2:** Added composite indexes

### Testing Database
- Use separate test database file
- Reset before each test run
- Seed with fixture data

```python
# test setup
@pytest.fixture
def test_db():
    db_path = "test_pim.db" 
    # create schema, seed data
    yield db_path
    os.remove(db_path)
```

## Team Decisions Log

**Week 2:** Decided on SQLite vs PostgreSQL - SQLite for simplicity
**Week 4:** Username as PK vs auto-increment ID - username won (controversial!)  
**Week 5:** Tags as JSON vs comma-separated - went simple
**Week 7:** Added FTS for search - game changer for UX
**Week 8:** Composite indexes for performance - noticeable improvement

---

*Simple schema, but gets the job done! 🗃️*