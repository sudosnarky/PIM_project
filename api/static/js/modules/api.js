/**
 * API communication module.
 * Handles all HTTP requests to the backend API with authentication and error handling.
 */

/**
 * API service class for backend communication
 */
class ApiService {
  constructor() {
    // Dynamically determine API base URL
    this.baseUrl = window.location.hostname.includes('render.com') 
      ? 'https://pim-project-qgyu.onrender.com'
      : window.location.origin.replace(/\/static.*/, '');
  }

  /**
   * Makes authenticated HTTP requests to the backend API
   * Automatically handles token authentication, JSON formatting, and error responses
   * @param {string} path - API endpoint path (e.g., '/particles', '/login')
   * @param {object} opts - Fetch options (method, body, headers, etc.)
   * @returns {Promise<any>} - Parsed JSON response from server
   */
  async fetch(path, opts = {}) {
    // Check for token expiration before making request
    if (window.AuthManager.getToken() && window.AuthManager.isTokenExpired()) {
      window.AuthManager.clearToken();
      window.AuthManager.clearUser();
      alert('Your session has expired. Please log in again.');
      window.location.href = 'index.html';
      throw new Error('Token expired');
    }
    
    // Initialize headers object if not provided
    opts.headers = opts.headers || {};
    
    // Add authentication token to request headers if user is logged in
    if (window.AuthManager.getToken()) {
      opts.headers['Authorization'] = 'Bearer ' + window.AuthManager.getToken();
    }
    
    // Set content type to JSON for non-form data requests
    if (!opts.headers['Content-Type'] && !(opts.body instanceof FormData)) {
      opts.headers['Content-Type'] = 'application/json';
    }
    
    // Convert JavaScript objects to JSON strings for the request body
    if (opts.body && typeof opts.body !== 'string' && !(opts.body instanceof FormData)) {
      opts.body = JSON.stringify(opts.body);
    }
    
    // Send the HTTP request to the server
    const res = await fetch(this.baseUrl + path, opts);
    
    // Handle authentication errors (invalid/expired token)
    if (res.status === 401) {
      window.AuthManager.clearToken();
      window.AuthManager.clearUser();
      alert('Session expired. Please log in again.');
      window.location.href = 'index.html';
      throw new Error('Unauthorized');
    }
    
    // Handle other HTTP errors
    if (!res.ok) {
      let msg = 'API error';
      try { 
        const errorData = await res.json();
        msg = errorData.detail || msg; 
      } catch (parseError) {
        // If we can't parse the error response, use generic message
      }
      throw new Error(`${msg} (Status: ${res.status})`);
    }
    
    // Parse and return successful response as JSON
    return res.json();
  }

  /**
   * User authentication methods
   */
  async login(username, password) {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    
    const res = await fetch(this.baseUrl + '/token', { 
      method: 'POST', 
      body: form 
    });
    
    if (!res.ok) throw new Error('Login failed');
    
    const data = await res.json();
    window.AuthManager.setToken(data.access_token);
    window.AuthManager.setUser(username);
    
    return data;
  }

  async register(username, password) {
    return this.fetch('/register', {
      method: 'POST',
      body: { username, password }
    });
  }

  async logout() {
    try {
      await this.fetch('/logout', { method: 'POST' });
    } finally {
      window.AuthManager.logout();
    }
  }

  /**
   * Particle (notes) API methods
   */
  async getParticles(section = null, searchQuery = null, limit = null, offset = null) {
    let url = '/particles';
    const params = new URLSearchParams();
    
    if (section) params.append('section', section);
    if (searchQuery) params.append('q', searchQuery);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    return this.fetch(url);
  }

  async getParticle(id) {
    return this.fetch(`/particles/${id}`);
  }

  async createParticle(particleData) {
    return this.fetch('/particles', {
      method: 'POST',
      body: particleData
    });
  }

  async updateParticle(id, particleData) {
    return this.fetch(`/particles/${id}`, {
      method: 'PUT',
      body: particleData
    });
  }

  async deleteParticle(id) {
    return this.fetch(`/particles/${id}`, {
      method: 'DELETE'
    });
  }

  async getParticleStats() {
    return this.fetch('/particles/stats/summary');
  }

  /**
   * User API methods
   */
  async getCurrentUser() {
    return this.fetch('/users/me');
  }
}

// Create singleton instance
const apiService = new ApiService();

// Export for use in other modules
window.ApiService = apiService;