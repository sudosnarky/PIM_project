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
      ? 'https://pim-project-qgyu.onrender.com/api/v1'
      : window.location.origin + '/api/v1';
    
    console.log('API baseUrl set to:', this.baseUrl);
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
      alert('Your session has expired or is invalid. Please log in again to continue.');
      window.location.href = 'index.html';
      throw new Error('Authentication failed: Token expired or invalid');
    }
    
    // Handle other HTTP errors
    if (!res.ok) {
      let msg = `Request failed with status ${res.status}`;
      try { 
        const errorData = await res.json();
        msg = errorData.detail || `Server error: ${res.status} ${res.statusText}`; 
      } catch (parseError) {
        // If we can't parse the error response, provide more detail
        msg = `Network error: ${res.status} ${res.statusText}. Unable to parse error response.`;
      }
      throw new Error(`API Error: ${msg}`);
    }
    
    // Parse and return successful response as JSON
    return res.json();
  }

  /**
   * User authentication methods
   */
  async login(email, password) {
    console.log('ApiService.login called with:', email);
    console.log('Using baseUrl:', this.baseUrl);
    
    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: email,
        password: password,
      }),
    });
    
    console.log('Login API response status:', response.status);
    console.log('Login API response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Login successful, token received:', !!data.access_token);
      return data;
    } else {
      const errorText = await response.text();
      console.error('Login failed - Status:', response.status, 'Error:', errorText);
      throw new Error(`Login failed: ${response.status} - ${errorText}`);
    }
  }

  async register(email, username, password) {
    const response = await fetch(`${this.baseUrl}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        username: username,
        password: password,
      }),
    });
    
    console.log('Register API response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Registration successful');
      return data;
    } else {
      const errorText = await response.text();
      console.error('Registration failed:', response.status, errorText);
      throw new Error(`Registration failed: ${response.status}`);
    }
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