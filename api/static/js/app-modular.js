/**
 * Main application entry point.
 * Coordinates all modules and handles global initialization.
 */

/**
 * Main application class that coordinates all modules
 */
class PIMApp {
  constructor() {
    this.version = '2.0.0';
    this.initialized = false;
    
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
      } else {
        this.onDOMReady();
      }
    } catch (error) {
      console.error('Failed to initialize PIM App:', error);
    }
  }

  /**
   * Called when DOM is ready
   */
  onDOMReady() {
    this.setupGlobalErrorHandling();
    this.setupGlobalKeyboardShortcuts();
    this.initializeCurrentPage();
    this.initialized = true;
    
    console.log(`PIM System v${this.version} initialized successfully`);
  }

  /**
   * Set up global error handling
   */
  setupGlobalErrorHandling() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.showGlobalError('An unexpected error occurred. Please refresh the page.');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showGlobalError('A network or processing error occurred. Please try again.');
    });

    // Handle network errors
    window.addEventListener('offline', () => {
      this.showGlobalError('You are currently offline. Some features may not work properly.');
    });

    window.addEventListener('online', () => {
      this.hideGlobalError();
      this.showGlobalMessage('Connection restored!', 'success');
    });
  }

  /**
   * Set up global keyboard shortcuts that work across all pages
   */
  setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + / for help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this.showHelpModal();
      }

      // Alt + H for home/dashboard
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        if (window.AuthManager && window.AuthManager.isAuthenticated()) {
          window.location.href = 'dashboard.html';
        } else {
          window.location.href = 'index.html';
        }
      }

      // Alt + L for logout
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        if (window.AuthManager && window.AuthManager.isAuthenticated()) {
          if (confirm('Are you sure you want to logout?')) {
            window.AuthManager.logout();
          }
        }
      }
    });
  }

  /**
   * Initialize the current page based on pathname
   */
  initializeCurrentPage() {
    const pathname = location.pathname;
    
    // Set up page-specific functionality
    if (pathname.endsWith('index.html') || pathname === '/') {
      this.initAuthPage();
    } else if (pathname.endsWith('dashboard.html')) {
      this.initDashboardPage();
    } else if (pathname.endsWith('edit.html')) {
      this.initEditPage();
    } else if (pathname.endsWith('view.html')) {
      this.initViewPage();
    }

    // Add page-specific CSS classes
    document.body.className = this.getPageClass(pathname);
  }

  /**
   * Get CSS class for current page
   * @param {string} pathname - Current pathname
   * @returns {string} CSS class name
   */
  getPageClass(pathname) {
    if (pathname.endsWith('index.html') || pathname === '/') {
      return 'page-auth';
    } else if (pathname.endsWith('dashboard.html')) {
      return 'page-dashboard';
    } else if (pathname.endsWith('edit.html')) {
      return 'page-edit';
    } else if (pathname.endsWith('view.html')) {
      return 'page-view';
    }
    return 'page-default';
  }

  /**
   * Initialize authentication page
   */
  initAuthPage() {
    // AuthController is initialized in its own file
    console.log('Auth page initialized');
  }

  /**
   * Initialize dashboard page
   */
  initDashboardPage() {
    // Ensure user is authenticated
    if (!window.AuthManager || !window.AuthManager.requireAuth()) {
      return;
    }
    
    // Initialize DashboardController
    console.log('Dashboard page initialized, creating DashboardController...');
    console.log('DashboardController class available:', typeof DashboardController);
    console.log('window.DashboardController available:', typeof window.DashboardController);
    
    try {
      if (!window.dashboardController) {
        console.log('Creating new DashboardController instance...');
        window.dashboardController = new DashboardController();
        console.log('DashboardController created successfully:', window.dashboardController);
      } else {
        console.log('DashboardController already exists:', window.dashboardController);
      }
    } catch (error) {
      console.error('Error creating DashboardController:', error);
    }
  }

  /**
   * Initialize edit page
   */
  initEditPage() {
    console.log('UPDATED Edit page initialized, checking authentication... (timestamp:', Date.now(), ')');
    console.log('AuthManager available:', !!window.AuthManager);
    
    // Ensure user is authenticated
    if (!window.AuthManager) {
      console.log('AuthManager not available, skipping authentication check');
    } else {
      console.log('AuthManager available, checking requireAuth...');
      const authResult = window.AuthManager.requireAuth();
      console.log('requireAuth result:', authResult);
      if (!authResult) {
        console.log('Authentication failed, returning early');
        return;
      }
    }
    
    // Initialize EditController
    console.log('Authentication passed, creating EditController...');
    console.log('EditController class available:', typeof EditController);
    console.log('window.EditController available:', typeof window.EditController);
    
    try {
      if (!window.editController) {
        console.log('Creating new EditController instance...');
        window.editController = new EditController();
        console.log('EditController created successfully:', window.editController);
      } else {
        console.log('EditController already exists:', window.editController);
      }
    } catch (error) {
      console.error('Error creating EditController:', error);
    }
  }

  /**
   * Initialize view page
   */
  initViewPage() {
    // Ensure user is authenticated
    if (!window.AuthManager || !window.AuthManager.requireAuth()) {
      return;
    }
    
    // ViewController is initialized in its own file
    console.log('View page initialized');
  }

  /**
   * Show global error message
   * @param {string} message - Error message to display
   */
  showGlobalError(message) {
    this.showGlobalMessage(message, 'error');
  }

  /**
   * Show global message
   * @param {string} message - Message to display
   * @param {string} type - Message type ('error', 'success', 'info', 'warning')
   */
  showGlobalMessage(message, type = 'info') {
    // Remove existing message
    this.hideGlobalError();

    const messageElement = document.createElement('div');
    messageElement.id = 'global-message';
    messageElement.className = `global-message message-${type}`;
    messageElement.textContent = message;
    
    // Style the message
    messageElement.style.position = 'fixed';
    messageElement.style.top = '0';
    messageElement.style.left = '0';
    messageElement.style.right = '0';
    messageElement.style.padding = '10px 15px';
    messageElement.style.textAlign = 'center';
    messageElement.style.zIndex = '10000';
    messageElement.style.fontSize = '14px';
    messageElement.style.fontWeight = 'bold';
    
    // Set colors based on type
    switch (type) {
      case 'error':
        messageElement.style.backgroundColor = '#f44336';
        messageElement.style.color = 'white';
        break;
      case 'success':
        messageElement.style.backgroundColor = '#4CAF50';
        messageElement.style.color = 'white';
        break;
      case 'warning':
        messageElement.style.backgroundColor = '#FF9800';
        messageElement.style.color = 'white';
        break;
      default:
        messageElement.style.backgroundColor = '#2196F3';
        messageElement.style.color = 'white';
    }
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'inherit';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '10px';
    closeBtn.onclick = () => this.hideGlobalError();
    
    messageElement.appendChild(closeBtn);
    document.body.appendChild(messageElement);
    
    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => this.hideGlobalError(), 5000);
    }
  }

  /**
   * Hide global error/message
   */
  hideGlobalError() {
    const existing = document.getElementById('global-message');
    if (existing) {
      existing.remove();
    }
  }

  /**
   * Show help modal with keyboard shortcuts
   */
  showHelpModal() {
    // Remove existing modal
    const existing = document.querySelector('.help-modal');
    if (existing) {
      existing.remove();
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'help-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    const modalContent = document.createElement('div');
    modalContent.style.background = '#fff';
    modalContent.style.padding = '2em';
    modalContent.style.borderRadius = '10px';
    modalContent.style.maxWidth = '500px';
    modalContent.style.width = '90vw';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'auto';

    modalContent.innerHTML = `
      <div class="help-content">
        <h2>Keyboard Shortcuts</h2>
        <div class="shortcuts-list" style="margin: 20px 0;">
          <div class="shortcut-group">
            <h3>Global</h3>
            <p><kbd>Ctrl/Cmd</kbd> + <kbd>/</kbd> - Show this help</p>
            <p><kbd>Alt</kbd> + <kbd>H</kbd> - Go to Dashboard</p>
            <p><kbd>Alt</kbd> + <kbd>L</kbd> - Logout</p>
          </div>
          
          <div class="shortcut-group">
            <h3>Edit Page</h3>
            <p><kbd>Ctrl/Cmd</kbd> + <kbd>S</kbd> - Save</p>
            <p><kbd>Ctrl/Cmd</kbd> + <kbd>P</kbd> - Toggle Preview</p>
            <p><kbd>Escape</kbd> - Cancel</p>
          </div>
          
          <div class="shortcut-group">
            <h3>View Page</h3>
            <p><kbd>E</kbd> - Edit current particle</p>
            <p><kbd>Escape</kbd> - Back to Dashboard</p>
            <p><kbd>Ctrl/Cmd</kbd> + <kbd>Delete</kbd> - Delete particle</p>
          </div>
        </div>
        
        <div class="app-info" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <h3>About PIM System</h3>
          <p>Version: ${this.version}</p>
          <p>Personal Information Management System using the PARA method</p>
        </div>
        
        <button id="close-help" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close button
    modalContent.querySelector('#close-help').onclick = () => modal.remove();
    
    // Close when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close with Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Get application information
   * @returns {Object} App info
   */
  getAppInfo() {
    return {
      version: this.version,
      initialized: this.initialized,
      modules: {
        auth: !!window.AuthManager,
        api: !!window.ApiService,
        security: !!window.SecurityUtils,
        markdown: !!window.MarkdownProcessor
      }
    };
  }
}

// Initialize the application
const pimApp = new PIMApp();

// Make app available globally for debugging
window.PIMApp = pimApp;