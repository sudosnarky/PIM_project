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
    console.log('AuthManager.logout() called - clearing authentication...');
    console.log('Current token before logout:', this.getToken());
    console.log('Current user before logout:', this.getUser());
    
    this.clearToken();
    this.clearUser();
    
    console.log('Token after clearing:', this.getToken());
    console.log('User after clearing:', this.getUser());
    console.log('Authentication cleared, redirecting to login page...');
    
    // Force redirect to login page
    window.location.replace('/static/html/index.html');
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
      const isTokenExpired = this.isTokenExpired();
      const hasToken = this.getToken();
      
      let message = 'Please log in to access this page.';
      if (hasToken && isTokenExpired) {
        message = 'Your session has expired. Please log in again to continue.';
        this.clearToken();
        this.clearUser();
      } else if (!hasToken) {
        message = 'Access denied. Please log in to view this page.';
      }
      
      alert(message);
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