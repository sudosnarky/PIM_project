/**
 * Module loader for the PIM System.
 * Loads all JavaScript modules in the correct order.
 */

(function() {
  'use strict';

  const modules = [
    '/static/js/modules/security.js',
    '/static/js/modules/auth.js',
    '/static/js/modules/api.js',
    '/static/js/modules/markdown.js',
    '/static/js/modules/auth-controller.js',
    '/static/js/modules/dashboard.js',
    '/static/js/modules/edit-controller.js',
    '/static/js/modules/view-controller.js',
    '/static/js/app-modular.js'
  ];

  let loadedModules = 0;
  const totalModules = modules.length;

  /**
   * Load a single module
   * @param {string} src - Module source URL
   * @returns {Promise} Promise that resolves when module is loaded
   */
  function loadModule(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      // Add cache busting parameter
      const cacheBuster = Date.now();
      script.src = src + '?v=' + cacheBuster;
      script.defer = true;
      
      script.onload = () => {
        loadedModules++;
        console.log(`Loaded module: ${src} (${loadedModules}/${totalModules})`);
        resolve();
      };
      
      script.onerror = () => {
        console.error(`Failed to load module: ${src}`);
        reject(new Error(`Failed to load module: ${src}`));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Load all modules in sequence
   */
  async function loadAllModules() {
    try {
      // Show loading indicator
      showLoadingIndicator();
      
      // Load modules sequentially to ensure dependencies are available
      for (const module of modules) {
        await loadModule(module);
      }
      
      console.log('All modules loaded successfully!');
      hideLoadingIndicator();
      
      // Dispatch event to signal all modules are loaded
      document.dispatchEvent(new CustomEvent('pim:modules-loaded'));
      
    } catch (error) {
      console.error('Failed to load modules:', error);
      hideLoadingIndicator();
      showErrorMessage('Failed to load application modules. Please refresh the page.');
    }
  }

  /**
   * Show loading indicator
   */
  function showLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'module-loader';
    indicator.style.position = 'fixed';
    indicator.style.top = '0';
    indicator.style.left = '0';
    indicator.style.right = '0';
    indicator.style.backgroundColor = '#007bff';
    indicator.style.color = 'white';
    indicator.style.padding = '5px 10px';
    indicator.style.textAlign = 'center';
    indicator.style.fontSize = '12px';
    indicator.style.zIndex = '10000';
    indicator.innerHTML = 'Loading application modules...';
    
    document.body.appendChild(indicator);
  }

  /**
   * Hide loading indicator
   */
  function hideLoadingIndicator() {
    const indicator = document.getElementById('module-loader');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.right = '0';
    errorDiv.style.backgroundColor = '#dc3545';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '10px';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.zIndex = '10000';
    errorDiv.innerHTML = message + ' <button onclick="location.reload()" style="margin-left:10px;padding:2px 8px;background:white;color:#dc3545;border:none;border-radius:3px;cursor:pointer;">Refresh</button>';
    
    document.body.appendChild(errorDiv);
  }

  // Start loading modules when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllModules);
  } else {
    loadAllModules();
  }

})();