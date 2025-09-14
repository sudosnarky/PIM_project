"""
API routes for the PARA InfoSystem.

This module defines all API endpoints with proper request/response handling,
validation, error handling, and comprehensive OpenAPI documentation.
"""
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.security import OAuth2PasswordRequestForm

from models import (
    UserCreate, ParticleCreate, ParticleUpdate, ParticleResponse,
    TokenResponse, MessageResponse, ErrorResponse
)
from services import user_service, particle_service, ServiceError
from auth import get_current_user, token_manager

logger = logging.getLogger(__name__)

# Create routers for different sections
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Users"])
particles_router = APIRouter(prefix="/particles", tags=["Particles"])


# =====================================================
# AUTHENTICATION ROUTES
# =====================================================

@auth_router.post(
    "/token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and get access token",
    description="Authenticate with username/password and receive a bearer token for API access."
)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> TokenResponse:
    """
    Authenticate user and return access token.
    
    This endpoint accepts form data (as per OAuth2 specification) and returns
    a bearer token that can be used for authenticated API requests.
    
    Args:
        form_data: OAuth2 form containing username and password
        
    Returns:
        TokenResponse: Access token and metadata
        
    Raises:
        HTTPException: 401 if credentials are invalid
    """
    try:
        # Authenticate user
        user = user_service.authenticate_user(form_data.username, form_data.password)
        if not user:
            logger.warning(f"Failed login attempt for username: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Create token
        token = token_manager.create_token(user["username"])
        
        logger.info(f"Successful login for user: {user['username']}")
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=token_manager.expire_seconds
        )
        
    except ServiceError as e:
        logger.error(f"Service error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable"
        )


@auth_router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Logout and revoke access token",
    description="Revoke the current access token, effectively logging out the user."
)
async def logout(current_user: str = Depends(get_current_user)) -> MessageResponse:
    """
    Logout current user and revoke their tokens.
    
    Args:
        current_user: Current authenticated user (from token)
        
    Returns:
        MessageResponse: Logout confirmation
    """
    try:
        # Revoke all tokens for this user
        revoked_count = token_manager.revoke_user_tokens(current_user)
        
        logger.info(f"User {current_user} logged out, {revoked_count} tokens revoked")
        return MessageResponse(
            message=f"Successfully logged out. {revoked_count} sessions terminated.",
            success=True
        )
        
    except Exception as e:
        logger.error(f"Error during logout for {current_user}: {e}")
        # Still return success since logout should be forgiving
        return MessageResponse(
            message="Logged out (with potential issues)",
            success=True
        )


# =====================================================
# USER MANAGEMENT ROUTES
# =====================================================

@users_router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description="Create a new user account with username and password."
)
async def register_user(user_data: UserCreate) -> MessageResponse:
    """
    Register a new user account.
    
    Args:
        user_data: User registration data
        
    Returns:
        MessageResponse: Registration confirmation
        
    Raises:
        HTTPException: 400 if registration fails (e.g., username taken)
    """
    try:
        result = user_service.create_user(user_data)
        
        logger.info(f"New user registered: {user_data.username}")
        return MessageResponse(
            message=result["message"],
            success=True
        )
        
    except ServiceError as e:
        logger.warning(f"Registration failed for {user_data.username}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@users_router.get(
    "/me",
    response_model=dict,
    summary="Get current user information",
    description="Retrieve information about the currently authenticated user."
)
async def get_current_user_info(current_user: str = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get current user's information.
    
    Args:
        current_user: Current authenticated user (from token)
        
    Returns:
        dict: User information
    """
    user_info = user_service.get_user_info(current_user)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User information not found"
        )
    
    return user_info


# =====================================================
# PARTICLE (NOTES) ROUTES
# =====================================================

@particles_router.post(
    "/",
    response_model=ParticleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new particle",
    description="Create a new particle (note/task/resource) in the PARA system."
)
async def create_particle(
    particle_data: ParticleCreate,
    current_user: str = Depends(get_current_user)
) -> ParticleResponse:
    """
    Create a new particle for the authenticated user.
    
    Args:
        particle_data: Particle creation data
        current_user: Current authenticated user (from token)
        
    Returns:
        ParticleResponse: Created particle data
        
    Raises:
        HTTPException: 400 if creation fails
    """
    try:
        particle = particle_service.create_particle(particle_data, current_user)
        
        logger.info(f"Created particle {particle.id} for user {current_user}")
        return particle
        
    except ServiceError as e:
        logger.error(f"Failed to create particle for {current_user}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@particles_router.get(
    "/",
    response_model=List[ParticleResponse],
    summary="List particles with optional filtering",
    description="Retrieve a list of particles for the authenticated user with optional section and search filters."
)
async def list_particles(
    section: Optional[str] = Query(None, description="Filter by PARA section"),
    q: Optional[str] = Query(None, description="Search query for title/content"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: str = Depends(get_current_user)
) -> List[ParticleResponse]:
    """
    List particles for the authenticated user.
    
    Args:
        section: Optional PARA section filter
        q: Optional search query
        limit: Maximum results per page
        offset: Pagination offset
        current_user: Current authenticated user (from token)
        
    Returns:
        List[ParticleResponse]: List of particles
    """
    try:
        particles = particle_service.list_particles(
            username=current_user,
            section=section,
            search_query=q,
            limit=limit,
            offset=offset
        )
        
        logger.debug(f"Retrieved {len(particles)} particles for user {current_user}")
        return particles
        
    except ServiceError as e:
        logger.error(f"Failed to list particles for {current_user}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve particles"
        )


@particles_router.get(
    "/{particle_id}",
    response_model=ParticleResponse,
    summary="Get a specific particle",
    description="Retrieve a specific particle by ID for the authenticated user."
)
async def get_particle(
    particle_id: int,
    current_user: str = Depends(get_current_user)
) -> ParticleResponse:
    """
    Get a specific particle by ID.
    
    Args:
        particle_id: ID of the particle to retrieve
        current_user: Current authenticated user (from token)
        
    Returns:
        ParticleResponse: Particle data
        
    Raises:
        HTTPException: 404 if particle not found or access denied
    """
    try:
        particle = particle_service.get_particle_by_id(particle_id, current_user)
        
        logger.debug(f"Retrieved particle {particle_id} for user {current_user}")
        return particle
        
    except ServiceError as e:
        logger.warning(f"Failed to get particle {particle_id} for {current_user}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@particles_router.put(
    "/{particle_id}",
    response_model=ParticleResponse,
    summary="Update a particle",
    description="Update an existing particle with new data."
)
async def update_particle(
    particle_id: int,
    particle_data: ParticleUpdate,
    current_user: str = Depends(get_current_user)
) -> ParticleResponse:
    """
    Update an existing particle.
    
    Args:
        particle_id: ID of the particle to update
        particle_data: Updated particle data (partial update supported)
        current_user: Current authenticated user (from token)
        
    Returns:
        ParticleResponse: Updated particle data
        
    Raises:
        HTTPException: 404 if particle not found, 400 if update fails
    """
    try:
        particle = particle_service.update_particle(particle_id, particle_data, current_user)
        
        logger.info(f"Updated particle {particle_id} for user {current_user}")
        return particle
        
    except ServiceError as e:
        logger.warning(f"Failed to update particle {particle_id} for {current_user}: {e}")
        status_code = (
            status.HTTP_404_NOT_FOUND 
            if "not found" in str(e).lower() 
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=str(e))


@particles_router.delete(
    "/{particle_id}",
    response_model=MessageResponse,
    summary="Delete a particle",
    description="Delete a particle (soft delete - marks as inactive)."
)
async def delete_particle(
    particle_id: int,
    current_user: str = Depends(get_current_user)
) -> MessageResponse:
    """
    Delete a particle (soft delete).
    
    Args:
        particle_id: ID of the particle to delete
        current_user: Current authenticated user (from token)
        
    Returns:
        MessageResponse: Deletion confirmation
        
    Raises:
        HTTPException: 404 if particle not found or access denied
    """
    try:
        success = particle_service.delete_particle(particle_id, current_user)
        
        if success:
            logger.info(f"Deleted particle {particle_id} for user {current_user}")
            return MessageResponse(
                message="Particle deleted successfully",
                success=True
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Particle not found or access denied"
            )
            
    except ServiceError as e:
        logger.warning(f"Failed to delete particle {particle_id} for {current_user}: {e}")
        
        # Check if it's a 'not found' error and map to appropriate message
        error_msg = str(e)
        if "not found" in error_msg.lower() or "access denied" in error_msg.lower():
            error_msg = "Particle not found or access denied"
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg
        )


@particles_router.get(
    "/stats/summary",
    response_model=dict,
    summary="Get particle statistics",
    description="Retrieve statistics about particles by section for the authenticated user."
)
async def get_particle_stats(
    current_user: str = Depends(get_current_user)
) -> dict:
    """
    Get particle statistics for the current user.
    
    Args:
        current_user: Current authenticated user (from token)
        
    Returns:
        dict: Statistics by section and total count
    """
    try:
        stats = particle_service.get_particle_stats(current_user)
        
        logger.debug(f"Retrieved stats for user {current_user}: {stats}")
        return stats
        
    except ServiceError as e:
        logger.error(f"Failed to get stats for {current_user}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )


# Collect all routers
routers = [
    auth_router,
    users_router,
    particles_router
]