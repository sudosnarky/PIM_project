/**
 * Authentication page controller.
 * Manages login and registration forms on the index.html page.
 */

/**
 * Authentication controller class for login and registration
 */
class AuthController {
  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.checkExistingSession();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.loginBox = document.getElementById('login-box');
    this.registerBox = document.getElementById('register-box');
    this.loginBtn = document.getElementById('login-btn');
    this.registerBtn = document.getElementById('register-btn');
    this.showRegister = document.getElementById('show-register');
    this.showLogin = document.getElementById('show-login');
    
    // Login form fields
    this.loginUsername = document.getElementById('login-username');
    this.loginPassword = document.getElementById('login-password');
    
    // Registration form fields
    this.registerUsername = document.getElementById('register-username');
    this.registerPassword = document.getElementById('register-password');
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Toggle between login and register forms
    if (this.showRegister && this.showLogin && this.loginBox && this.registerBox) {
      this.showRegister.onclick = (e) => {
        e.preventDefault();
        this.showRegistrationForm();
      };
      
      this.showLogin.onclick = (e) => {
        e.preventDefault();
        this.showLoginForm();
      };
    }

    // Login button
    if (this.loginBtn) {
      this.loginBtn.onclick = (e) => {
        e.preventDefault();
        this.handleLogin();
      };
    }

    // Registration button
    if (this.registerBtn) {
      this.registerBtn.onclick = (e) => {
        e.preventDefault();
        this.handleRegistration();
      };
    }

    // Enter key handling for forms
    if (this.loginPassword) {
      this.loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleLogin();
        }
      });
    }

    if (this.registerPassword) {
      this.registerPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleRegistration();
        }
      });
    }
  }

  /**
   * Check if user is already logged in and redirect if so
   */
  checkExistingSession() {
    if (window.AuthManager.isAuthenticated()) {
      // User is already logged in, redirect to dashboard
      window.location.href = 'dashboard.html';
    }
  }

  /**
   * Show the registration form and hide the login form
   */
  showRegistrationForm() {
    if (this.loginBox && this.registerBox) {
      this.loginBox.style.display = 'none';
      this.registerBox.style.display = '';
      
      // Focus on username field
      if (this.registerUsername) {
        this.registerUsername.focus();
      }
    }
  }

  /**
   * Show the login form and hide the registration form
   */
  showLoginForm() {
    if (this.registerBox && this.loginBox) {
      this.registerBox.style.display = 'none';
      this.loginBox.style.display = '';
      
      // Focus on username field
      if (this.loginUsername) {
        this.loginUsername.focus();
      }
    }
  }

  /**
   * Handle login form submission
   */
  async handleLogin() {
    if (!this.loginUsername || !this.loginPassword) return;
    
    const username = this.loginUsername.value.trim();
    const password = this.loginPassword.value.trim();

    // Validate inputs
    if (!window.SecurityUtils.validateUsername(username)) {
      this.loginUsername.focus();
      return;
    }

    if (!window.SecurityUtils.validatePassword(password)) {
      this.loginPassword.focus();
      return;
    }

    // Disable form during login attempt
    this.setLoginFormEnabled(false);

    try {
      await window.ApiService.login(username, password);
      
      // Check if this is the user's first login
      if (!localStorage.getItem('onboarded')) {
        localStorage.setItem('onboarded', '1');
        window.location.href = 'onboarding.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } catch (err) {
      console.error('Login failed:', err);
      alert('Login failed: ' + err.message);
      
      // Clear password field on failure
      this.loginPassword.value = '';
      this.loginPassword.focus();
    } finally {
      this.setLoginFormEnabled(true);
    }
  }

  /**
   * Handle registration form submission
   */
  async handleRegistration() {
    if (!this.registerUsername || !this.registerPassword) return;
    
    const username = this.registerUsername.value.trim();
    const password = this.registerPassword.value.trim();

    // Validate inputs
    if (!window.SecurityUtils.validateUsername(username)) {
      this.registerUsername.focus();
      return;
    }

    if (!window.SecurityUtils.validatePassword(password)) {
      this.registerPassword.focus();
      return;
    }

    // Additional password strength validation for registration
    if (!this.validatePasswordStrength(password)) {
      this.registerPassword.focus();
      return;
    }

    // Disable form during registration attempt
    this.setRegisterFormEnabled(false);

    try {
      await window.ApiService.register(username, password);
      
      // Auto-login after successful registration
      await window.ApiService.login(username, password);
      
      // Mark user as having seen onboarding
      localStorage.setItem('onboarded', '1');
      window.location.href = 'onboarding.html';
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Registration failed: ' + err.message);
      
      // Clear password field on failure
      this.registerPassword.value = '';
      this.registerPassword.focus();
    } finally {
      this.setRegisterFormEnabled(true);
    }
  }

  /**
   * Validate password strength for registration
   * @param {string} password - Password to validate
   * @returns {boolean} - True if password meets strength requirements
   */
  validatePasswordStrength(password) {
    if (password.length < 8) {
      alert('Password should be at least 8 characters long for better security.');
      return false;
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'password123', 'admin', 'user'];
    if (commonPasswords.includes(password.toLowerCase())) {
      alert('Please choose a stronger password.');
      return false;
    }

    return true;
  }

  /**
   * Enable or disable the login form
   * @param {boolean} enabled - Whether the form should be enabled
   */
  setLoginFormEnabled(enabled) {
    if (this.loginUsername) this.loginUsername.disabled = !enabled;
    if (this.loginPassword) this.loginPassword.disabled = !enabled;
    if (this.loginBtn) {
      this.loginBtn.disabled = !enabled;
      this.loginBtn.textContent = enabled ? 'Login' : 'Logging in...';
    }
  }

  /**
   * Enable or disable the registration form
   * @param {boolean} enabled - Whether the form should be enabled
   */
  setRegisterFormEnabled(enabled) {
    if (this.registerUsername) this.registerUsername.disabled = !enabled;
    if (this.registerPassword) this.registerPassword.disabled = !enabled;
    if (this.registerBtn) {
      this.registerBtn.disabled = !enabled;
      this.registerBtn.textContent = enabled ? 'Register' : 'Registering...';
    }
  }

  /**
   * Clear all form fields
   */
  clearForms() {
    if (this.loginUsername) this.loginUsername.value = '';
    if (this.loginPassword) this.loginPassword.value = '';
    if (this.registerUsername) this.registerUsername.value = '';
    if (this.registerPassword) this.registerPassword.value = '';
  }

  /**
   * Show form validation error
   * @param {string} message - Error message to display
   * @param {HTMLElement} field - Field to focus on
   */
  showError(message, field = null) {
    alert(message);
    if (field) {
      field.focus();
    }
  }
}

// Initialize auth controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.endsWith('index.html')) {
    window.authController = new AuthController();
  }
});