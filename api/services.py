"""
Business logic services for the PARA InfoSystem API.

This module contains service classes that encapsulate business logic
and data access operations, providing a clean separation between
HTTP handling and core application functionality.
"""
import sqlite3
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from models import UserCreate, ParticleCreate, ParticleUpdate, ParticleResponse
from database import db_manager, DatabaseError
from auth import password_manager, AuthenticationError

logger = logging.getLogger(__name__)


class ServiceError(Exception):
    """Base exception for service-layer errors."""
    pass


class UserService:
    """
    Service for user-related operations.
    
    This service handles user registration, authentication,
    and user management with proper error handling and validation.
    """
    
    def create_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """
        Create a new user account.
        
        Args:
            user_data: User creation data
            
        Returns:
            Dict[str, Any]: Created user information
            
        Raises:
            ServiceError: If user creation fails
        """
        try:
            # Validate password strength
            is_valid, error_msg = password_manager.validate_password_strength(user_data.password)
            if not is_valid:
                raise ServiceError(error_msg)
            
            # Hash password
            hashed_password = password_manager.hash_password(user_data.password)
            
            # Create user in database
            db_manager.execute_query(
                """
                INSERT INTO users (username, password_hash, created) 
                VALUES (?, ?, ?)
                """,
                (user_data.username, hashed_password, datetime.utcnow().isoformat())
            )
            
            logger.info(f"Created user: {user_data.username}")
            return {
                "username": user_data.username,
                "created": datetime.utcnow().isoformat(),
                "message": "User created successfully",
                "success": True
            }
                
        except sqlite3.IntegrityError:
            raise ServiceError("Username already exists")
        except AuthenticationError as e:
            raise ServiceError(str(e))
        except DatabaseError as e:
            logger.error(f"Database error creating user {user_data.username}: {e}")
            raise ServiceError("Failed to create user account")
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate a user with username and password.
        
        Args:
            username: Username
            password: Plain text password
            
        Returns:
            Optional[Dict[str, Any]]: User data if authentication successful, None otherwise
        """
        try:
            # Get user from database
            user_results = db_manager.execute_query(
                "SELECT username, password_hash, created FROM users WHERE username = ?",
                (username,)
            )
            
            if not user_results:
                logger.warning(f"Authentication failed - user not found: {username}")
                return None
            
            user = user_results[0]  # Get first (should be only) result
            
            if not password_manager.verify_password(password, user[1]):  # password_hash is at index 1
                logger.warning(f"Authentication failed - invalid password: {username}")
                return None
            
            logger.info(f"User authenticated successfully: {username}")
            return {
                "username": user[0],  # username is at index 0
                "created": user[2]    # created is at index 2
            }
                
        except DatabaseError as e:
            logger.error(f"Database error during authentication for {username}: {e}")
            return None
    
    def get_user_info(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get user information by username.
        
        Args:
            username: Username to look up
            
        Returns:
            Optional[Dict[str, Any]]: User information if found
        """
        try:
            with db_manager.get_db_session() as db:
                cursor = db.execute(
                    "SELECT username, created FROM users WHERE username = ?",
                    (username,)
                )
                user = cursor.fetchone()
                
                return dict(user) if user else None
                
        except DatabaseError as e:
            logger.error(f"Error fetching user info for {username}: {e}")
            return None
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get user information by username.
        
        Args:
            username: Username to search for
            
        Returns:
            Optional[Dict[str, Any]]: User information if found
        """
        return self.get_user_info(username)


class ParticleService:
    """
    Service for particle (note) related operations.
    
    This service handles CRUD operations for particles with proper
    user isolation, validation, and error handling.
    """
    
    def create_particle(self, particle_data: ParticleCreate, username: str) -> ParticleResponse:
        """
        Create a new particle for a user.
        
        Args:
            particle_data: Particle creation data
            username: Owner username
            
        Returns:
            ParticleResponse: Created particle data
            
        Raises:
            ServiceError: If particle creation fails
        """
        try:
            tags_str = ','.join(particle_data.tags) if particle_data.tags else ''
            created_time = datetime.utcnow().isoformat()
            
            particle_id = db_manager.execute_query(
                """
                INSERT INTO particles (title, content, tags, section, user, created, updated) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    particle_data.title,
                    particle_data.content,
                    tags_str,
                    particle_data.section,
                    username,
                    created_time,
                    created_time
                )
            )
            
            logger.info(f"Created particle {particle_id} for user {username}")
            
            return self.get_particle_by_id(particle_id, username)
                
        except DatabaseError as e:
            logger.error(f"Database error creating particle for {username}: {e}")
            raise ServiceError("Failed to create particle")
    
    def get_particle_by_id(self, particle_id: int, username: str) -> ParticleResponse:
        """
        Get a specific particle by ID for a user.
        
        Args:
            particle_id: Particle ID
            username: Owner username
            
        Returns:
            ParticleResponse: Particle data
            
        Raises:
            ServiceError: If particle not found or access denied
        """
        try:
            particles = db_manager.execute_query(
                """
                SELECT id, title, content, tags, section, user, created, updated
                FROM particles 
                WHERE id = ? AND user = ?
                """,
                (particle_id, username)
            )
            
            if not particles:
                raise ServiceError("Particle not found or access denied")
            
            particle = particles[0]
            
            return ParticleResponse(
                id=particle[0],   # id
                title=particle[1], # title
                content=particle[2], # content
                tags=particle[3].split(',') if particle[3] else [], # tags
                section=particle[4], # section
                user=particle[5], # user
                created=particle[6], # created
                updated=particle[7]  # updated
            )
                
        except DatabaseError as e:
            logger.error(f"Database error fetching particle {particle_id} for {username}: {e}")
            raise ServiceError("Failed to fetch particle")
    
    def list_particles(
        self, 
        username: str, 
        section: Optional[str] = None, 
        search_query: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[ParticleResponse]:
        """
        List particles for a user with optional filtering.
        
        Args:
            username: Owner username
            section: Optional section filter
            search_query: Optional search query
            limit: Maximum number of results
            offset: Result offset for pagination
            
        Returns:
            List[ParticleResponse]: List of particles
        """
        try:
            with db_manager.get_db_session() as db:
                # Build query based on filters
                base_query = """
                SELECT id, title, content, tags, section, user, created, updated
                FROM particles 
                WHERE user = ?
                """
                params = [username]
                
                if section:
                    base_query += " AND section = ?"
                    params.append(section)
                
                if search_query:
                    # Use FTS for full-text search if available, otherwise fallback to LIKE
                    base_query += " AND (title LIKE ? OR content LIKE ?)"
                    search_pattern = f"%{search_query}%"
                    params.extend([search_pattern, search_pattern])
                
                base_query += " ORDER BY created DESC LIMIT ? OFFSET ?"
                params.extend([limit, offset])
                
                cursor = db.execute(base_query, params)
                particles = cursor.fetchall()
                
                return [
                    ParticleResponse(
                        id=p['id'],
                        title=p['title'],
                        content=p['content'],
                        tags=p['tags'].split(',') if p['tags'] else [],
                        section=p['section'],
                        user=p['user'],
                        created=p['created'],
                        updated=p['updated']
                    )
                    for p in particles
                ]
                
        except DatabaseError as e:
            logger.error(f"Database error listing particles for {username}: {e}")
            return []
    
    def update_particle(
        self, 
        particle_id: int, 
        particle_data: ParticleUpdate, 
        username: str
    ) -> ParticleResponse:
        """
        Update an existing particle.
        
        Args:
            particle_id: Particle ID to update
            particle_data: Updated particle data
            username: Owner username
            
        Returns:
            ParticleResponse: Updated particle data
            
        Raises:
            ServiceError: If update fails or particle not found
        """
        try:
            # First check if particle exists and belongs to user
            existing = self.get_particle_by_id(particle_id, username)
            
            # Build update query for provided fields only
            update_fields = []
            params = []
            
            if particle_data.title is not None:
                update_fields.append("title = ?")
                params.append(particle_data.title)
            
            if particle_data.content is not None:
                update_fields.append("content = ?")
                params.append(particle_data.content)
            
            if particle_data.tags is not None:
                update_fields.append("tags = ?")
                params.append(','.join(particle_data.tags))
            
            if particle_data.section is not None:
                update_fields.append("section = ?")
                params.append(particle_data.section)
            
            if not update_fields:
                # No fields to update, return existing particle
                return existing
            
            # Add updated timestamp
            update_fields.append("updated = ?")
            params.append(datetime.utcnow().isoformat())
            
            # Add WHERE conditions
            params.extend([particle_id, username])
            
            with db_manager.get_db_session() as db:
                query = f"""
                UPDATE particles 
                SET {', '.join(update_fields)}
                WHERE id = ? AND user = ?
                """
                
                cursor = db.execute(query, params)
                db.commit()
                
                if cursor.rowcount == 0:
                    raise ServiceError("Particle not found or access denied")
                
                logger.info(f"Updated particle {particle_id} for user {username}")
                return self.get_particle_by_id(particle_id, username)
                
        except ServiceError:
            raise
        except ServiceError:
            raise
        except DatabaseError as e:
            logger.error(f"Database error updating particle {particle_id} for {username}: {e}")
            raise ServiceError("Failed to update particle")
    
    def delete_particle(self, particle_id: int, username: str) -> bool:
        """
        Delete a particle (soft delete by marking inactive).
        
        Args:
            particle_id: Particle ID to delete
            username: Owner username
            
        Returns:
            bool: True if deleted successfully
            
        Raises:
            ServiceError: If deletion fails
        """
        try:
            with db_manager.get_db_session() as db:
                cursor = db.execute(
                    """
                    DELETE FROM particles 
                    WHERE id = ? AND user = ?
                    """,
                    (particle_id, username)
                )
                db.commit()
                
                if cursor.rowcount == 0:
                    raise ServiceError("Particle not found or access denied")
                
                logger.info(f"Deleted particle {particle_id} for user {username}")
                return True
                
        except ServiceError:
            raise
        except DatabaseError as e:
            logger.error(f"Database error deleting particle {particle_id} for {username}: {e}")
            raise ServiceError("Failed to delete particle")
    
    def get_particle_stats(self, username: str) -> Dict[str, int]:
        """
        Get particle statistics for a user.
        
        Args:
            username: Username to get stats for
            
        Returns:
            Dict[str, int]: Statistics by section and total
        """
        try:
            with db_manager.get_db_session() as db:
                cursor = db.execute(
                    """
                    SELECT section, COUNT(*) as count
                    FROM particles 
                    WHERE user = ?
                    GROUP BY section
                    """,
                    (username,)
                )
                results = cursor.fetchall()
                
                stats = {
                    'Projects': 0,
                    'Areas': 0,
                    'Resources': 0,
                    'Archives': 0,
                    'total': 0
                }
                
                for row in results:
                    stats[row['section']] = row['count']
                    stats['total'] += row['count']
                
                return stats
                
        except DatabaseError as e:
            logger.error(f"Database error getting stats for {username}: {e}")
            return {'Projects': 0, 'Areas': 0, 'Resources': 0, 'Archives': 0, 'total': 0}


# Service instances
user_service = UserService()
particle_service = ParticleService()