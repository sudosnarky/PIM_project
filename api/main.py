"""
PARA InfoSystem API - Main Application Entry Point

A secure, well-architected note-taking application implementing the PARA method 
(Projects, Areas, Resources, Archives) with FastAPI, SQLite, and comprehensive 
security features.

This is the main application file that ties together all modules and provides
the FastAPI application instance with proper middleware, error handling,
and documentation.
"""
import logging
import sys
import time
from contextlib import asynccontextmanager
from typing import Dict, Any, Callable, AsyncGenerator

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.exceptions import RequestValidationError

# Import our modules
from config import settings
from database import init_database, db_manager
from routes import routers
from models import ErrorResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('api.log') if not settings.debug else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan events - startup and shutdown.
    
    This function handles application initialization and cleanup,
    including database setup and connection management.
    
    Args:
        app: FastAPI application instance
        
    Yields:
        None: Control returns to the application runtime
    """
    # Startup
    logger.info("Starting PARA InfoSystem API...")
    
    try:
        # Initialize database schema
        init_database()
        logger.info("Database initialized successfully")
        
        # Verify database health
        if not db_manager.health_check():
            logger.error("Database health check failed!")
            raise Exception("Database is not healthy")
        
        logger.info("Application startup completed successfully")
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        sys.exit(1)
    
    yield
    
    # Shutdown
    logger.info("Shutting down PARA InfoSystem API...")
    # Add any cleanup code here if needed
    logger.info("Shutdown completed")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="""
    A secure personal knowledge management system implementing the PARA method.
    
    ## Features
    
    * **User Authentication**: Secure bcrypt password hashing with token-based auth
    * **PARA Method**: Organize notes into Projects, Areas, Resources, and Archives
    * **Full-Text Search**: Search across all your particles
    * **Tagging System**: Categorize and find content with tags
    * **Markdown Support**: Rich text formatting with markdown
    * **RESTful API**: Well-documented API with OpenAPI specification
    
    ## Authentication
    
    Use `/auth/token` endpoint to get a bearer token, then include it in the 
    Authorization header: `Authorization: Bearer <your-token>`
    
    ## PARA Method
    
    * **Projects**: Things with a deadline and specific outcome
    * **Areas**: Standards to maintain over time
    * **Resources**: Topics of ongoing interest
    * **Archives**: Inactive items from other categories
    """,
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,  # Disable docs in production
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# =====================================================
# MIDDLEWARE CONFIGURATION
# =====================================================

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Type"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next: Callable) -> Response:
    """
    Log all incoming requests for monitoring and debugging.
    
    Args:
        request: The incoming HTTP request
        call_next: The next middleware/handler in the chain
        
    Returns:
        Response: The HTTP response from downstream handlers
    """
    start_time = time.time()
    
    # Log request
    logger.debug(f"Request: {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        logger.debug(
            f"Response: {response.status_code} - {process_time:.3f}s"
        )
        
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"Request failed: {request.method} {request.url} - "
            f"{process_time:.3f}s - Error: {str(e)}"
        )
        raise


# =====================================================
# ERROR HANDLERS
# =====================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle validation errors with detailed error messages.
    
    Args:
        request: The incoming HTTP request
        exc: The validation exception that occurred
        
    Returns:
        JSONResponse: Formatted error response with validation details
    """
    """Handle request validation errors with detailed messages."""
    logger.warning(f"Validation error for {request.url}: {exc}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            detail="Request validation failed",
            error_code="VALIDATION_ERROR"
        ).dict()
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handle HTTP exceptions with consistent error format.
    
    Args:
        request: The incoming HTTP request
        exc: The HTTP exception that occurred
        
    Returns:
        JSONResponse: Formatted error response
    """
    """Handle HTTP exceptions with consistent error format."""
    logger.warning(f"HTTP exception for {request.url}: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            detail=exc.detail,
            error_code=f"HTTP_{exc.status_code}"
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle all other exceptions as internal server errors.
    
    Args:
        request: The incoming HTTP request
        exc: The exception that occurred
        
    Returns:
        JSONResponse: Generic error response for unhandled exceptions
    """
    """Handle unexpected exceptions with generic error message."""
    logger.error(f"Unexpected error for {request.url}: {exc}", exc_info=True)
    
    # Don't expose internal error details in production
    detail = str(exc) if settings.debug else "Internal server error"
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            detail=detail,
            error_code="INTERNAL_ERROR"
        ).dict()
    )


# =====================================================
# ROUTE REGISTRATION
# =====================================================

# Include all route modules
for router in routers:
    app.include_router(router, prefix="/api/v1")

# Static file serving
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# Root redirect
@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    """
    Root endpoint that redirects users to the login page.
    
    Returns:
        RedirectResponse: Redirect to the login interface
    """
    """Redirect root URL to the main application."""
    return RedirectResponse(url="/static/html/index.html")


# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        Dict[str, Any]: Health status information
    """
    try:
        db_healthy = db_manager.health_check()
        
        return {
            "status": "healthy" if db_healthy else "unhealthy",
            "version": settings.version,
            "database": "connected" if db_healthy else "disconnected",
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "version": settings.version,
            "database": "error",
            "error": str(e),
            "timestamp": time.time()
        }


# Application info endpoint
@app.get("/info", tags=["System"])
async def app_info() -> Dict[str, Any]:
    """
    Application information endpoint.
    
    Returns:
        Dict[str, Any]: Application metadata
    """
    return {
        "name": settings.app_name,
        "version": settings.version,
        "environment": "development" if settings.debug else "production",
        "features": [
            "User Authentication",
            "PARA Method Organization",
            "Full-Text Search",
            "Markdown Support",
            "Tag System",
            "RESTful API"
        ]
    }


# Import time for middleware
import time

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting development server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info"
    )