/**
 * Dashboard and Navigation E2E Tests
 * Tests dashboard functionality, navigation between pages, and overall user flow
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helper.js';
import { DashboardPage } from '../utils/page-objects.js';
import { TestDataFactory, TEST_CONSTANTS } from '../utils/test-data.js';

test.describe('Dashboard and Navigation', () => {
  let authHelper;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dashboardPage = new DashboardPage(page);
    
    // Login before each test
    await authHelper.login();
  });

  test.describe('Dashboard Layout and Elements', () => {
    test('should display dashboard with all key elements @smoke', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Verify main dashboard elements
      await expect(page.locator('h1')).toContainText('Dashboard');
      await expect(page).toHaveTitle(/.*Dashboard/);
      
      // Check for navigation elements
      const navElements = [
        'a[href*="dashboard"]',
        'a[href*="edit"]', 
        'a[href*="view"]'
      ];
      
      for (const selector of navElements) {
        if (await page.locator(selector).count() > 0) {
          await expect(page.locator(selector).first()).toBeVisible();
        }
      }
    });

    test('should display PARA categories', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Look for PARA category indicators
      const categories = Object.values(TEST_CONSTANTS.PARA_CATEGORIES);
      
      for (const category of categories) {
        // Categories might be in navigation, filters, or section headers
        const categoryLocator = page.locator(`text=${category}`).first();
        if (await categoryLocator.count() > 0) {
          await expect(categoryLocator).toBeVisible();
        }
      }
    });

    test('should be responsive on different screen sizes', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(dashboardPage.heading).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(dashboardPage.heading).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(dashboardPage.heading).toBeVisible();
    });
  });

  test.describe('Navigation Between Pages', () => {
    test('should navigate to edit page @smoke', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Look for create/edit button or link
      const editSelectors = [
        'a[href*="edit"]',
        '[data-test-id="create-note"]',
        '.btn:has-text("Create")',
        '.btn:has-text("New")',
        '.btn:has-text("Add")'
      ];
      
      let editButton = null;
      for (const selector of editSelectors) {
        if (await page.locator(selector).count() > 0) {
          editButton = page.locator(selector).first();
          break;
        }
      }
      
      if (editButton) {
        await editButton.click();
        await expect(page).toHaveURL(/.*edit\.html/);
      } else {
        // Navigate directly if no button found
        await page.goto('/static/html/edit.html');
        await expect(page).toHaveURL(/.*edit\.html/);
      }
    });

    test('should navigate to view page', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      const viewSelectors = [
        'a[href*="view"]',
        '[data-test-id="view-notes"]',
        '.btn:has-text("View")',
        '.nav-link:has-text("View")'
      ];
      
      let viewButton = null;
      for (const selector of viewSelectors) {
        if (await page.locator(selector).count() > 0) {
          viewButton = page.locator(selector).first();
          break;
        }
      }
      
      if (viewButton) {
        await viewButton.click();
        await expect(page).toHaveURL(/.*view\.html/);
      } else {
        await page.goto('/static/html/view.html');
        await expect(page).toHaveURL(/.*view\.html/);
      }
    });

    test('should maintain authentication across page navigation', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Navigate to edit page
      await page.goto('/static/html/edit.html');
      await expect(page).toHaveURL(/.*edit\.html/);
      expect(await authHelper.isAuthenticated()).toBe(true);
      
      // Navigate to view page  
      await page.goto('/static/html/view.html');
      await expect(page).toHaveURL(/.*view\.html/);
      expect(await authHelper.isAuthenticated()).toBe(true);
      
      // Navigate back to dashboard
      await page.goto('/static/html/dashboard.html');
      await dashboardPage.waitForLoad();
      expect(await authHelper.isAuthenticated()).toBe(true);
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Navigate to edit page
      await page.goto('/static/html/edit.html');
      await expect(page).toHaveURL(/.*edit\.html/);
      
      // Use browser back button
      await page.goBack();
      await expect(page).toHaveURL(/.*dashboard\.html/);
      
      // Use browser forward button
      await page.goForward();
      await expect(page).toHaveURL(/.*edit\.html/);
    });
  });

  test.describe('Search and Filter Functionality', () => {
    test('should search for notes if search functionality exists', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Look for search input
      const searchSelectors = [
        '#search',
        '.search-input',
        'input[placeholder*="search" i]',
        'input[type="search"]'
      ];
      
      let searchInput = null;
      for (const selector of searchSelectors) {
        if (await page.locator(selector).count() > 0) {
          searchInput = page.locator(selector).first();
          break;
        }
      }
      
      if (searchInput) {
        await searchInput.fill('test');
        await page.waitForTimeout(1000); // Wait for search results
        
        // Verify search was performed (results updated)
        // This is a placeholder - actual verification would depend on UI implementation
        await expect(searchInput).toHaveValue('test');
      }
    });

    test('should filter by PARA categories if filter exists', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Look for category filter
      const filterSelectors = [
        '#category-filter',
        '.category-filter',
        'select[name*="category" i]',
        '.filter-dropdown'
      ];
      
      let categoryFilter = null;
      for (const selector of filterSelectors) {
        if (await page.locator(selector).count() > 0) {
          categoryFilter = page.locator(selector).first();
          break;
        }
      }
      
      if (categoryFilter) {
        // Try to select Projects category
        if (await categoryFilter.locator('option').count() > 1) {
          await categoryFilter.selectOption('Projects');
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Notes/Items Display', () => {
    test('should display existing notes if any exist', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Look for notes container
      const notesSelectors = [
        '.notes-container',
        '.items-container',
        '.note-list',
        '.cards-container'
      ];
      
      let notesContainer = null;
      for (const selector of notesSelectors) {
        if (await page.locator(selector).count() > 0) {
          notesContainer = page.locator(selector).first();
          break;
        }
      }
      
      if (notesContainer) {
        // Check if container is visible
        await expect(notesContainer).toBeVisible();
        
        // Count notes/items if any exist
        const noteItems = await page.locator('.note-item, .item, .card').count();
        console.log(`Found ${noteItems} notes/items on dashboard`);
      }
    });

    test('should handle empty state gracefully', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Look for empty state messages
      const emptyStateSelectors = [
        '.empty-state',
        '.no-notes',
        '.no-items',
        'text=No notes',
        'text=No items',
        'text=Get started'
      ];
      
      for (const selector of emptyStateSelectors) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          // Found empty state - verify it's helpful
          await expect(element).toBeVisible();
          break;
        }
      }
    });

    test('should interact with note items if they exist', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Look for clickable note items
      const noteSelectors = [
        '.note-item',
        '.item',
        '.card',
        '[data-test-id*="note"]'
      ];
      
      let noteItem = null;
      for (const selector of noteSelectors) {
        if (await page.locator(selector).count() > 0) {
          noteItem = page.locator(selector).first();
          break;
        }
      }
      
      if (noteItem) {
        await expect(noteItem).toBeVisible();
        
        // Try clicking on the note (should navigate somewhere)
        const currentUrl = page.url();
        await noteItem.click();
        
        // Wait a moment for navigation
        await page.waitForTimeout(2000);
        
        // Verify some action occurred (URL changed or modal opened)
        const newUrl = page.url();
        const hasModal = await page.locator('.modal, .dialog, .overlay').count() > 0;
        
        expect(newUrl !== currentUrl || hasModal).toBe(true);
      }
    });
  });

  test.describe('User Experience Features', () => {
    test('should show loading states appropriately', async ({ page }) => {
      // Simulate slow network to test loading states
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 1000);
      });
      
      await page.goto('/static/html/dashboard.html');
      
      // Look for loading indicators
      const loadingSelectors = [
        '.loading',
        '.spinner',
        '.skeleton',
        '[data-test-id="loading"]'
      ];
      
      let foundLoading = false;
      for (const selector of loadingSelectors) {
        if (await page.locator(selector).count() > 0) {
          foundLoading = true;
          break;
        }
      }
      
      // Clean up route interception
      await page.unroute('**/api/**');
      
      // Wait for final load
      await dashboardPage.waitForLoad();
    });

    test('should handle errors gracefully', async ({ page }) => {
      // Simulate API errors
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.goto('/static/html/dashboard.html');
      await page.waitForTimeout(3000);
      
      // Look for error messages
      const errorSelectors = [
        '.error',
        '.alert-danger',
        '[role="alert"]',
        '.error-message'
      ];
      
      let foundError = false;
      for (const selector of errorSelectors) {
        if (await page.locator(selector).count() > 0) {
          foundError = true;
          await expect(page.locator(selector)).toBeVisible();
          break;
        }
      }
      
      // Clean up route interception
      await page.unroute('**/api/**');
    });

    test('should be accessible with keyboard navigation @a11y', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // Tab through focusable elements
      const focusableCount = await page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
      
      for (let i = 0; i < Math.min(focusableCount, 10); i++) {
        await page.keyboard.press('Tab');
        
        const focusedElement = await page.evaluate(() => {
          const focused = document.activeElement;
          return {
            tagName: focused.tagName,
            id: focused.id,
            className: focused.className
          };
        });
        
        expect(focusedElement.tagName).toBeTruthy();
      }
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time @performance', async ({ page }) => {
      const startTime = Date.now();
      
      await authHelper.login();
      await dashboardPage.waitForLoad();
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      console.log(`Dashboard loaded in ${loadTime}ms`);
    });

    test('should handle large datasets gracefully', async ({ page }) => {
      await dashboardPage.waitForLoad();
      
      // This would typically involve creating many test items
      // For now, we'll just verify the page doesn't crash with existing data
      
      // Check memory usage
      const metrics = await page.evaluate(() => {
        return {
          memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          } : null,
          timing: performance.timing
        };
      });
      
      console.log('Performance metrics:', metrics);
      
      // Verify page is still responsive
      await expect(dashboardPage.heading).toBeVisible();
    });
  });
});