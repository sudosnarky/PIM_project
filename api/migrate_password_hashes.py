#!/usr/bin/env python3
"""
Script to migrate user password hashes from SHA-256 to bcrypt.

This script should be run once after deploying the security updates.
"""

import sqlite3
import hashlib
from passlib.context import CryptContext
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("password_migration")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# SHA-256 hashing function (old method)
def old_hash_password(password: str) -> str:
    """Hash a password using SHA-256 (old method)."""
    return hashlib.sha256(password.encode()).hexdigest()

def is_sha256_hash(hash_value: str) -> bool:
    """Check if a hash is likely a SHA-256 hash."""
    # SHA-256 hashes are 64 characters of hex
    return len(hash_value) == 64 and all(c in "0123456789abcdef" for c in hash_value.lower())

def migrate_password_hashes():
    """
    Migrate all user password hashes from SHA-256 to bcrypt.
    
    Note: Since we don't have the original plaintext passwords,
    this script can only mark which accounts need password resets.
    """
    logger.info("Starting password hash migration...")
    
    conn = None
    try:
        # Connect to the database
        conn = sqlite3.connect("pim.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if we need to add a 'needs_password_reset' column
        cursor.execute("PRAGMA table_info(users)")
        columns = [col['name'] for col in cursor.fetchall()]
        
        if 'needs_password_reset' not in columns:
            logger.info("Adding 'needs_password_reset' column to users table")
            cursor.execute("ALTER TABLE users ADD COLUMN needs_password_reset INTEGER DEFAULT 0")
        
        # Get all users
        cursor.execute("SELECT username, password FROM users")
        users = cursor.fetchall()
        
        # Track migration statistics
        total_users = len(users)
        marked_for_reset = 0
        
        logger.info(f"Found {total_users} users to process")
        
        for user in users:
            username = user['username']
            password_hash = user['password']
            
            if is_sha256_hash(password_hash):
                # This is an old SHA-256 hash - mark for password reset
                logger.info(f"User '{username}' has SHA-256 hash, marking for password reset")
                cursor.execute(
                    "UPDATE users SET needs_password_reset = 1 WHERE username = ?",
                    (username,)
                )
                marked_for_reset += 1
            elif not pwd_context.identify(password_hash):
                # Not a recognized bcrypt hash either - mark for reset
                logger.info(f"User '{username}' has unknown hash format, marking for password reset")
                cursor.execute(
                    "UPDATE users SET needs_password_reset = 1 WHERE username = ?",
                    (username,)
                )
                marked_for_reset += 1
            else:
                logger.info(f"User '{username}' already has modern password hash")
        
        # Commit changes
        conn.commit()
        
        logger.info(f"Migration complete: {marked_for_reset} of {total_users} users marked for password reset")
        
    except Exception as e:
        logger.error(f"Error during migration: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()
    
    return True

if __name__ == "__main__":
    success = migrate_password_hashes()
    sys.exit(0 if success else 1)
