/**
 * Security and validation utilities module.
 * Provides input validation, sanitization, and security functions.
 */

/**
 * Security utilities class for input validation and sanitization
 */
class SecurityUtils {
  /**
   * Escape HTML characters to prevent XSS attacks
   * @param {string} unsafe - User input that may contain malicious HTML
   * @returns {string} - Safe HTML-escaped text
   */
  static escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Validate input length to prevent excessive data
   * @param {string} input - Input to validate
   * @param {number} maxLength - Maximum allowed length
   * @param {string} fieldName - Name of field for error messages
   * @returns {boolean} - True if valid, false otherwise
   */
  static validateLength(input, maxLength, fieldName) {
    if (input.length > maxLength) {
      alert(`${fieldName} must be under ${maxLength} characters (currently ${input.length})`);
      return false;
    }
    return true;
  }

  /**
   * Validate required field is not empty
   * @param {string} input - Input to validate
   * @param {string} fieldName - Name of field for error messages
   * @returns {boolean} - True if valid, false otherwise
   */
  static validateRequired(input, fieldName) {
    if (!input || input.trim().length === 0) {
      alert(`${fieldName} is required.`);
      return false;
    }
    return true;
  }

  /**
   * Validate username format and requirements
   * @param {string} username - Username to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  static validateUsername(username) {
    if (!this.validateRequired(username, 'Username')) return false;
    if (!this.validateLength(username, 50, 'Username')) return false;
    
    // Check for valid characters (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      alert('Username can only contain letters, numbers, underscores, and hyphens.');
      return false;
    }
    
    if (username.length < 3) {
      alert('Username must be at least 3 characters long.');
      return false;
    }
    
    return true;
  }

  /**
   * Validate password strength and requirements
   * @param {string} password - Password to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  static validatePassword(password) {
    if (!this.validateRequired(password, 'Password')) return false;
    if (!this.validateLength(password, 100, 'Password')) return false;
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return false;
    }
    
    return true;
  }

  /**
   * Validate and sanitize tag input
   * @param {string} tagString - Comma-separated tag string
   * @returns {string[]} - Array of valid, sanitized tags
   */
  static validateTags(tagString) {
    if (!tagString) return [];
    
    return tagString
      .split(',')
      .map(t => t.trim())
      .filter(t => {
        // Only allow alphanumeric, hyphens, and underscores
        return t && /^[a-zA-Z0-9_-]+$/.test(t) && t.length <= 50;
      })
      .filter((t, i, arr) => arr.indexOf(t) === i) // Remove duplicates
      .slice(0, 10); // Limit to 10 tags max
  }

  /**
   * Validate particle/note title
   * @param {string} title - Title to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  static validateTitle(title) {
    if (!this.validateRequired(title, 'Title')) return false;
    if (!this.validateLength(title, 255, 'Title')) return false;
    return true;
  }

  /**
   * Validate particle/note content
   * @param {string} content - Content to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  static validateContent(content) {
    if (!this.validateRequired(content, 'Content')) return false;
    if (!this.validateLength(content, 10000, 'Content')) return false;
    return true;
  }

  /**
   * Sanitize URL to ensure it's safe for links
   * @param {string} url - URL to sanitize
   * @returns {string} - Sanitized URL or empty string if invalid
   */
  static sanitizeUrl(url) {
    if (typeof url !== 'string') return '';
    
    // Only allow http and https URLs
    const urlPattern = /^https?:\/\/[^\s)]+$/i;
    if (!urlPattern.test(url)) return '';
    
    return url;
  }

  /**
   * Validate email format (basic validation)
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid format
   */
  static validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }
}

// Export for use in other modules
window.SecurityUtils = SecurityUtils;