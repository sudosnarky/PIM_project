"""
Database layer tests.

This module tests the database abstraction layer, connection management,
query execution, and error handling.
"""
import pytest
import tempfile
import os
import sqlite3
from unittest.mock import Mock, patch, MagicMock
from contextlib import contextmanager

from database import DatabaseManager
from config import settings


class TestDatabaseManager:
    """Test database manager functionality."""
    
    def test_init_creates_database_file(self):
        """Test that database manager creates database file on first connection."""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
            db_path = temp_file.name
        
        try:
            # Remove the file so we can test creation
            os.unlink(db_path)
            
            db_manager = DatabaseManager(db_path)
            
            # Database file should be created when we first connect
            with db_manager.get_connection() as conn:
                pass  # Just open and close connection
            
            assert os.path.exists(db_path)
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)
    
    def test_init_database_schema(self, test_db_manager):
        """Test that database schema is properly initialized."""
        # Check that tables exist
        tables_query = """
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        """
        
        tables = test_db_manager.execute_query(tables_query)
        table_names = [table[0] for table in tables]
        
        expected_tables = ['users', 'particles']
        for table in expected_tables:
            assert table in table_names
    
    def test_users_table_schema(self, test_db_manager):
        """Test users table has correct schema."""
        schema_query = "PRAGMA table_info(users)"
        columns = test_db_manager.execute_query(schema_query)
        
        column_info = {col[1]: col[2] for col in columns}  # name: type
        
        expected_columns = {
            'username': 'TEXT',
            'password_hash': 'TEXT',
            'created': 'TIMESTAMP'
        }
        
        for col_name, col_type in expected_columns.items():
            assert col_name in column_info
            assert column_info[col_name] == col_type
    
    def test_particles_table_schema(self, test_db_manager):
        """Test particles table has correct schema."""
        schema_query = "PRAGMA table_info(particles)"
        columns = test_db_manager.execute_query(schema_query)
        
        column_info = {col[1]: col[2] for col in columns}  # name: type
        
        expected_columns = {
            'id': 'INTEGER',
            'title': 'TEXT',
            'content': 'TEXT',
            'section': 'TEXT',
            'tags': 'TEXT',
            'user': 'TEXT',
            'created': 'TIMESTAMP',
            'updated': 'TIMESTAMP'
        }
        
        for col_name, col_type in expected_columns.items():
            assert col_name in column_info
            assert column_info[col_name] == col_type
    
    def test_fts_table_schema(self, test_db_manager):
        """Test FTS table is properly created."""
        # Check if FTS table exists
        fts_query = """
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='particles_fts'
        """
        
        result = test_db_manager.execute_query(fts_query)
        assert len(result) == 1
        assert result[0][0] == 'particles_fts'
    
    def test_execute_query_select(self, test_db_manager):
        """Test executing SELECT queries."""
        # Insert test data
        insert_query = """
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """
        test_db_manager.execute_query(insert_query, ("testuser", "hashed_password"))
        
        # Select data
        select_query = "SELECT username, password_hash FROM users WHERE username = ?"
        result = test_db_manager.execute_query(select_query, ("testuser",))
        
        assert len(result) == 1
        assert result[0][0] == "testuser"
        assert result[0][1] == "hashed_password"
    
    def test_execute_query_insert_returns_lastrowid(self, test_db_manager):
        """Test that INSERT queries return the last row ID."""
        insert_query = """
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """
        
        result = test_db_manager.execute_query(insert_query, ("testuser", "hashed_password"))
        
        # For INSERT, should return lastrowid
        assert isinstance(result, int)
        assert result > 0
    
    def test_execute_query_update_returns_rowcount(self, test_db_manager):
        """Test that UPDATE queries return the affected row count."""
        # Insert test data first
        insert_query = """
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """
        test_db_manager.execute_query(insert_query, ("testuser", "hashed_password"))
        
        # Update the data
        update_query = "UPDATE users SET password_hash = ? WHERE username = ?"
        result = test_db_manager.execute_query(update_query, ("new_hash", "testuser"))
        
        # For UPDATE, should return rowcount
        assert result == 1  # One row affected
    
    def test_execute_query_delete_returns_rowcount(self, test_db_manager):
        """Test that DELETE queries return the affected row count."""
        # Insert test data first
        insert_query = """
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """
        test_db_manager.execute_query(insert_query, ("testuser", "hashed_password"))
        
        # Delete the data
        delete_query = "DELETE FROM users WHERE username = ?"
        result = test_db_manager.execute_query(delete_query, ("testuser",))
        
        # For DELETE, should return rowcount
        assert result == 1  # One row affected
    
    def test_execute_query_with_parameters(self, test_db_manager):
        """Test executing queries with parameters."""
        insert_query = """
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """
        
        # Test with tuple parameters
        test_db_manager.execute_query(insert_query, ("user1", "hash1"))
        
        # Test with list parameters
        test_db_manager.execute_query(insert_query, ["user2", "hash2"])
        
        # Verify both users were inserted
        select_query = "SELECT COUNT(*) FROM users"
        result = test_db_manager.execute_query(select_query)
        assert result[0][0] == 2
    
    def test_execute_query_without_parameters(self, test_db_manager):
        """Test executing queries without parameters."""
        query = "SELECT COUNT(*) FROM users"
        result = test_db_manager.execute_query(query)
        
        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0][0] == 0  # Initially empty
    
    def test_execute_query_sql_injection_protection(self, test_db_manager):
        """Test that parameterized queries protect against SQL injection."""
        # Insert legitimate user
        insert_query = """
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """
        test_db_manager.execute_query(insert_query, ("legituser", "hash"))
        
        # Try SQL injection in parameter
        malicious_username = "'; DROP TABLE users; --"
        select_query = "SELECT * FROM users WHERE username = ?"
        
        # This should not cause an error or drop the table
        result = test_db_manager.execute_query(select_query, (malicious_username,))
        assert result == []  # No matching user
        
        # Verify table still exists
        table_check = "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        tables = test_db_manager.execute_query(table_check)
        assert len(tables) == 1
    
    def test_context_manager_success(self, test_db_manager):
        """Test database context manager for successful operations."""
        with test_db_manager as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (username, password_hash, created)
                VALUES (?, ?, datetime('now'))
            """, ("contextuser", "hash"))
        
        # Verify data was committed
        result = test_db_manager.execute_query("SELECT username FROM users WHERE username = ?", ("contextuser",))
        assert len(result) == 1
        assert result[0][0] == "contextuser"
    
    def test_context_manager_rollback_on_exception(self, test_db_manager):
        """Test database context manager rolls back on exceptions."""
        # Insert initial data
        test_db_manager.execute_query("""
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """, ("initialuser", "hash"))
        
        try:
            with test_db_manager as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO users (username, password_hash, created)
                    VALUES (?, ?, datetime('now'))
                """, ("rollbackuser", "hash"))
                
                # Simulate an error
                raise Exception("Simulated error")
        except Exception:
            pass
        
        # Verify rollback occurred - rollbackuser should not exist
        result = test_db_manager.execute_query("SELECT username FROM users WHERE username = ?", ("rollbackuser",))
        assert len(result) == 0
        
        # Verify initial data still exists
        result = test_db_manager.execute_query("SELECT username FROM users WHERE username = ?", ("initialuser",))
        assert len(result) == 1
    
    def test_get_connection_properties(self, test_db_manager):
        """Test that database connections have proper properties set."""
        with test_db_manager as conn:
            # Test WAL mode is enabled
            cursor = conn.cursor()
            cursor.execute("PRAGMA journal_mode")
            journal_mode = cursor.fetchone()[0]
            assert journal_mode.upper() == "WAL"
            
            # Test foreign keys are enabled
            cursor.execute("PRAGMA foreign_keys")
            foreign_keys = cursor.fetchone()[0]
            assert foreign_keys == 1
    
    def test_close_database(self, test_db_manager):
        """Test database closing functionality."""
        # Perform some operations to ensure connection exists
        test_db_manager.execute_query("SELECT COUNT(*) FROM users")
        
        # Close database
        test_db_manager.close()
        
        # After closing, new operations should still work (new connection created)
        result = test_db_manager.execute_query("SELECT COUNT(*) FROM users")
        assert result[0][0] == 0
    
    def test_health_check_success(self, test_db_manager):
        """Test database health check with healthy database."""
        health = test_db_manager.health_check()
        
        assert health["status"] == "healthy"
        assert health["database"] == "connected"
        assert "response_time_ms" in health
        assert isinstance(health["response_time_ms"], (int, float))
        assert health["response_time_ms"] >= 0
    
    @patch('sqlite3.connect')
    def test_health_check_failure(self, mock_connect):
        """Test database health check with database failure."""
        mock_connect.side_effect = Exception("Database connection failed")
        
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
            db_path = temp_file.name
        
        try:
            db_manager = DatabaseManager(db_path)
            health = db_manager.health_check()
            
            assert health["status"] == "unhealthy"
            assert health["database"] == "error"
            assert "error" in health
            assert "Database connection failed" in health["error"]
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)
    
    def test_concurrent_access(self, test_db_manager):
        """Test concurrent database access."""
        import threading
        import time
        
        results = []
        errors = []
        
        def insert_user(username):
            try:
                insert_query = """
                    INSERT INTO users (username, password_hash, created)
                    VALUES (?, ?, datetime('now'))
                """
                result = test_db_manager.execute_query(insert_query, (username, f"hash_{username}"))
                results.append(result)
            except Exception as e:
                errors.append(e)
        
        # Create multiple threads inserting users
        threads = []
        for i in range(10):
            thread = threading.Thread(target=insert_user, args=(f"user_{i}",))
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify no errors occurred
        assert len(errors) == 0, f"Concurrent access errors: {errors}"
        
        # Verify all users were inserted
        count_query = "SELECT COUNT(*) FROM users"
        count = test_db_manager.execute_query(count_query)
        assert count[0][0] == 10
    
    def test_database_file_permissions(self):
        """Test that database file has appropriate permissions."""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
            db_path = temp_file.name
        
        try:
            os.unlink(db_path)  # Remove file to test creation
            
            db_manager = DatabaseManager(db_path)
            
            # Check file permissions
            stat_info = os.stat(db_path)
            file_mode = stat_info.st_mode & 0o777
            
            # File should be readable and writable by owner
            assert file_mode & 0o600 == 0o600
            
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)
    
    def test_large_data_handling(self, test_db_manager):
        """Test handling of large data inserts."""
        large_content = "x" * 10000  # 10KB content
        
        insert_query = """
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """
        
        user_id = test_db_manager.execute_query(insert_query, ("largeuser", "hash"))
        
        particle_query = """
            INSERT INTO particles (user, title, content, section, created, updated)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        """
        
        particle_id = test_db_manager.execute_query(
            particle_query, 
            ("largeuser", "Large Particle", large_content, "Projects")
        )
        
        # Verify data was stored correctly
        select_query = "SELECT content FROM particles WHERE id = ?"
        result = test_db_manager.execute_query(select_query, (particle_id,))
        
        assert len(result) == 1
        assert result[0][0] == large_content
    
    def test_fts_search_functionality(self, test_db_manager):
        """Test full-text search functionality."""
        # Insert user and particles
        user_id = test_db_manager.execute_query("""
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """, ("searchuser", "hash"))
        
        particles = [
            ("Python Programming", "Learn Python programming language basics", "Resources"),
            ("JavaScript Frameworks", "Exploring React and Vue.js frameworks", "Projects"),
            ("Database Design", "SQL and NoSQL database design principles", "Areas")
        ]
        
        for title, content, section in particles:
            particle_id = test_db_manager.execute_query("""
                INSERT INTO particles (user, title, content, section, created, updated)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            """, ("searchuser", title, content, section))
            
            # Insert into FTS table
            test_db_manager.execute_query("""
                INSERT INTO particles_fts (rowid, title, content)
                VALUES (?, ?, ?)
            """, (particle_id, title, content))
        
        # Test FTS search
        search_query = """
            SELECT p.id, p.title, p.content
            FROM particles p
            JOIN particles_fts fts ON p.id = fts.rowid
            WHERE particles_fts MATCH ?
        """
        
        # Search for "Python"
        results = test_db_manager.execute_query(search_query, ("Python",))
        assert len(results) == 1
        assert "Python" in results[0][1]
        
        # Search for "database"
        results = test_db_manager.execute_query(search_query, ("database",))
        assert len(results) == 1
        assert "Database" in results[0][1]


class TestDatabaseErrorHandling:
    """Test database error handling scenarios."""
    
    def test_invalid_sql_query(self, test_db_manager):
        """Test handling of invalid SQL queries."""
        with pytest.raises(sqlite3.OperationalError):
            test_db_manager.execute_query("INVALID SQL QUERY")
    
    def test_constraint_violation(self, test_db_manager):
        """Test handling of database constraint violations."""
        # Create user
        test_db_manager.execute_query("""
            INSERT INTO users (username, password_hash, created)
            VALUES (?, ?, datetime('now'))
        """, ("uniqueuser", "hash"))
        
        # Try to create another user with same username (should fail due to unique constraint)
        with pytest.raises(sqlite3.IntegrityError):
            test_db_manager.execute_query("""
                INSERT INTO users (username, password_hash, created)
                VALUES (?, ?, datetime('now'))
            """, ("uniqueuser", "hash2"))
    
    def test_database_locked_handling(self, test_db_manager):
        """Test handling of database lock situations."""
        # This is difficult to test reliably, but we can test the basic structure
        # In a real scenario, WAL mode should help prevent most lock issues
        
        # Perform a long-running transaction to potentially create locks
        with test_db_manager as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (username, password_hash, created)
                VALUES (?, ?, datetime('now'))
            """, ("locktest", "hash"))
            
            # This should still work due to WAL mode
            result = test_db_manager.execute_query("SELECT COUNT(*) FROM users")
            assert isinstance(result, list)
    
    def test_corrupted_database_detection(self):
        """Test detection of corrupted database files."""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
            db_path = temp_file.name
            # Write invalid data to simulate corruption
            temp_file.write(b"This is not a valid SQLite database")
        
        try:
            with pytest.raises(sqlite3.DatabaseError):
                db_manager = DatabaseManager(db_path)
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)