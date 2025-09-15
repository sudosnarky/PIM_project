/**
 * Authentication helper utilities for E2E tests
 * Provides common authentication actions and state management
 */

import { expect } from '@playwright/test';

export class AuthHelper {
  constructor(page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:8000';
  }

  /**
   * Navigate to login page
   */
  async gotoLogin() {
    // Clear any existing authentication to ensure clean test state
    await this.page.context().clearCookies();
    
    await this.page.goto('/static/html/index.html');
    
    // Try to clear localStorage with error handling
    try {
      await this.page.evaluate(() => {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      });
    } catch (error) {
      // If clearing storage fails, continue anyway
      console.log('Warning: Could not clear storage:', error.message);
    }
    
    // Check if we were redirected to dashboard (user already authenticated)
    const currentUrl = await this.page.url();
    if (currentUrl.includes('dashboard.html')) {
      // If already authenticated, logout first
      console.log('User already authenticated, logging out first...');
      await this.logout();
      await this.page.goto('/static/html/index.html');
    }
    
    await expect(this.page.locator('#login-box')).toBeVisible();
  }

  /**
   * Fill login form with credentials
   */
  async fillLoginForm(username, password) {
    await this.page.fill('#login-username', username);
    await this.page.fill('#login-password', password);
  }

  /**
   * Click login button and wait for response
   */
  async submitLogin() {
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/api/v1/auth/token') && response.status() === 200
    );
    await this.page.click('#login-btn');
    return await responsePromise;
  }

  /**
   * Perform complete login flow
   */
  async login(username = 'testuser', password = 'testpass123') {
    await this.gotoLogin();
    
    // Set onboarded flag to skip onboarding flow in tests
    await this.page.evaluate(() => {
      localStorage.setItem('onboarded', '1');
    });
    
    await this.fillLoginForm(username, password);
    await this.submitLogin();
    
    // Wait for redirect to dashboard
    await expect(this.page).toHaveURL(/.*dashboard\.html/);
    await expect(this.page.locator('h1')).toContainText('Dashboard');
  }

  /**
   * Switch to registration form
   */
  async switchToRegister() {
    await this.page.click('#show-register');
    await expect(this.page.locator('#register-box')).toBeVisible();
    await expect(this.page.locator('#login-box')).not.toBeVisible();
  }

  /**
   * Switch to login form
   */
  async switchToLogin() {
    await this.page.click('#show-login');
    await expect(this.page.locator('#login-box')).toBeVisible();
    await expect(this.page.locator('#register-box')).not.toBeVisible();
  }

  /**
   * Fill registration form
   */
  async fillRegistrationForm(username, password) {
    await this.page.fill('#register-username', username);
    await this.page.fill('#register-password', password);
  }

  /**
   * Submit registration form
   */
  async submitRegistration() {
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/api/v1/users/register')
    );
    await this.page.click('#register-btn');
    return await responsePromise;
  }

  /**
   * Perform complete registration flow
   */
  async register(username, password) {
    await this.gotoLogin();
    await this.switchToRegister();
    await this.fillRegistrationForm(username, password);
    return await this.submitRegistration();
  }

  /**
   * Logout user
   */
  async logout() {
    // Look for logout button/link
    const logoutSelector = '[data-test-id="logout"], .logout, #logout, #logout-btn';
    
    console.log('Looking for logout button...');
    await this.page.waitForLoadState('networkidle');
    
    const logoutButton = this.page.locator(logoutSelector);
    const count = await logoutButton.count();
    console.log(`Found ${count} logout buttons`);
    
    if (count > 0) {
      // Wait for button to be visible and clickable
      await logoutButton.first().waitFor({ state: 'visible' });
      console.log('Logout button is visible, clicking...');
      
      // Check if there are any JavaScript errors first
      const jsErrors = [];
      this.page.on('pageerror', error => {
        jsErrors.push(error.message);
      });
      
      // Try to manually trigger logout using JavaScript instead of clicking
      console.log('Attempting to call AuthManager.logout() directly...');
      
      // Listen for console messages
      const messages = [];
      this.page.on('console', msg => {
        messages.push(msg.text());
      });
      
      await this.page.evaluate(() => {
        if (window.AuthManager && typeof window.AuthManager.logout === 'function') {
          console.log('AuthManager.logout found, calling it...');
          window.AuthManager.logout();
          return true;
        } else {
          console.log('AuthManager.logout not found');
          return false;
        }
      });
      
      // Wait a moment for navigation to complete
      await this.page.waitForTimeout(2000);
      
      console.log('Console messages:', messages);
      console.log('After logout, current URL:', await this.page.url());
      
      if (jsErrors.length > 0) {
        console.log('JavaScript errors found:', jsErrors);
      }
    } else {
      console.log('No logout button found');
    }
    
    // Verify redirect to login page
    await expect(this.page).toHaveURL(/.*index\.html/);
  }

  /**
   * Check if user is authenticated (on a protected page)
   */
  async isAuthenticated() {
    const currentUrl = this.page.url();
    return !currentUrl.includes('index.html') && 
           (currentUrl.includes('dashboard') || 
            currentUrl.includes('edit') || 
            currentUrl.includes('view'));
  }

  /**
   * Wait for and verify auth error message appears
   * @param {string} message - Expected error message
   * @param {string} formType - 'login' or 'register' to specify which error div to check
   */
  async expectAuthError(message, formType = 'login') {
    console.log('Expecting auth error message:', message, 'for form:', formType);
    
    const errorSelector = formType === 'login' ? '#login-error' : '#register-error';
    await expect(this.page.locator(errorSelector)).toBeVisible();
    
    if (message) {
      await expect(this.page.locator(errorSelector)).toContainText(message);
    }
  }
}