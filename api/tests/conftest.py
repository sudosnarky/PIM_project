"""
Test configuration and fixtures for the PARA InfoSystem API.

This module provides pytest configuration, fixtures, and utilities
for testing the API with proper test isolation and data setup.
"""
import os
import tempfile
import pytest
import sqlite3
from typing import Generator
from fastapi.testclient import TestClient

# Set test environment before importing modules
os.environ['DATABASE_URL'] = ':memory:'
os.environ['DEBUG'] = 'true'

from config import settings
from database import db_manager
from auth import token_manager
from main import app


@pytest.fixture(scope="function")
def test_db():
    """
    Create a temporary test database for each test.
    
    This fixture ensures test isolation by creating a fresh
    in-memory SQLite database for each test function.
    """
    # Create temporary database
    temp_db = tempfile.NamedTemporaryFile(delete=False)
    temp_db.close()
    
    # Update database manager for testing
    original_db_url = db_manager.db_url
    db_manager.db_url = temp_db.name
    
    # Initialize test schema
    db_manager.initialize_schema()
    
    yield temp_db.name
    
    # Cleanup
    db_manager.db_url = original_db_url
    os.unlink(temp_db.name)


@pytest.fixture(scope="function")
def test_db_manager(test_db):
    """
    Provide a test database manager instance.
    
    This fixture provides access to the database manager
    configured with a test database.
    """
    yield db_manager


@pytest.fixture(scope="function")
def client(test_db):
    """
    Create a test client for API testing.
    
    Args:
        test_db: Test database fixture
        
    Yields:
        TestClient: FastAPI test client
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def test_user_data():
    """
    Provide test user data for registration and authentication.
    
    Returns:
        dict: Test user credentials
    """
    return {
        "username": "testuser123",
        "password": "securepassword123"
    }


@pytest.fixture(scope="function")
def authenticated_client(client: TestClient, test_user_data: dict):
    """
    Create an authenticated test client with a valid token.
    
    Args:
        client: Test client fixture
        test_user_data: Test user data fixture
        
    Yields:
        tuple: (TestClient, token, user_data)
    """
    # Register user
    response = client.post("/api/v1/users/register", json=test_user_data)
    assert response.status_code == 201
    
    # Login to get token
    login_data = {
        "username": test_user_data["username"],
        "password": test_user_data["password"]
    }
    response = client.post("/api/v1/auth/token", data=login_data)
    assert response.status_code == 200
    
    token_data = response.json()
    token = token_data["access_token"]
    
    # Set authorization header for subsequent requests
    client.headers.update({"Authorization": f"Bearer {token}"})
    
    yield client, token, test_user_data


@pytest.fixture(scope="function")
def sample_particles():
    """
    Provide sample particle data for testing.
    
    Returns:
        list: List of sample particle data
    """
    return [
        {
            "title": "Test Project 1",
            "content": "This is a test project particle with **markdown** formatting.",
            "tags": ["project", "test"],
            "section": "Projects"
        },
        {
            "title": "Test Area 1",
            "content": "This is a test area particle for ongoing maintenance.",
            "tags": ["area", "maintenance"],
            "section": "Areas"
        },
        {
            "title": "Test Resource 1",
            "content": "This is a test resource particle for reference material.",
            "tags": ["resource", "reference"],
            "section": "Resources"
        },
        {
            "title": "Test Archive 1",
            "content": "This is an archived particle no longer active.",
            "tags": ["archive", "inactive"],
            "section": "Archives"
        }
    ]


@pytest.fixture(autouse=True)
def cleanup_tokens():
    """
    Automatically clean up tokens after each test.
    
    This fixture ensures test isolation by clearing
    all tokens from the token manager after each test.
    """
    yield
    # Clear all tokens after test
    from auth import tokens
    tokens.clear()


@pytest.fixture(scope="session")
def faker_instance():
    """
    Provide a Faker instance for generating test data.
    
    Returns:
        Faker: Faker instance for data generation
    """
    from faker import Faker
    return Faker()


# Test database utilities
def create_test_user(db_path: str, username: str, password_hash: str):
    """
    Create a test user directly in the database.
    
    Args:
        db_path: Path to test database
        username: Username for test user
        password_hash: Hashed password
    """
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            (username, password_hash)
        )
        conn.commit()


def create_test_particle(db_path: str, title: str, content: str, username: str, section: str = "Projects"):
    """
    Create a test particle directly in the database.
    
    Args:
        db_path: Path to test database
        title: Particle title
        content: Particle content
        username: Owner username
        section: PARA section
        
    Returns:
        int: Created particle ID
    """
    with sqlite3.connect(db_path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO particles (title, content, section, user, created) 
            VALUES (?, ?, ?, ?, datetime('now'))
            """,
            (title, content, section, username)
        )
        conn.commit()
        return cursor.lastrowid


# Assertion helpers
def assert_particle_equal(particle_data, expected: dict):
    """
    Assert that particle data matches expected values.
    
    Args:
        particle_data: Actual particle data from API (dict or ParticleResponse)
        expected: Expected particle values
    """
    # Handle both dict and ParticleResponse objects
    if hasattr(particle_data, 'title'):  # ParticleResponse object
        assert particle_data.title == expected["title"]
        assert particle_data.content == expected["content"]
        assert particle_data.section == expected["section"]
        assert set(particle_data.tags) == set(expected.get("tags", []))
    else:  # dict
        assert particle_data["title"] == expected["title"]
        assert particle_data["content"] == expected["content"]
        assert particle_data["section"] == expected["section"]
        assert set(particle_data["tags"]) == set(expected.get("tags", []))


def assert_error_response(response, expected_status: int, expected_detail: str = None):
    """
    Assert that response is an error with expected status and detail.
    
    Args:
        response: HTTP response object
        expected_status: Expected HTTP status code
        expected_detail: Expected error detail (optional)
    """
    assert response.status_code == expected_status
    
    if expected_detail:
        error_data = response.json()
        assert expected_detail.lower() in error_data["detail"].lower()


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "integration: mark test as integration test")
    config.addinivalue_line("markers", "unit: mark test as unit test")
    config.addinivalue_line("markers", "slow: mark test as slow running")