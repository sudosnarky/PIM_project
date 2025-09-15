# Deployment Guide

## Overview

We deploy to Render.com because it's free, easy, and handles our Python app well. Initially tried Heroku but the free tier disappeared, then tried Railway but Render had better documentation.

## Current Deployment

**Production URL**: https://pim-project-qgyu.onrender.com

**Platform**: Render.com Web Service
**Runtime**: Python 3.12
**Database**: SQLite (file-based)
**Static Files**: Served by FastAPI

## Deployment Architecture

```
Internet → Render Load Balancer → FastAPI App → SQLite File
                                      ↓
                                 Static Files (JS/CSS/HTML)
```

## Environment Setup

### Environment Variables

**Required:**
```bash
# Security
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=another-secret-for-jwt-tokens

# Database
DATABASE_URL=sqlite:///pim.db  # Uses local file

# Application
ENVIRONMENT=production
DEBUG=false
```

**Optional:**
```bash
# Logging
LOG_LEVEL=INFO

# Security
ALLOWED_ORIGINS=https://yourdomain.com

# Performance  
MAX_WORKERS=1  # Render free tier limitation
```

### Production Configuration

**File: `api/config.py`**
```python
import os
from typing import List

class Settings:
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///pim.db")
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-change-me")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "jwt-secret-change-me")
    
    # CORS
    allowed_origins: List[str] = [
        "https://pim-project-qgyu.onrender.com",  # Production
        "http://localhost:8000",                   # Development
    ]
    
    # App
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"

settings = Settings()
```

## Render.com Setup

### 1. Create Web Service

1. Connect GitHub repo to Render
2. Choose "Web Service"  
3. Configure build and start commands

### 2. Build Configuration

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
python main.py
```

### 3. Service Configuration

```yaml
# render.yaml (optional - for infrastructure as code)
services:
  - type: web
    name: pim-project
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python main.py
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: JWT_SECRET_KEY  
        generateValue: true
      - key: ENVIRONMENT
        value: production
      - key: DEBUG
        value: false
```

### 4. Environment Variables Setup

In Render dashboard:
1. Go to Environment tab
2. Add required environment variables
3. Generate secure random values for secrets

**Generate Secret Keys:**
```python
import secrets
print("SECRET_KEY:", secrets.token_urlsafe(32))
print("JWT_SECRET_KEY:", secrets.token_urlsafe(32))
```

## Database Deployment

### SQLite on Render

**Pros:**
- Simple setup (no external database needed)
- No additional costs
- Good performance for our scale

**Cons:**
- File storage not persistent across deployments
- Single-writer limitation
- No built-in backups

### Database Persistence

**Problem**: Render's filesystem is ephemeral - files get deleted on redeploy.

**Solution**: Use Render's persistent disk (paid feature) or external database.

**Current Workaround:**
```python
# In main.py - Initialize DB on startup
@app.on_event("startup")
async def startup_event():
    db_manager.initialize_schema()
    
    # Create default admin user if database is empty
    try:
        admin_exists = user_service.get_user_by_username("admin")
        if not admin_exists:
            admin_user = UserCreate(username="admin", password="change-me-123")
            user_service.create_user(admin_user)
            logger.info("Created default admin user")
    except Exception as e:
        logger.warning(f"Could not create admin user: {e}")
```

### Future: PostgreSQL Migration

When ready to scale:

1. **Add PostgreSQL service on Render**
2. **Update connection string**
   ```python
   # From SQLite
   DATABASE_URL=sqlite:///pim.db
   
   # To PostgreSQL  
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```
3. **Migrate data**
4. **Update database.py for PostgreSQL**

## Static Files Handling

### Current Setup: FastAPI Static Files

```python
# main.py
from fastapi.staticfiles import StaticFiles

app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve main app
@app.get("/")
async def serve_index():
    return FileResponse("static/index.html")
```

**Why not CDN yet:**
- Simple setup for now
- Good performance for our scale  
- One less service to configure
- Can add CDN later if needed

### Future: CDN Setup

For better global performance:

1. **Upload static files to AWS S3 or similar**
2. **Configure CloudFront or similar CDN**
3. **Update HTML to use CDN URLs**
4. **Keep API on Render, static files on CDN**

## Deployment Process

### Manual Deployment

1. **Push to GitHub main branch**
2. **Render auto-deploys** (connected to GitHub)
3. **Check deploy logs** in Render dashboard
4. **Verify deployment** at production URL
5. **Check application logs** for errors

### Deployment Checklist

**Before Deploy:**
- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Database schema is compatible
- [ ] No hardcoded localhost URLs
- [ ] Error handling for production

**After Deploy:**
- [ ] Check application starts successfully
- [ ] Test user registration/login
- [ ] Test basic CRUD operations
- [ ] Check performance (< 2s page load)
- [ ] Verify error handling works

### Rollback Process

If deployment fails:

1. **Render**: Use "Rollback to Previous Deploy" button
2. **Database**: Restore from backup (if available)
3. **Fix issues** in development
4. **Re-deploy** when ready

## Monitoring & Logging

### Application Logging

```python
# Structured logging for production
import logging
import sys

if settings.environment == "production":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)  # Render captures stdout
        ]
    )
```

### Health Checks

```python
# health.py
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        db_manager.execute_query("SELECT 1")
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service unhealthy: {str(e)}"
        )
```

### Monitoring Setup

**Basic Monitoring** (included):
- Render provides basic metrics (CPU, memory, response time)
- Application logs in Render dashboard
- Uptime monitoring

**Advanced Monitoring** (future):
- Error tracking with Sentry
- Application Performance Monitoring (APM)
- Custom metrics dashboard
- Alerting for downtime/errors

## Security Considerations

### HTTPS

- ✅ **Automatically enabled** by Render
- ✅ **SSL certificates** managed by Render
- ✅ **Secure headers** configured in FastAPI

### Environment Secrets

- ✅ **Environment variables** for secrets (not in code)
- ✅ **Generated random keys** for production
- ✅ **Separate configs** for dev/prod

### CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

# Production CORS - restrictive
if settings.environment == "production":
    allowed_origins = [
        "https://pim-project-qgyu.onrender.com"
    ]
else:
    # Development CORS - permissive  
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## Performance Optimization

### Current Optimizations

- ✅ **Database indexes** on frequently queried columns
- ✅ **Static file caching** headers
- ✅ **Gzip compression** enabled
- ✅ **Connection pooling** (SQLite handles this)

### Future Optimizations

- [ ] **Redis caching** for session storage
- [ ] **Database connection pooling** (when using PostgreSQL)
- [ ] **CDN** for static assets
- [ ] **Image optimization** if we add file uploads
- [ ] **API response caching** for read-heavy endpoints

## Backup Strategy

### Current: Manual Backups

**Database backup** (when using persistent disk):
```bash
# Download SQLite file from Render
# Store in secure location
# Restore by uploading file
```

### Future: Automated Backups

**PostgreSQL backups:**
```bash
# Daily automated backups with Render PostgreSQL
# Point-in-time recovery available
# Cross-region backup replication
```

**Application data export:**
```python
# Export user data to JSON
@app.post("/admin/export")
async def export_data():
    # Export all particles for all users
    # Return as downloadable JSON file
```

## Cost Analysis

### Current Costs (Free Tier)

- **Render Web Service**: $0/month (free tier)
- **Database**: $0 (SQLite file)
- **Domain**: $0 (using render subdomain)
- **SSL Certificate**: $0 (included)

**Total: $0/month**

### Scaling Costs

**When we outgrow free tier:**

- **Render Starter**: $7/month
- **PostgreSQL**: $7/month  
- **Custom domain**: $12/year
- **CDN**: $1-5/month

**Total: ~$15-20/month for serious usage**

## Deployment Team Notes

### Lessons Learned

**Week 9**: First deploy attempt failed - forgot to set environment variables
**Week 10**: SQLite file kept getting deleted - learned about Render's ephemeral filesystem
**Week 11**: CORS issues - fixed by configuring allowed origins properly
**Week 12**: Performance was slow - added database indexes, much better

### Decision Log

- **Render vs Heroku**: Render has better free tier
- **SQLite vs PostgreSQL**: Started simple, can migrate later
- **Static files**: FastAPI serving vs CDN - went simple for now

### Future Deployment Goals

1. **CI/CD Pipeline**: Auto-deploy from GitHub with tests
2. **Multiple Environments**: Staging and production deployments  
3. **Database Backups**: Automated backup strategy
4. **Performance Monitoring**: Better observability
5. **Load Testing**: Understand our capacity limits

## Troubleshooting Common Issues

### Deployment Fails

**Problem**: Build command fails
```bash
# Check requirements.txt has all dependencies
pip freeze > requirements.txt
```

**Problem**: App won't start
```bash
# Check start command in Render config
# Verify main.py runs locally
python main.py
```

### Application Issues

**Problem**: Database connection errors
- Check DATABASE_URL environment variable
- Verify database file permissions
- Check for SQLite file corruption

**Problem**: Static files not loading  
- Verify static file mount in main.py
- Check file paths are relative to app root
- Test static file serving locally

### Performance Issues

**Problem**: Slow response times
- Check database query performance
- Add indexes for frequently queried columns
- Monitor memory usage in Render dashboard

---

*Deployment got easier once we figured out the quirks! 🚀*