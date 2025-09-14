"""
Data models for the PARA InfoSystem API.

This module defines Pydantic models for request/response validation
and data serialization with comprehensive field validation.
"""
from typing import List, Optional, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
import re

from config import settings


class UserCreate(BaseModel):
    """
    Model for user registration requests.
    
    Attributes:
        username: Unique identifier (3-50 chars, alphanumeric + underscore/hyphen)
        password: Password (6-100 chars minimum)
    """
    username: str = Field(
        ...,
        min_length=settings.min_username_length,
        max_length=settings.max_username_length,
        description="Username for the account"
    )
    password: str = Field(
        ...,
        min_length=settings.min_password_length,
        max_length=settings.max_password_length,
        description="Password for the account"
    )
    
    @validator('username')
    def validate_username(cls, v: str) -> str:
        """Validate username contains only allowed characters."""
        v = v.strip()  # Strip whitespace first
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username must contain only letters, numbers, underscores, and hyphens')
        return v
    
    @validator('password')
    def validate_password(cls, v: str) -> str:
        """Validate password meets basic requirements."""
        if len(v.strip()) < settings.min_password_length:
            raise ValueError(f'Password must be at least {settings.min_password_length} characters')
        return v


class UserResponse(BaseModel):
    """
    Model for user data in responses (excludes sensitive information).
    
    Attributes:
        username: The user's username
        created: Account creation timestamp (if available)
    """
    username: str
    created: Optional[str] = None


class ParticleCreate(BaseModel):
    """
    Model for creating new particles.
    
    Attributes:
        title: Particle title (1-255 chars)
        content: Main content (1-10000 chars)
        tags: List of tags (max 10, each max 50 chars)
        section: PARA method section
    """
    title: str = Field(
        ...,
        min_length=1,
        max_length=settings.max_title_length,
        description="Title of the particle"
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=settings.max_content_length,
        description="Main content in markdown format"
    )
    tags: List[str] = Field(
        default=[],
        max_items=settings.max_tags_per_particle,
        description="Tags for categorization"
    )
    section: str = Field(
        ...,
        description="PARA method section"
    )
    
    @validator('tags')
    def validate_tags(cls, v: List[str]) -> List[str]:
        """Validate and clean tags."""
        if not v:
            return []
        
        cleaned_tags = []
        for tag in v:
            tag = tag.strip()
            if not tag:
                continue
            if len(tag) > settings.max_tag_length:
                raise ValueError(f'Tag "{tag}" exceeds {settings.max_tag_length} character limit')
            if not re.match(r'^[a-zA-Z0-9_-]+$', tag):
                raise ValueError(f'Tag "{tag}" contains invalid characters. Use only letters, numbers, underscores, and hyphens')
            cleaned_tags.append(tag)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_tags = []
        for tag in cleaned_tags:
            if tag.lower() not in seen:
                seen.add(tag.lower())
                unique_tags.append(tag)
        
        return unique_tags
    
    @validator('section')
    def validate_section(cls, v: str) -> str:
        """Validate section is one of the PARA method categories."""
        valid_sections = ['Projects', 'Areas', 'Resources', 'Archives']
        if v not in valid_sections:
            raise ValueError(f'Section must be one of: {", ".join(valid_sections)}')
        return v


class ParticleUpdate(BaseModel):
    """
    Model for updating existing particles.
    All fields are optional for partial updates.
    """
    title: Optional[str] = Field(
        None,
        min_length=1,
        max_length=settings.max_title_length
    )
    content: Optional[str] = Field(
        None,
        min_length=1,
        max_length=settings.max_content_length
    )
    tags: Optional[List[str]] = Field(
        None,
        max_items=settings.max_tags_per_particle
    )
    section: Optional[str] = None
    
    @validator('tags', pre=True)
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Apply same tag validation as ParticleCreate if tags provided."""
        if v is None:
            return None
        return ParticleCreate.validate_tags(v)
    
    @validator('section')
    def validate_section(cls, v: Optional[str]) -> Optional[str]:
        """Apply same section validation as ParticleCreate if section provided."""
        if v is None:
            return None
        return ParticleCreate.validate_section(v)


class ParticleResponse(BaseModel):
    """
    Model for particle data in responses.
    
    Attributes:
        id: Unique particle ID
        title: Particle title
        content: Main content
        tags: List of tags
        section: PARA section
        user: Owner username
        created: Creation timestamp
        updated: Last update timestamp
    """
    id: int
    title: str
    content: str
    tags: List[str]
    section: str
    user: str
    created: str
    updated: str
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """
    Model for authentication token responses.
    
    Attributes:
        access_token: Bearer token for API access
        token_type: Always "bearer"
        expires_in: Token expiration time in seconds
    """
    access_token: str
    token_type: str = "bearer"
    expires_in: int = settings.token_expire_hours * 3600


class MessageResponse(BaseModel):
    """
    Model for simple message responses.
    
    Attributes:
        message: Response message
        success: Success status
    """
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """
    Model for error responses.
    
    Attributes:
        detail: Error message
        error_code: Optional error code for client handling
    """
    detail: str
    error_code: Optional[str] = None