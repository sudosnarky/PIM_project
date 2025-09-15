/**
 * Page object model for the Dashboard page
 * Encapsulates dashboard interactions and elements
 */

import { expect } from '@playwright/test';

export class DashboardPage {
  constructor(page) {
    this.page = page;
    
    // Locators
    this.heading = page.locator('h1');
    this.createNoteButton = page.locator('[data-test-id="create-note"], .btn-primary');
    this.notesContainer = page.locator('.notes-container, .items-container');
    this.categoryFilter = page.locator('#category-filter, .category-filter');
    this.searchBox = page.locator('#search, .search-input');
    this.logoutButton = page.locator('[data-test-id="logout"], .logout, #logout-btn');
    
    // Navigation links
    this.dashboardLink = page.locator('a[href*="dashboard"]');
    this.editLink = page.locator('a[href*="edit"]');
    this.viewLink = page.locator('a[href*="view"]');
  }

  /**
   * Wait for dashboard to load
   */
  async waitForLoad() {
    await expect(this.heading).toContainText('Dashboard');
    await expect(this.page).toHaveURL(/.*dashboard\.html/);
  }

  /**
   * Navigate to create new note
   */
  async clickCreateNote() {
    await this.createNoteButton.click();
    await expect(this.page).toHaveURL(/.*edit\.html/);
  }

  /**
   * Search for notes
   */
  async searchNotes(searchTerm) {
    await this.searchBox.fill(searchTerm);
    // Wait for search results to update
    await this.page.waitForTimeout(1000);
  }

  /**
   * Filter notes by category
   */
  async filterByCategory(category) {
    await this.categoryFilter.selectOption(category);
    // Wait for filter to apply
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get all visible notes
   */
  async getNotes() {
    return await this.page.locator('.note-item, .item').all();
  }

  /**
   * Click on a specific note
   */
  async clickNote(noteTitle) {
    await this.page.locator(`.note-item:has-text("${noteTitle}"), .item:has-text("${noteTitle}")`).click();
  }

  /**
   * Verify note exists in the list
   */
  async expectNoteExists(noteTitle) {
    await expect(this.page.locator(`.note-item:has-text("${noteTitle}"), .item:has-text("${noteTitle}")`)).toBeVisible();
  }

  /**
   * Verify note does not exist in the list
   */
  async expectNoteNotExists(noteTitle) {
    await expect(this.page.locator(`.note-item:has-text("${noteTitle}"), .item:has-text("${noteTitle}")`)).not.toBeVisible();
  }

  /**
   * Navigate to different pages
   */
  async navigateToEdit() {
    await this.editLink.click();
    await expect(this.page).toHaveURL(/.*edit\.html/);
  }

  async navigateToView() {
    await this.viewLink.click();
    await expect(this.page).toHaveURL(/.*view\.html/);
  }
}