"""
Integration tests for API routes.

This module tests the complete HTTP API endpoints with authentication,
request validation, and proper response formatting.
"""
import pytest
from fastapi.testclient import TestClient

from tests.conftest import assert_error_response, assert_particle_equal


class TestAuthenticationRoutes:
    """Test authentication-related API endpoints."""
    
    def test_register_user_success(self, client: TestClient, test_user_data: dict):
        """Test successful user registration."""
        response = client.post("/api/v1/users/register", json=test_user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "created" in data["message"].lower()
    
    def test_register_user_duplicate_username(self, client: TestClient, test_user_data: dict):
        """Test registration with duplicate username."""
        # Register user first time
        response = client.post("/api/v1/users/register", json=test_user_data)
        assert response.status_code == 201
        
        # Try to register same username again
        response = client.post("/api/v1/users/register", json=test_user_data)
        assert_error_response(response, 400, "already exists")
    
    def test_register_user_invalid_data(self, client: TestClient):
        """Test registration with invalid data."""
        invalid_data = {
            "username": "ab",  # Too short
            "password": "123"  # Too short
        }
        
        response = client.post("/api/v1/users/register", json=invalid_data)
        assert response.status_code == 422  # Validation error
    
    def test_login_success(self, client: TestClient, test_user_data: dict):
        """Test successful login."""
        # Register user first
        client.post("/api/v1/users/register", json=test_user_data)
        
        # Login with form data (OAuth2 requirement)
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        }
        response = client.post("/api/v1/auth/token", data=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
    
    def test_login_invalid_credentials(self, client: TestClient, test_user_data: dict):
        """Test login with invalid credentials."""
        # Register user first
        client.post("/api/v1/users/register", json=test_user_data)
        
        # Try login with wrong password
        login_data = {
            "username": test_user_data["username"],
            "password": "wrongpassword"
        }
        response = client.post("/api/v1/auth/token", data=login_data)
        assert_error_response(response, 401, "incorrect")
    
    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with non-existent user."""
        login_data = {
            "username": "nonexistentuser",
            "password": "somepassword"
        }
        response = client.post("/api/v1/auth/token", data=login_data)
        assert_error_response(response, 401, "incorrect")
    
    def test_logout_success(self, authenticated_client):
        """Test successful logout."""
        client, token, user_data = authenticated_client
        
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "logged out" in data["message"].lower()
    
    def test_logout_without_authentication(self, client: TestClient):
        """Test logout without authentication token."""
        response = client.post("/api/v1/auth/logout")
        assert_error_response(response, 401, "")


class TestUserRoutes:
    """Test user management API endpoints."""
    
    def test_get_current_user_info(self, authenticated_client):
        """Test getting current user information."""
        client, token, user_data = authenticated_client
        
        response = client.get("/api/v1/users/me")
        assert response.status_code == 200
        
        data = response.json()
        assert data["username"] == user_data["username"]
        assert "created" in data
    
    def test_get_current_user_info_without_auth(self, client: TestClient):
        """Test getting user info without authentication."""
        response = client.get("/api/v1/users/me")
        assert_error_response(response, 401, "")


class TestParticleRoutes:
    """Test particle (notes) API endpoints."""
    
    def test_create_particle_success(self, authenticated_client, sample_particles):
        """Test successful particle creation."""
        client, token, user_data = authenticated_client
        particle_data = sample_particles[0]
        
        response = client.post("/api/v1/particles/", json=particle_data)
        assert response.status_code == 201
        
        data = response.json()
        assert_particle_equal(data, particle_data)
        assert data["user"] == user_data["username"]
        assert "id" in data
        assert "created" in data
    
    def test_create_particle_invalid_data(self, authenticated_client):
        """Test particle creation with invalid data."""
        client, token, user_data = authenticated_client
        
        invalid_data = {
            "title": "",  # Empty title
            "content": "Valid content",
            "section": "InvalidSection"  # Invalid section
        }
        
        response = client.post("/api/v1/particles/", json=invalid_data)
        assert response.status_code == 422  # Validation error
    
    def test_create_particle_without_auth(self, client: TestClient, sample_particles):
        """Test particle creation without authentication."""
        response = client.post("/api/v1/particles/", json=sample_particles[0])
        assert_error_response(response, 401, "")
    
    def test_list_particles_success(self, authenticated_client, sample_particles):
        """Test successful particle listing."""
        client, token, user_data = authenticated_client
        
        # Create multiple particles
        created_particles = []
        for particle_data in sample_particles:
            response = client.post("/api/v1/particles/", json=particle_data)
            assert response.status_code == 201
            created_particles.append(response.json())
        
        # List all particles
        response = client.get("/api/v1/particles/")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == len(sample_particles)
        assert all(p["user"] == user_data["username"] for p in data)
    
    def test_list_particles_with_section_filter(self, authenticated_client, sample_particles):
        """Test particle listing with section filter."""
        client, token, user_data = authenticated_client
        
        # Create particles in different sections
        for particle_data in sample_particles:
            client.post("/api/v1/particles/", json=particle_data)
        
        # Filter by Projects section
        response = client.get("/api/v1/particles/?section=Projects")
        assert response.status_code == 200
        
        data = response.json()
        projects_particles = [p for p in sample_particles if p["section"] == "Projects"]
        assert len(data) == len(projects_particles)
        assert all(p["section"] == "Projects" for p in data)
    
    def test_list_particles_with_search_query(self, authenticated_client, sample_particles):
        """Test particle listing with search query."""
        client, token, user_data = authenticated_client
        
        # Create particles
        for particle_data in sample_particles:
            client.post("/api/v1/particles/", json=particle_data)
        
        # Search for "test" in title or content
        response = client.get("/api/v1/particles/?q=test")
        assert response.status_code == 200
        
        data = response.json()
        # All sample particles should contain "test" in title
        assert len(data) == len(sample_particles)
    
    def test_list_particles_pagination(self, authenticated_client):
        """Test particle listing with pagination."""
        client, token, user_data = authenticated_client
        
        # Create multiple particles
        for i in range(15):
            particle_data = {
                "title": f"Particle {i}",
                "content": f"Content for particle {i}",
                "section": "Projects"
            }
            client.post("/api/v1/particles/", json=particle_data)
        
        # Test pagination
        response = client.get("/api/v1/particles/?limit=10&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10
        
        response = client.get("/api/v1/particles/?limit=10&offset=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
    
    def test_get_particle_by_id_success(self, authenticated_client, sample_particles):
        """Test getting specific particle by ID."""
        client, token, user_data = authenticated_client
        
        # Create particle
        response = client.post("/api/v1/particles/", json=sample_particles[0])
        created_particle = response.json()
        particle_id = created_particle["id"]
        
        # Get particle by ID
        response = client.get(f"/api/v1/particles/{particle_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == particle_id
        assert_particle_equal(data, sample_particles[0])
    
    def test_get_particle_by_id_not_found(self, authenticated_client):
        """Test getting non-existent particle."""
        client, token, user_data = authenticated_client
        
        response = client.get("/api/v1/particles/999")
        assert_error_response(response, 404, "not found")
    
    def test_get_particle_by_id_different_user(self, client: TestClient, test_user_data):
        """Test accessing particle from different user."""
        # Create first user and particle
        user1_data = test_user_data
        client.post("/api/v1/users/register", json=user1_data)
        login_response = client.post("/api/v1/auth/token", data=user1_data)
        token1 = login_response.json()["access_token"]
        
        particle_data = {
            "title": "Private Particle",
            "content": "This is private content",
            "section": "Projects"
        }
        
        headers = {"Authorization": f"Bearer {token1}"}
        create_response = client.post("/api/v1/particles/", json=particle_data, headers=headers)
        particle_id = create_response.json()["id"]
        
        # Create second user
        user2_data = {"username": "user2", "password": "password123"}
        client.post("/api/v1/users/register", json=user2_data)
        login_response = client.post("/api/v1/auth/token", data=user2_data)
        token2 = login_response.json()["access_token"]
        
        # Try to access first user's particle as second user
        headers = {"Authorization": f"Bearer {token2}"}
        response = client.get(f"/api/v1/particles/{particle_id}", headers=headers)
        assert_error_response(response, 404, "not found")
    
    def test_update_particle_success(self, authenticated_client, sample_particles):
        """Test successful particle update."""
        client, token, user_data = authenticated_client
        
        # Create particle
        response = client.post("/api/v1/particles/", json=sample_particles[0])
        created_particle = response.json()
        particle_id = created_particle["id"]
        
        # Update particle
        update_data = {
            "title": "Updated Title",
            "content": "Updated content with new information"
        }
        
        response = client.put(f"/api/v1/particles/{particle_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["content"] == update_data["content"]
        assert data["section"] == sample_particles[0]["section"]  # Unchanged
    
    def test_update_particle_not_found(self, authenticated_client):
        """Test updating non-existent particle."""
        client, token, user_data = authenticated_client
        
        update_data = {"title": "New Title"}
        response = client.put("/api/v1/particles/999", json=update_data)
        assert_error_response(response, 404, "not found")
    
    def test_delete_particle_success(self, authenticated_client, sample_particles):
        """Test successful particle deletion."""
        client, token, user_data = authenticated_client
        
        # Create particle
        response = client.post("/api/v1/particles/", json=sample_particles[0])
        created_particle = response.json()
        particle_id = created_particle["id"]
        
        # Delete particle
        response = client.delete(f"/api/v1/particles/{particle_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "deleted" in data["message"].lower()
        
        # Verify particle is no longer accessible
        response = client.get(f"/api/v1/particles/{particle_id}")
        assert_error_response(response, 404, "not found")
    
    def test_delete_particle_not_found(self, authenticated_client):
        """Test deleting non-existent particle."""
        client, token, user_data = authenticated_client
        
        response = client.delete("/api/v1/particles/999")
        assert_error_response(response, 404, "failed to delete particle")
    
    def test_get_particle_stats(self, authenticated_client, sample_particles):
        """Test getting particle statistics."""
        client, token, user_data = authenticated_client
        
        # Create particles in different sections
        for particle_data in sample_particles:
            client.post("/api/v1/particles/", json=particle_data)
        
        # Get stats
        response = client.get("/api/v1/particles/stats/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "Projects" in data
        assert "Areas" in data
        assert "Resources" in data
        assert "Archives" in data
        assert "total" in data
        
        # Verify counts match created particles
        expected_total = len(sample_particles)
        assert data["total"] == expected_total


class TestHealthAndInfo:
    """Test system health and info endpoints."""
    
    def test_health_check(self, client: TestClient):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "database" in data
        assert "timestamp" in data
    
    def test_app_info(self, client: TestClient):
        """Test application info endpoint."""
        response = client.get("/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "environment" in data
        assert "features" in data
        assert isinstance(data["features"], list)


@pytest.mark.integration
class TestCompleteWorkflow:
    """Integration tests for complete user workflows."""
    
    def test_complete_user_journey(self, client: TestClient):
        """Test complete user journey from registration to particle management."""
        # Register user
        user_data = {"username": "journeyuser", "password": "journey123"}
        response = client.post("/api/v1/users/register", json=user_data)
        assert response.status_code == 201
        
        # Login
        response = client.post("/api/v1/auth/token", data=user_data)
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create particles in different sections
        particles_data = [
            {"title": "My Project", "content": "Project details", "section": "Projects"},
            {"title": "My Area", "content": "Area to maintain", "section": "Areas"},
            {"title": "My Resource", "content": "Useful resource", "section": "Resources"},
            {"title": "My Archive", "content": "Archived item", "section": "Archives"}
        ]
        
        created_ids = []
        for particle_data in particles_data:
            response = client.post("/api/v1/particles/", json=particle_data, headers=headers)
            assert response.status_code == 201
            created_ids.append(response.json()["id"])
        
        # List all particles
        response = client.get("/api/v1/particles/", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 4
        
        # Update first particle
        update_data = {"title": "Updated Project Title"}
        response = client.put(f"/api/v1/particles/{created_ids[0]}", json=update_data, headers=headers)
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Project Title"
        
        # Delete last particle
        response = client.delete(f"/api/v1/particles/{created_ids[-1]}", headers=headers)
        assert response.status_code == 200
        
        # Verify only 3 particles remain
        response = client.get("/api/v1/particles/", headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 3
        
        # Get stats
        response = client.get("/api/v1/particles/stats/summary", headers=headers)
        assert response.status_code == 200
        stats = response.json()
        assert stats["total"] == 3
        
        # Logout
        response = client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 200