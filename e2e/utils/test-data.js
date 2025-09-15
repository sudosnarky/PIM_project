/**
 * Test data utilities and factories
 * Provides test data generation and management
 */

/**
 * Generate random test data
 */
export class TestDataFactory {
  /**
   * Generate a random username
   */
  static generateUsername(prefix = 'testuser') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Generate a random password
   */
  static generatePassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Generate test user credentials
   */
  static generateUser() {
    return {
      username: this.generateUsername(),
      password: this.generatePassword()
    };
  }

  /**
   * Generate test note data
   */
  static generateNote(category = 'Projects') {
    const titles = [
      'Weekly Planning Session',
      'Project Documentation Review',
      'Team Meeting Notes',
      'Research Findings',
      'Task Management Ideas'
    ];
    
    const contents = [
      'This is a test note for validating the PARA system functionality.',
      '## Important Points\n\n- Point 1\n- Point 2\n- Point 3',
      'Meeting with team to discuss project progress and next steps.',
      '### Research Summary\n\nKey findings from today\'s research session.',
      'Action items and follow-ups from the planning session.'
    ];

    return {
      title: titles[Math.floor(Math.random() * titles.length)] + ` ${Date.now()}`,
      content: contents[Math.floor(Math.random() * contents.length)],
      category: category,
      tags: ['test', 'e2e', 'automation']
    };
  }

  /**
   * Generate multiple test notes
   */
  static generateNotes(count = 5) {
    const categories = ['Projects', 'Areas', 'Resources', 'Archives'];
    const notes = [];
    
    for (let i = 0; i < count; i++) {
      const category = categories[i % categories.length];
      notes.push(this.generateNote(category));
    }
    
    return notes;
  }
}

/**
 * Test environment constants
 */
export const TEST_CONSTANTS = {
  // Default test user (should exist in test database)
  DEFAULT_USER: {
    username: 'testuser',
    password: 'testpass123'
  },
  
  // Invalid credentials for negative testing
  INVALID_USER: {
    username: 'nonexistent',
    password: 'wrongpassword'
  },
  
  // Test timeouts
  TIMEOUTS: {
    SHORT: 5000,
    MEDIUM: 10000,
    LONG: 30000
  },
  
  // PARA categories
  PARA_CATEGORIES: {
    PROJECTS: 'Projects',
    AREAS: 'Areas', 
    RESOURCES: 'Resources',
    ARCHIVES: 'Archives'
  }
};

/**
 * Database helper for test data management
 */
export class TestDatabaseHelper {
  /**
   * Clean up test data (placeholder - would connect to actual DB)
   */
  static async cleanupTestData() {
    // In a real implementation, this would:
    // 1. Connect to the test database
    // 2. Delete test users and their data
    // 3. Reset any test-specific state
    console.log('Cleaning up test database...');
  }

  /**
   * Create test user (placeholder)
   */
  static async createTestUser(userData) {
    // In a real implementation, this would:
    // 1. Connect to the database
    // 2. Create the user if it doesn't exist
    // 3. Return the user data
    console.log('Creating test user:', userData.username);
    return userData;
  }

  /**
   * Create test notes for a user (placeholder)
   */
  static async createTestNotes(username, notes) {
    console.log(`Creating ${notes.length} test notes for user: ${username}`);
    return notes;
  }
}