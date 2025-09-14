/**
 * Authentication and session management module.
 * Handles token storage, validation, and user session management.
 */

/**
 * Authentication manager class for handling user sessions and tokens
 */
class AuthManager {
  constructor() {
    this.tokenKey = 'pimToken';
    this.tokenTimeKey = 'pimTokenTime';
    this.userKey = 'pimUser';
    this.tokenExpirationMs = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Retrieve the authentication token from browser's localStorage
   * @returns {string|null} The stored token or null if not found
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Store the authentication token in browser's localStorage
   * @param {string} token - JWT token received from server after successful login
   */
  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.tokenTimeKey, Date.now().toString());
  }

  /**
   * Check if the stored token is expired (24 hour limit)
   * @returns {boolean} - True if token is expired or missing
   */
  isTokenExpired() {
    const tokenTime = localStorage.getItem(this.tokenTimeKey);
    if (!tokenTime) return true;
    
    const tokenAge = Date.now() - parseInt(tokenTime);
    return tokenAge > this.tokenExpirationMs;
  }

  /**
   * Remove the authentication token from localStorage (used during logout)
   */
  clearToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenTimeKey);
  }

  /**
   * Retrieve the current username from localStorage
   * @returns {string|null} The stored username or null if not logged in
   */
  getUser() {
    return localStorage.getItem(this.userKey);
  }

  /**
   * Store the username in localStorage after successful login
   * @param {string} username - The user's username
   */
  setUser(username) {
    localStorage.setItem(this.userKey, username);
  }

  /**
   * Remove the username from localStorage (used during logout)
   */
  clearUser() {
    localStorage.removeItem(this.userKey);
  }

  /**
   * Clear all authentication data and redirect to login
   */
  logout() {
    this.clearToken();
    this.clearUser();
    window.location.href = 'index.html';
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean} True if user has valid token and session
   */
  isAuthenticated() {
    return this.getToken() && !this.isTokenExpired();
  }

  /**
   * Ensure user is authenticated, redirect to login if not
   * @returns {boolean} True if authenticated, false if redirected
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      alert('Please log in to access this page.');
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
}

// Create singleton instance
const authManager = new AuthManager();

// Export for use in other modules
window.AuthManager = authManager;