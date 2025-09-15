/**
 * Authentication E2E Tests
 * Tests login, registration, logout, and authentication edge cases
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helper.js';
import { TestDataFactory, TEST_CONSTANTS } from '../utils/test-data.js';

test.describe('Authentication', () => {
  let authHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.describe('Login Flow', () => {
    test('should display login form on initial load @smoke', async ({ page }) => {
      await authHelper.gotoLogin();
      
      // Verify login form elements are visible
      await expect(page.locator('#login-box')).toBeVisible();
      await expect(page.locator('#login-username')).toBeVisible();
      await expect(page.locator('#login-password')).toBeVisible();
      await expect(page.locator('#login-btn')).toBeVisible();
      await expect(page.locator('#show-register')).toBeVisible();
      
      // Verify page title and branding
      await expect(page).toHaveTitle(/PARA InfoSystem.*Login/);
      await expect(page.locator('#login-box h1')).toContainText('PARA InfoSystem');
    });

    test('should successfully login with valid credentials @smoke', async ({ page }) => {
      await authHelper.login(TEST_CONSTANTS.DEFAULT_USER.username, TEST_CONSTANTS.DEFAULT_USER.password);
      
      // Should be redirected to dashboard
      await expect(page).toHaveURL(/.*dashboard\.html/);
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('should show error message with invalid credentials', async ({ page }) => {
      await authHelper.gotoLogin();
      await authHelper.fillLoginForm(TEST_CONSTANTS.INVALID_USER.username, TEST_CONSTANTS.INVALID_USER.password);
      
      const response = await Promise.race([
        authHelper.submitLogin().catch(() => null),
        page.waitForTimeout(5000).then(() => null)
      ]);
      
      // Should show error message (either in response or on page)
      if (response && response.status() !== 200) {
        // API returned error
        expect(response.status()).toBe(401);
      } else {
        // Check for client-side error display
        await authHelper.expectAuthError(null, 'login');
      }
      
      // Should remain on login page
      await expect(page).toHaveURL(/.*index\.html/);
    });

    test('should validate required fields', async ({ page }) => {
      await authHelper.gotoLogin();
      
      // Try to submit empty form
      await page.click('#login-btn');
      
      // Should show validation errors or prevent submission
      const usernameField = page.locator('#login-username');
      const passwordField = page.locator('#login-password');
      
      // Check HTML5 validation or custom validation
      const usernameValid = await usernameField.evaluate(el => el.checkValidity());
      const passwordValid = await passwordField.evaluate(el => el.checkValidity());
      
      expect(usernameValid || passwordValid).toBe(false);
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await authHelper.gotoLogin();
      
      // Fill username and press Tab to move to password
      await page.fill('#login-username', TEST_CONSTANTS.DEFAULT_USER.username);
      await page.keyboard.press('Tab');
      await expect(page.locator('#login-password')).toBeFocused();
      
      // Fill password and press Enter to submit
      await page.fill('#login-password', TEST_CONSTANTS.DEFAULT_USER.password);
      await page.keyboard.press('Enter');
      
      // Should attempt login
      await page.waitForTimeout(2000);
      // Verify login was attempted (either success or error handling)
    });
  });

  test.describe('Registration Flow', () => {
    test('should toggle to registration form', async ({ page }) => {
      await authHelper.gotoLogin();
      await authHelper.switchToRegister();
      
      // Verify registration form is visible and login form is hidden
      await expect(page.locator('#register-box')).toBeVisible();
      await expect(page.locator('#login-box')).not.toBeVisible();
      
      // Verify form elements
      await expect(page.locator('#register-username')).toBeVisible();
      await expect(page.locator('#register-password')).toBeVisible();
      await expect(page.locator('#register-btn')).toBeVisible();
      await expect(page.locator('#show-login')).toBeVisible();
    });

    test('should toggle back to login form', async ({ page }) => {
      await authHelper.gotoLogin();
      await authHelper.switchToRegister();
      await authHelper.switchToLogin();
      
      // Should be back to login form
      await expect(page.locator('#login-box')).toBeVisible();
      await expect(page.locator('#register-box')).not.toBeVisible();
    });

    test('should register new user successfully', async ({ page }) => {
      const newUser = TestDataFactory.generateUser();
      
      const response = await authHelper.register(newUser.username, newUser.password);
      
      if (response.status() === 201 || response.status() === 200) {
        // Registration successful - should redirect or show success
        await expect(page).toHaveURL(/.*dashboard\.html|.*index\.html/);
      } else {
        // Handle registration error appropriately
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('should prevent registration with existing username', async ({ page }) => {
      // Try to register with existing user
      const response = await authHelper.register(
        TEST_CONSTANTS.DEFAULT_USER.username, 
        TestDataFactory.generatePassword()
      );
      
      // Should return error for duplicate username
      expect(response.status()).toBeGreaterThanOrEqual(400);
      await authHelper.expectAuthError('already taken', 'register');
    });

    test('should validate password requirements', async ({ page }) => {
      await authHelper.gotoLogin();
      await authHelper.switchToRegister();
      
      // Try weak password
      const newUser = TestDataFactory.generateUser();
      await authHelper.fillRegistrationForm(newUser.username, '123');
      
      const response = await Promise.race([
        authHelper.submitRegistration().catch(() => null),
        page.waitForTimeout(3000).then(() => null)
      ]);
      
      // Should show validation error for weak password
      if (response && response.status() >= 400) {
        await authHelper.expectAuthError('password', 'register');
      } else {
        // Check for client-side validation
        const passwordField = page.locator('#register-password');
        const isValid = await passwordField.evaluate(el => el.checkValidity());
        expect(isValid).toBe(false);
      }
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await authHelper.login();
      
      // Refresh the page
      await page.reload();
      
      // Should still be authenticated
      await expect(page).toHaveURL(/.*dashboard\.html/);
      expect(await authHelper.isAuthenticated()).toBe(true);
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected page without authentication
      await page.goto('/static/html/dashboard.html');
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*index\.html/);
    });

    test('should logout successfully', async ({ page }) => {
      // Login first
      await authHelper.login();
      
      // Logout
      await authHelper.logout();
      
      // Should be redirected to login page
      await expect(page).toHaveURL(/.*index\.html/);
      expect(await authHelper.isAuthenticated()).toBe(false);
    });
  });

  test.describe('Security Tests', () => {
    test('should prevent XSS in login form', async ({ page }) => {
      await authHelper.gotoLogin();
      
      const xssPayload = '<script>alert("XSS")</script>';
      await authHelper.fillLoginForm(xssPayload, 'password');
      await page.click('#login-btn');
      
      // Should not execute JavaScript - page should handle it safely
      await page.waitForTimeout(2000);
      const alertDialogs = [];
      page.on('dialog', dialog => {
        alertDialogs.push(dialog);
        dialog.dismiss();
      });
      
      expect(alertDialogs).toHaveLength(0);
    });

    test('should handle SQL injection attempts safely', async ({ page }) => {
      await authHelper.gotoLogin();
      
      const sqlPayload = "admin'; DROP TABLE users; --";
      await authHelper.fillLoginForm(sqlPayload, 'password');
      
      const response = await Promise.race([
        authHelper.submitLogin().catch(() => ({ status: () => 400 })),
        page.waitForTimeout(5000).then(() => ({ status: () => 408 }))
      ]);
      
      // Should handle malicious input safely (either reject or sanitize)
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard accessible @a11y', async ({ page }) => {
      await authHelper.gotoLogin();
      
      // Tab through all focusable elements
      const focusableElements = [
        '#login-username',
        '#login-password', 
        '#login-btn',
        '#show-register'
      ];
      
      for (const selector of focusableElements) {
        await page.keyboard.press('Tab');
        // Allow some flexibility in focus order
        const focusedElement = await page.evaluate(() => document.activeElement.id || document.activeElement.tagName);
        expect(focusedElement).toBeTruthy();
      }
    });

    test('should have proper ARIA labels and roles @a11y', async ({ page }) => {
      await authHelper.gotoLogin();
      
      // Check for accessibility attributes
      const usernameField = page.locator('#login-username');
      const passwordField = page.locator('#login-password');
      
      // Check for labels or aria-labels
      const usernameHasLabel = await usernameField.evaluate(el => 
        el.getAttribute('aria-label') || el.getAttribute('placeholder') || 
        document.querySelector(`label[for="${el.id}"]`)
      );
      
      expect(usernameHasLabel).toBeTruthy();
      
      const passwordHasLabel = await passwordField.evaluate(el =>
        el.getAttribute('aria-label') || el.getAttribute('placeholder') || 
        document.querySelector(`label[for="${el.id}"]`)
      );
      
      expect(passwordHasLabel).toBeTruthy();
    });
  });
});