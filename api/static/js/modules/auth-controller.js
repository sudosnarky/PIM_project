/**
 * Authentication page controller.
 * Manages login and registration forms on the index.html page.
 */

/**
 * Authentication controller class for login and registration
 */
class AuthController {
  constructor() {
    console.log('AuthController constructor called');
    this.initializeElements();
    this.setupEventListeners();
    // Allow users to manually log in/out rather than auto-redirecting
    // this.checkExistingSession();
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
    this.registerEmail = document.getElementById('register-email');
    this.registerUsername = document.getElementById('register-username');
    this.registerPassword = document.getElementById('register-password');
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    console.log('Setting up event listeners');
    console.log('Show register element:', this.showRegister);
    console.log('Show login element:', this.showLogin);
    console.log('Login button:', this.loginBtn);
    console.log('Register button:', this.registerBtn);

    // Toggle buttons
    if (this.showRegister) {
      this.showRegister.onclick = (e) => {
        e.preventDefault();
        console.log('Show register clicked');
        this.showRegistrationForm();
      };
    }

    if (this.showLogin) {
      this.showLogin.onclick = (e) => {
        e.preventDefault();
        console.log('Show login clicked');
        this.showLoginForm();
      };
    }

    // Login button
    if (this.loginBtn) {
      console.log('Setting up login button click handler');
      this.loginBtn.onclick = (e) => {
        e.preventDefault();
        console.log('Login button clicked, calling handleLogin...');
        this.handleLogin();
      };
    }

    // Registration button
    if (this.registerBtn) {
      this.registerBtn.onclick = (e) => {
        e.preventDefault();
        console.log('Register button clicked, calling handleRegistration...');
        this.handleRegistration();
      };
    }

    // Enter key handling for forms
    if (this.loginPassword) {
      this.loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('Enter key pressed in login password field');
          this.handleLogin();
        }
      });
    }

    if (this.registerEmail) {
      this.registerEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('Enter key pressed in register email field');
          this.handleRegistration();
        }
      });
    }

    if (this.registerUsername) {
      this.registerUsername.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('Enter key pressed in register username field');
          this.handleRegistration();
        }
      });
    }

    if (this.registerPassword) {
      this.registerPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('Enter key pressed in register password field');
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
    console.log('showRegistrationForm called');
    console.log('loginBox:', this.loginBox);
    console.log('registerBox:', this.registerBox);
    
    // Clear any existing error messages
    const loginError = document.getElementById('login-error');
    if (loginError) {
      loginError.style.display = 'none';
      loginError.textContent = '';
    }
    
    if (this.loginBox && this.registerBox) {
      console.log('Hiding login box and showing register box');
      this.loginBox.style.display = 'none';
      this.registerBox.style.display = '';
      
      // Focus on username field
      if (this.registerUsername) {
        this.registerUsername.focus();
      }
    } else {
      console.error('Cannot toggle forms - missing elements');
    }
  }

  /**
   * Show the login form and hide the registration form
   */
  showLoginForm() {
    console.log('showLoginForm called');
    
    // Clear any existing error messages
    const registerError = document.getElementById('register-error');
    if (registerError) {
      registerError.style.display = 'none';
      registerError.textContent = '';
    }
    
    if (this.registerBox && this.loginBox) {
      console.log('Hiding register box and showing login box');
      this.registerBox.style.display = 'none';
      this.loginBox.style.display = '';
      
      // Focus on username field
      if (this.loginUsername) {
        this.loginUsername.focus();
      }
    } else {
      console.error('Cannot toggle forms - missing elements');
    }
  }

  /**
   * Handle login form submission
   */
  async handleLogin() {
    console.log('handleLogin: Starting login process');
    if (!this.loginUsername || !this.loginPassword) {
      console.error('Login form elements not found');
      return;
    }
    
    const username = this.loginUsername.value.trim();
    const password = this.loginPassword.value.trim();
    
    console.log('Login credentials - Username:', username, 'Password length:', password.length);

    // Basic validation only
    if (!username || !password) {
      console.log('Basic validation failed - empty fields');
      this.loginPassword.focus();
      return;
    }

    // Disable form during login attempt
    this.setLoginFormEnabled(false);

    try {
      console.log('Calling ApiService.login with:', username);
      const loginResult = await window.ApiService.login(username, password);
      console.log('Login API call successful:', loginResult);
      
      // Store the authentication token
      if (loginResult && loginResult.access_token) {
        console.log('Storing authentication token');
        window.AuthManager.setToken(loginResult.access_token);
      } else {
        console.error('Login response missing access_token:', loginResult);
      }
      
      // Check if this is the user's first login
      const isOnboarded = localStorage.getItem('onboarded');
      console.log('Onboarded status:', isOnboarded);
      
      if (!isOnboarded) {
        console.log('User not onboarded, setting flag and redirecting to onboarding');
        localStorage.setItem('onboarded', '1');
        window.location.href = 'onboarding.html';
      } else {
        console.log('User onboarded, redirecting to dashboard');
        window.location.href = 'dashboard.html';
      }
    } catch (err) {
      console.error('Login API call failed:', err);
      console.error('Error type:', typeof err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      // Provide more specific error messaging
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage = 'Invalid username or password. Please double-check your credentials.';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Login request timed out. Please try again.';
      } else if (err.message) {
        errorMessage = 'Login failed: ' + err.message;
      }
      
      // Show error in the error div instead of alert
      const errorDiv = document.getElementById('login-error');
      if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
      } else {
        alert(errorMessage);
      }
      
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
    if (!this.registerEmail || !this.registerUsername || !this.registerPassword) return;
    
    const email = this.registerEmail.value.trim();
    const username = this.registerUsername.value.trim();
    const password = this.registerPassword.value.trim();

    // Validate inputs
    if (!email || !email.includes('@')) {
      this.showError('register-error', 'Please enter a valid email address.', this.registerEmail);
      return;
    }

    if (!window.SecurityUtils.validateUsername(username)) {
      this.showError('register-error', 'Username must be 3-50 characters, letters/numbers only.', this.registerUsername);
      return;
    }

    if (!window.SecurityUtils.validatePassword(password)) {
      this.showError('register-error', 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.', this.registerPassword);
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
      await window.ApiService.register(email, username, password);
      
      // Auto-login after successful registration
      await window.ApiService.login(username, password);
      
      // Mark user as having seen onboarding
      localStorage.setItem('onboarded', '1');
      window.location.href = 'onboarding.html';
    } catch (err) {
      console.error('Registration failed:', err);
      
      // Provide specific error messaging for registration
      let errorMessage = 'Registration failed. Please try again.';
      
      // Try to parse error response for better messaging
      if (err.message.includes('422')) {
        errorMessage = 'This username is already taken. Please choose a different username.';
      } else if (err.message.includes('Username already exists') || err.message.includes('already taken')) {
        errorMessage = 'This username is already taken. Please choose a different username.';
      } else if (err.message.includes('password') && err.message.includes('validation')) {
        errorMessage = 'Password does not meet security requirements. Please choose a stronger password.';
      } else if (err.message.includes('400') || err.message.includes('Bad Request')) {
        errorMessage = 'Invalid registration data. Please check your input and try again.';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = 'Registration failed: ' + err.message;
      }
      
      // Show error in the error div instead of alert
      const errorDiv = document.getElementById('register-error');
      if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
      } else {
        alert(errorMessage);
      }
      
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
    if (this.registerEmail) this.registerEmail.disabled = !enabled;
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
    if (this.registerEmail) this.registerEmail.value = '';
    if (this.registerUsername) this.registerUsername.value = '';
    if (this.registerPassword) this.registerPassword.value = '';
  }

  /**
   * Show form validation error
   * @param {string} errorElementId - ID of error element to show message in
   * @param {string} message - Error message to display
   * @param {HTMLElement} field - Field to focus on
   */
  showError(errorElementId, message, field = null) {
    const errorDiv = document.getElementById(errorElementId);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      // The role="alert" and aria-live="assertive" will announce this to screen readers
    } else {
      // Fallback to alert if error div not found
      alert(message);
    }
    
    if (field) {
      field.focus();
      // Mark field as invalid for screen readers
      field.setAttribute('aria-invalid', 'true');
      
      // Remove invalid state when user starts typing
      const removeInvalid = () => {
        field.setAttribute('aria-invalid', 'false');
        field.removeEventListener('input', removeInvalid);
        // Hide error message when user starts correcting
        if (errorDiv) {
          errorDiv.style.display = 'none';
        }
      };
      field.addEventListener('input', removeInvalid);
    }
  }
}

// Initialize auth controller when DOM is loaded
function initAuthController() {
  console.log('DOM loaded, checking for login page elements...');
  console.log('Current pathname:', location.pathname);
  console.log('login-box element:', document.getElementById('login-box'));
  console.log('register-box element:', document.getElementById('register-box'));
  
  // Check if we're on the login page by looking for the login elements
  if (document.getElementById('login-box') || document.getElementById('register-box')) {
    console.log('Initializing AuthController on login page');
    window.authController = new AuthController();
  } else {
    console.log('Not on login page, AuthController not initialized');
  }
}

// Handle both cases: DOM already loaded or still loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthController);
} else {
  // DOM already loaded
  initAuthController();
}