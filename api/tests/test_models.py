"""
Unit tests for the models module.

This module tests Pydantic model validation, data serialization,
and field validation with comprehensive coverage.
"""
import pytest
from pydantic import ValidationError

from models import (
    UserCreate, ParticleCreate, ParticleUpdate, ParticleResponse,
    TokenResponse, MessageResponse, ErrorResponse
)


class TestUserCreate:
    """Test UserCreate model validation."""
    
    def test_valid_user_creation(self):
        """Test creating user with valid data."""
        user_data = {
            "username": "testuser123",
            "password": "securepassword"
        }
        
        user = UserCreate(**user_data)
        assert user.username == "testuser123"
        assert user.password == "securepassword"
    
    def test_username_validation_alphanumeric_underscore_hyphen(self):
        """Test username validation allows alphanumeric, underscore, hyphen."""
        valid_usernames = [
            "user123",
            "test_user",
            "test-user",
            "User_123-test"
        ]
        
        for username in valid_usernames:
            user = UserCreate(username=username, password="password123")
            assert user.username == username
    
    def test_username_validation_rejects_invalid_characters(self):
        """Test username validation rejects invalid characters."""
        invalid_usernames = [
            "user@domain.com",  # Contains @
            "user space",       # Contains space
            "user#123",         # Contains #
            "user.dot",         # Contains dot
            "user$money"        # Contains $
        ]
        
        for username in invalid_usernames:
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(username=username, password="password123")
            
            assert "must contain only letters" in str(exc_info.value)
    
    def test_username_length_validation(self):
        """Test username length constraints."""
        # Too short (less than 3 characters)
        with pytest.raises(ValidationError):
            UserCreate(username="ab", password="password123")
        
        # Too long (more than 50 characters)
        long_username = "a" * 51
        with pytest.raises(ValidationError):
            UserCreate(username=long_username, password="password123")
        
        # Valid lengths
        UserCreate(username="abc", password="password123")  # Minimum
        UserCreate(username="a" * 50, password="password123")  # Maximum
    
    def test_password_length_validation(self):
        """Test password length constraints."""
        # Too short (less than 6 characters)
        with pytest.raises(ValidationError):
            UserCreate(username="testuser", password="12345")
        
        # Too long (more than 100 characters)
        long_password = "a" * 101
        with pytest.raises(ValidationError):
            UserCreate(username="testuser", password=long_password)
        
        # Valid lengths
        UserCreate(username="testuser", password="123456")  # Minimum
        UserCreate(username="testuser", password="a" * 100)  # Maximum
    
    def test_username_stripped_whitespace(self):
        """Test that username whitespace is stripped."""
        user = UserCreate(username="  testuser  ", password="password123")
        assert user.username == "testuser"


class TestParticleCreate:
    """Test ParticleCreate model validation."""
    
    def test_valid_particle_creation(self):
        """Test creating particle with valid data."""
        particle_data = {
            "title": "Test Particle",
            "content": "This is test content with **markdown**.",
            "tags": ["test", "example"],
            "section": "Projects"
        }
        
        particle = ParticleCreate(**particle_data)
        assert particle.title == "Test Particle"
        assert particle.content == "This is test content with **markdown**."
        assert particle.tags == ["test", "example"]
        assert particle.section == "Projects"
    
    def test_particle_with_empty_tags(self):
        """Test particle creation with empty tags."""
        particle = ParticleCreate(
            title="Test",
            content="Content",
            tags=[],
            section="Projects"
        )
        assert particle.tags == []
    
    def test_particle_without_tags_field(self):
        """Test particle creation without tags field uses default."""
        particle = ParticleCreate(
            title="Test",
            content="Content",
            section="Projects"
        )
        assert particle.tags == []
    
    def test_title_length_validation(self):
        """Test title length constraints."""
        # Empty title
        with pytest.raises(ValidationError):
            ParticleCreate(title="", content="Content", section="Projects")
        
        # Too long title
        long_title = "a" * 256
        with pytest.raises(ValidationError):
            ParticleCreate(title=long_title, content="Content", section="Projects")
        
        # Valid lengths
        ParticleCreate(title="a", content="Content", section="Projects")  # Minimum
        ParticleCreate(title="a" * 255, content="Content", section="Projects")  # Maximum
    
    def test_content_length_validation(self):
        """Test content length constraints."""
        # Empty content
        with pytest.raises(ValidationError):
            ParticleCreate(title="Test", content="", section="Projects")
        
        # Too long content
        long_content = "a" * 10001
        with pytest.raises(ValidationError):
            ParticleCreate(title="Test", content=long_content, section="Projects")
        
        # Valid lengths
        ParticleCreate(title="Test", content="a", section="Projects")  # Minimum
        ParticleCreate(title="Test", content="a" * 10000, section="Projects")  # Maximum
    
    def test_section_validation(self):
        """Test section validation accepts only PARA sections."""
        valid_sections = ["Projects", "Areas", "Resources", "Archives"]
        
        for section in valid_sections:
            particle = ParticleCreate(
                title="Test",
                content="Content",
                section=section
            )
            assert particle.section == section
        
        # Invalid section
        with pytest.raises(ValidationError) as exc_info:
            ParticleCreate(
                title="Test",
                content="Content",
                section="InvalidSection"
            )
        assert "must be one of" in str(exc_info.value)
    
    def test_tags_validation_removes_duplicates(self):
        """Test that tag validation removes duplicates."""
        particle = ParticleCreate(
            title="Test",
            content="Content",
            tags=["tag1", "tag2", "tag1", "TAG1"],  # Duplicates with different case
            section="Projects"
        )
        # Should remove case-insensitive duplicates while preserving order
        assert len(particle.tags) == 2
        assert "tag1" in particle.tags
        assert "tag2" in particle.tags
    
    def test_tags_validation_rejects_invalid_characters(self):
        """Test that tag validation rejects invalid characters."""
        with pytest.raises(ValidationError) as exc_info:
            ParticleCreate(
                title="Test",
                content="Content",
                tags=["valid-tag", "invalid tag with spaces"],
                section="Projects"
            )
        assert "invalid characters" in str(exc_info.value)
    
    def test_tags_validation_length_limits(self):
        """Test tag validation length limits."""
        # Too many tags
        too_many_tags = [f"tag{i}" for i in range(11)]  # 11 tags (max is 10)
        with pytest.raises(ValidationError):
            ParticleCreate(
                title="Test",
                content="Content",
                tags=too_many_tags,
                section="Projects"
            )
        
        # Tag too long
        long_tag = "a" * 51  # Max is 50
        with pytest.raises(ValidationError) as exc_info:
            ParticleCreate(
                title="Test",
                content="Content",
                tags=[long_tag],
                section="Projects"
            )
        assert "exceeds" in str(exc_info.value)
    
    def test_tags_validation_strips_whitespace_and_empty(self):
        """Test that tag validation strips whitespace and removes empty tags."""
        particle = ParticleCreate(
            title="Test",
            content="Content",
            tags=["  tag1  ", "", "tag2", "   ", "tag3"],
            section="Projects"
        )
        assert particle.tags == ["tag1", "tag2", "tag3"]


class TestParticleUpdate:
    """Test ParticleUpdate model validation."""
    
    def test_partial_update_all_fields_optional(self):
        """Test that all fields are optional for partial updates."""
        # Empty update should be valid
        update = ParticleUpdate()
        assert update.title is None
        assert update.content is None
        assert update.tags is None
        assert update.section is None
    
    def test_partial_update_single_field(self):
        """Test updating only a single field."""
        update = ParticleUpdate(title="New Title")
        assert update.title == "New Title"
        assert update.content is None
        assert update.tags is None
        assert update.section is None
    
    def test_partial_update_validation_applies(self):
        """Test that validation still applies to provided fields."""
        # Invalid title length
        with pytest.raises(ValidationError):
            ParticleUpdate(title="")
        
        # Invalid section
        with pytest.raises(ValidationError):
            ParticleUpdate(section="InvalidSection")


class TestParticleResponse:
    """Test ParticleResponse model."""
    
    def test_particle_response_creation(self):
        """Test creating particle response with all fields."""
        response_data = {
            "id": 1,
            "title": "Test Particle",
            "content": "Test content",
            "tags": ["test", "example"],
            "section": "Projects",
            "user": "testuser",
            "created": "2023-01-01T12:00:00",
            "updated": "2023-01-01T12:00:00"
        }
        
        response = ParticleResponse(**response_data)
        assert response.id == 1
        assert response.title == "Test Particle"
        assert response.tags == ["test", "example"]


class TestTokenResponse:
    """Test TokenResponse model."""
    
    def test_token_response_with_defaults(self):
        """Test token response with default values."""
        response = TokenResponse(access_token="test_token")
        assert response.access_token == "test_token"
        assert response.token_type == "bearer"
        assert response.expires_in == 24 * 3600  # 24 hours in seconds
    
    def test_token_response_custom_expiry(self):
        """Test token response with custom expiry."""
        response = TokenResponse(
            access_token="test_token",
            expires_in=3600
        )
        assert response.expires_in == 3600


class TestMessageResponse:
    """Test MessageResponse model."""
    
    def test_message_response_with_defaults(self):
        """Test message response with default success value."""
        response = MessageResponse(message="Test message")
        assert response.message == "Test message"
        assert response.success is True
    
    def test_message_response_with_failure(self):
        """Test message response with failure status."""
        response = MessageResponse(
            message="Error occurred",
            success=False
        )
        assert response.success is False


class TestErrorResponse:
    """Test ErrorResponse model."""
    
    def test_error_response_basic(self):
        """Test basic error response."""
        response = ErrorResponse(detail="An error occurred")
        assert response.detail == "An error occurred"
        assert response.error_code is None
    
    def test_error_response_with_code(self):
        """Test error response with error code."""
        response = ErrorResponse(
            detail="Validation failed",
            error_code="VALIDATION_ERROR"
        )
        assert response.error_code == "VALIDATION_ERROR"


@pytest.mark.integration
class TestModelIntegration:
    """Integration tests for model interactions."""
    
    def test_user_to_particle_workflow(self):
        """Test workflow from user creation to particle creation."""
        # Create user
        user = UserCreate(username="testuser", password="password123")
        
        # Create particle for that user
        particle = ParticleCreate(
            title="User's First Particle",
            content="This is the user's first particle.",
            tags=["first", "user-particle"],
            section="Projects"
        )
        
        # Create response as if from API
        response = ParticleResponse(
            id=1,
            title=particle.title,
            content=particle.content,
            tags=particle.tags,
            section=particle.section,
            user=user.username,
            created="2023-01-01T12:00:00",
            updated="2023-01-01T12:00:00"
        )
        
        assert response.user == user.username
        assert response.title == particle.title
    
    def test_particle_update_preserves_unchanged_fields(self):
        """Test that particle update only changes specified fields."""
        original = ParticleResponse(
            id=1,
            title="Original Title",
            content="Original content",
            tags=["original"],
            section="Projects",
            user="testuser",
            created="2023-01-01T12:00:00",
            updated="2023-01-01T12:00:00"
        )
        
        # Update only title
        update = ParticleUpdate(title="Updated Title")
        
        # In real app, this would be handled by service layer
        # Here we just verify the update model works correctly
        assert update.title == "Updated Title"
        assert update.content is None  # Unchanged
        assert update.tags is None     # Unchanged
        assert update.section is None  # Unchanged