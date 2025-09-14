"""
Service layer tests.

This module tests the business logic layer that sits between the API routes
and the database, ensuring proper data processing and business rules.
"""
import pytest
import tempfile
import os
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta

from services import UserService, ParticleService, ServiceError
from models import UserCreate, ParticleCreate, ParticleUpdate
from config import settings
from tests.conftest import assert_particle_equal


class TestUserService:
    """Test user service business logic."""
    
    def test_create_user_success(self, test_db_manager, test_user_data):
        """Test successful user creation."""
        user_service = UserService()
        user_create = UserCreate(**test_user_data)
        
        result = user_service.create_user(user_create)
        
        assert "username" in result
        assert "created" in result
        assert "message" in result
        assert result["username"] == test_user_data["username"]
        assert "created" in result["message"].lower()
        
        # Verify user exists in database
        user = user_service.authenticate_user(test_user_data["username"], test_user_data["password"])
        assert user is not None
        assert user["username"] == test_user_data["username"]
    
    def test_create_user_duplicate_username(self, test_db_manager, test_user_data):
        """Test creating user with duplicate username."""
        user_service = UserService()
        user_create = UserCreate(**test_user_data)
        
        # Create user first time
        result = user_service.create_user(user_create)
        assert result["success"] is True
        
        # Try to create same user again
        with pytest.raises(ServiceError, match="already exists"):
            user_service.create_user(user_create)
    
    @patch('services.db_manager')
    def test_create_user_database_error(self, mock_db_manager, test_db_manager, test_user_data):
        """Test user creation with database error."""
        mock_db_manager.execute_query.side_effect = Exception("Database error")
        
        user_service = UserService()
        user_create = UserCreate(**test_user_data)
        
        with pytest.raises(Exception, match="Database error"):
            user_service.create_user(user_create)
    
    def test_authenticate_user_success(self, test_db_manager, test_user_data):
        """Test successful user authentication."""
        user_service = UserService()
        user_create = UserCreate(**test_user_data)
        
        # Create user
        user_service.create_user(user_create)
        
        # Authenticate
        user = user_service.authenticate_user(test_user_data["username"], test_user_data["password"])
        
        assert user is not None
        assert user["username"] == test_user_data["username"]
        assert "created" in user
    
    def test_authenticate_user_wrong_password(self, test_db_manager, test_user_data):
        """Test authentication with wrong password."""
        user_service = UserService()
        user_create = UserCreate(**test_user_data)
        
        # Create user
        user_service.create_user(user_create)
        
        # Try with wrong password
        user = user_service.authenticate_user(test_user_data["username"], "wrongpassword")
        assert user is None
    
    def test_authenticate_user_nonexistent(self, test_db_manager):
        """Test authentication with non-existent user."""
        user_service = UserService()
        
        user = user_service.authenticate_user("nonexistent", "password")
        assert user is None
    
    def test_get_user_by_username_success(self, test_db_manager, test_user_data):
        """Test getting user by username."""
        user_service = UserService()
        user_create = UserCreate(**test_user_data)
        
        # Create user
        user_service.create_user(user_create)
        
        # Get user
        user = user_service.get_user_by_username(test_user_data["username"])
        
        assert user is not None
        assert user["username"] == test_user_data["username"]
    
    def test_get_user_by_username_not_found(self, test_db_manager):
        """Test getting non-existent user."""
        user_service = UserService()
        
        user = user_service.get_user_by_username("nonexistent")
        assert user is None


class TestParticleService:
    """Test particle service business logic."""
    
    @pytest.fixture(autouse=True)
    def setup_test_user(self, test_db_manager, test_user_data):
        """Ensure test user exists for particle tests."""
        from services import UserService
        from models import UserCreate
        
        user_service = UserService()
        user_create = UserCreate(**test_user_data)
        
        try:
            user_service.create_user(user_create)
        except ValueError:
            # User already exists, which is fine
            pass
    
    def test_create_particle_success(self, test_db_manager, sample_particles, test_user_data):
        """Test successful particle creation."""
        particle_service = ParticleService()
        particle_data = sample_particles[0]
        particle_create = ParticleCreate(**particle_data)
        username = test_user_data["username"]  # Use the test user instead of hardcoded "testuser"
        
        result = particle_service.create_particle(particle_create, username)
        
        assert hasattr(result, 'id') and result.id is not None
        assert result.user == username
        assert_particle_equal(result.model_dump(), particle_data)
        assert hasattr(result, 'created') and result.created is not None
    
    def test_create_particle_invalid_section(self, test_db_manager):
        """Test creating particle with invalid section."""
        from pydantic import ValidationError
        particle_service = ParticleService()
        
        with pytest.raises(ValidationError, match="Section must be one of"):
            invalid_data = {
                "title": "Test Particle",
                "content": "Test content",
                "section": "InvalidSection"
            }
            particle_create = ParticleCreate(**invalid_data)
    
    @patch('services.db_manager')
    def test_create_particle_database_error(self, mock_db_manager, sample_particles, test_user_data):
        """Test particle creation with database error."""
        mock_db_manager.execute_query.side_effect = Exception("Database error")
        
        particle_service = ParticleService()
        particle_create = ParticleCreate(**sample_particles[0])
        
        with pytest.raises(Exception, match="Database error"):
            particle_service.create_particle(particle_create, test_user_data["username"])
    
    def test_get_particles_success(self, test_db_manager, sample_particles, test_user_data):
        """Test getting user's particles."""
        particle_service = ParticleService()
        username = test_user_data["username"]
        
        # Create multiple particles
        created_particles = []
        for particle_data in sample_particles:
            particle_create = ParticleCreate(**particle_data)
            result = particle_service.create_particle(particle_create, username)
            created_particles.append(result)
        
        # Get all particles
        particles = particle_service.list_particles(username)
        
        assert len(particles) == len(sample_particles)
        assert all(p.user == username for p in particles)
        
        # Verify particles are sorted by creation time (newest first)
        creation_times = [p.created for p in particles]
        assert creation_times == sorted(creation_times, reverse=True)
    
    def test_get_particles_with_section_filter(self, test_db_manager, sample_particles, test_user_data):
        """Test getting particles with section filter."""
        particle_service = ParticleService()
        username = test_user_data["username"]
        
        # Create particles
        for particle_data in sample_particles:
            particle_create = ParticleCreate(**particle_data)
            particle_service.create_particle(particle_create, username)
        
        # Filter by Projects section
        particles = particle_service.list_particles(username, section="Projects")
        
        assert len(particles) > 0
        assert all(p.section == "Projects" for p in particles)
        
        # Count expected particles in Projects section
        expected_count = sum(1 for p in sample_particles if p["section"] == "Projects")
        assert len(particles) == expected_count
    
    def test_get_particles_with_search_query(self, test_db_manager, sample_particles, test_user_data):
        """Test getting particles with search query."""
        particle_service = ParticleService()
        username = test_user_data["username"]
        
        # Create particles
        for particle_data in sample_particles:
            particle_create = ParticleCreate(**particle_data)
            particle_service.create_particle(particle_create, username)
        
        # Search for "test" (all sample particles contain "test" in title)
        particles = particle_service.list_particles(username, search_query="test")
        
        assert len(particles) == len(sample_particles)
        assert all("test" in p.title.lower() or "test" in p.content.lower() for p in particles)
    
    def test_get_particles_with_pagination(self, test_db_manager, test_user_data):
        """Test getting particles with pagination."""
        particle_service = ParticleService()
        username = test_user_data["username"]
        
        # Create 15 particles
        for i in range(15):
            particle_data = {
                "title": f"Particle {i}",
                "content": f"Content for particle {i}",
                "section": "Projects"
            }
            particle_create = ParticleCreate(**particle_data)
            particle_service.create_particle(particle_create, username)
        
        # Test first page
        particles_page1 = particle_service.list_particles(username, limit=10, offset=0)
        assert len(particles_page1) == 10
        
        # Test second page
        particles_page2 = particle_service.list_particles(username, limit=10, offset=10)
        assert len(particles_page2) == 5
        
        # Verify no overlap
        page1_ids = {p.id for p in particles_page1}
        page2_ids = {p.id for p in particles_page2}
        assert len(page1_ids.intersection(page2_ids)) == 0
    
    def test_get_particle_by_id_success(self, test_db_manager, sample_particles, test_user_data):
        """Test getting specific particle by ID."""
        particle_service = ParticleService()
        username = test_user_data["username"]
        
        # Create particle
        particle_create = ParticleCreate(**sample_particles[0])
        created = particle_service.create_particle(particle_create, username)
        particle_id = created.id
        
        # Get particle by ID
        particle = particle_service.get_particle_by_id(particle_id, username)
        
        assert particle is not None
        assert particle.id == particle_id
        assert particle.user == username
        assert_particle_equal(particle, sample_particles[0])
    
    def test_get_particle_by_id_not_found(self, test_db_manager, test_user_data):
        """Test getting non-existent particle."""
        particle_service = ParticleService()
        
        with pytest.raises(ServiceError, match="Particle not found or access denied"):
            particle_service.get_particle_by_id(999, test_user_data["username"])
    
    def test_get_particle_by_id_different_user(self, test_db_manager, sample_particles, test_user_data):
        """Test accessing particle from different user."""
        particle_service = ParticleService()
        
        # Create particle as test user
        particle_create = ParticleCreate(**sample_particles[0])
        created = particle_service.create_particle(particle_create, test_user_data["username"])
        particle_id = created.id
        
        # Try to access as different user (non-existent user)
        with pytest.raises(ServiceError, match="Particle not found or access denied"):
            particle_service.get_particle_by_id(particle_id, "nonexistentuser")
    
    def test_update_particle_success(self, test_db_manager, sample_particles, test_user_data):
        """Test successful particle update."""
        particle_service = ParticleService()
        username = test_user_data["username"]
        
        # Create particle
        particle_create = ParticleCreate(**sample_particles[0])
        created = particle_service.create_particle(particle_create, username)
        particle_id = created.id
        
        # Update particle
        update_data = {
            "title": "Updated Title",
            "content": "Updated content with new information"
        }
        update = ParticleUpdate(**update_data)
        
        result = particle_service.update_particle(particle_id, update, username)
        
        assert result is not None
        assert result.title == update_data["title"]
        assert result.content == update_data["content"]
        assert result.section == sample_particles[0]["section"]  # Unchanged
        assert result.updated != created.updated  # Updated timestamp changed
    
    def test_update_particle_not_found(self, test_db_manager, test_user_data):
        """Test updating non-existent particle."""
        particle_service = ParticleService()
        
        update_data = {"title": "New Title"}
        update = ParticleUpdate(**update_data)
        
        with pytest.raises(ServiceError, match="not found"):
            particle_service.update_particle(999, update, test_user_data["username"])
    
    def test_update_particle_different_user(self, test_db_manager, sample_particles, test_user_data):
        """Test updating particle from different user."""
        particle_service = ParticleService()
        
        # Create particle as test user
        particle_create = ParticleCreate(**sample_particles[0])
        created = particle_service.create_particle(particle_create, test_user_data["username"])
        particle_id = created.id
        
        # Try to update as different user
        update_data = {"title": "Hacked Title"}
        update = ParticleUpdate(**update_data)
        
        with pytest.raises(ServiceError, match="Particle not found or access denied"):
            particle_service.update_particle(particle_id, update, "nonexistentuser")
    
    def test_delete_particle_success(self, test_db_manager, sample_particles, test_user_data):
        """Test successful particle deletion."""
        particle_service = ParticleService()
        username = test_user_data["username"]
        
        # Create particle
        particle_create = ParticleCreate(**sample_particles[0])
        created = particle_service.create_particle(particle_create, username)
        particle_id = created.id
        
        # Delete particle
        result = particle_service.delete_particle(particle_id, username)
        
        assert result is True
        
        # Verify particle no longer exists
        with pytest.raises(ServiceError, match="not found"):
            particle_service.get_particle_by_id(particle_id, username)
    
    def test_delete_particle_not_found(self, test_db_manager, test_user_data):
        """Test deleting non-existent particle."""
        particle_service = ParticleService()
        
        with pytest.raises(ServiceError, match="Failed to delete particle"):
            particle_service.delete_particle(999, test_user_data["username"])
    
    def test_delete_particle_different_user(self, test_db_manager, sample_particles, test_user_data):
        """Test deleting particle from different user."""
        particle_service = ParticleService()
        
        # Create particle as test user
        particle_create = ParticleCreate(**sample_particles[0])
        created = particle_service.create_particle(particle_create, test_user_data["username"])
        particle_id = created.id
        
        # Try to delete as different user - should raise ServiceError
        with pytest.raises(ServiceError, match="Failed to delete particle"):
            particle_service.delete_particle(particle_id, "nonexistentuser")
        
        # Verify particle still exists
        particle = particle_service.get_particle_by_id(particle_id, test_user_data["username"])
        assert particle is not None
    
    def test_get_particle_stats_success(self, test_db_manager, sample_particles, test_user_data):
        """Test getting particle statistics."""
        particle_service = ParticleService()
        username = test_user_data["username"]
        
        # Create particles in different sections
        for particle_data in sample_particles:
            particle_create = ParticleCreate(**particle_data)
            particle_service.create_particle(particle_create, username)
        
        # Get stats
        stats = particle_service.get_particle_stats(username)
        
        assert "Projects" in stats
        assert "Areas" in stats
        assert "Resources" in stats
        assert "Archives" in stats
        assert "total" in stats
        
        # Verify counts
        expected_total = len(sample_particles)
        assert stats["total"] == expected_total
        
        # Verify section counts
        section_counts = {}
        for particle_data in sample_particles:
            section = particle_data["section"]
            section_counts[section] = section_counts.get(section, 0) + 1
        
        for section in ["Projects", "Areas", "Resources", "Archives"]:
            expected_count = section_counts.get(section, 0)
            assert stats[section] == expected_count
    
    def test_get_particle_stats_empty(self, test_db_manager):
        """Test getting stats for user with no particles."""
        particle_service = ParticleService()
        
        stats = particle_service.get_particle_stats("emptyuser")
        
        assert stats["Projects"] == 0
        assert stats["Areas"] == 0
        assert stats["Resources"] == 0
        assert stats["Archives"] == 0
        assert stats["total"] == 0


class TestServiceIntegration:
    """Integration tests for service layer interactions."""
    
    def test_user_particle_workflow(self, test_db_manager, test_user_data, sample_particles):
        """Test complete workflow with user and particle services."""
        user_service = UserService()
        particle_service = ParticleService()
        
        # Create user
        user_create = UserCreate(**test_user_data)
        user_result = user_service.create_user(user_create)
        assert user_result["success"] is True
        
        username = test_user_data["username"]
        
        # Authenticate user
        user = user_service.authenticate_user(username, test_user_data["password"])
        assert user is not None
        
        # Create particles for user
        created_particles = []
        for particle_data in sample_particles:
            particle_create = ParticleCreate(**particle_data)
            result = particle_service.create_particle(particle_create, username)
            created_particles.append(result)
        
        # Verify particles belong to user
        user_particles = particle_service.list_particles(username)
        assert len(user_particles) == len(sample_particles)
        assert all(p.user == username for p in user_particles)
        
        # Update a particle
        particle_id = created_particles[0].id
        update_data = {"title": "Updated by integration test"}
        update = ParticleUpdate(**update_data)
        updated = particle_service.update_particle(particle_id, update, username)
        assert updated.title == update_data["title"]
        
        # Get stats
        stats = particle_service.get_particle_stats(username)
        assert stats["total"] == len(sample_particles)
        
        # Delete a particle
        delete_result = particle_service.delete_particle(particle_id, username)
        assert delete_result is True
        
        # Verify stats updated
        final_stats = particle_service.get_particle_stats(username)
        assert final_stats["total"] == len(sample_particles) - 1
    
    @patch('services.db_manager')
    def test_service_error_handling(self, mock_db_manager, test_user_data):
        """Test service error handling with database failures."""
        # Mock database with various failure modes
        mock_db_manager.execute_query.side_effect = Exception("Connection failed")
        
        user_service = UserService()
        particle_service = ParticleService()
        
        # Test database connection error
        with pytest.raises(Exception, match="Connection failed"):
            user_create = UserCreate(**test_user_data)
            user_service.create_user(user_create)
        
        with pytest.raises(Exception, match="Connection failed"):
            particle_data = {
                "title": "Test Particle",
                "content": "Test content",
                "section": "Projects"
            }
            particle_create = ParticleCreate(**particle_data)
            particle_service.create_particle(particle_create, test_user_data["username"])
    
    # Note: Configuration testing removed as services module doesn't expose settings