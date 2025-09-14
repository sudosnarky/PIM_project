/**
 * Edit page controller.
 * Manages the particle creation and editing interface on the edit.html page.
 */

/**
 * Edit controller class for particle creation and editing
 */
class EditController {
  constructor() {
    this.editing = null;
    this.particleId = this.getParticleIdFromUrl();
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadParticleData();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.titleInput = document.querySelector('.article-header input');
    this.mdEditor = document.querySelector('.markdown-editor');
    this.tagsInput = document.querySelector('input[placeholder*="tags"]');
    this.saveBtn = document.querySelector('.btn-primary');
    this.cancelBtn = document.querySelector('.btn-secondary');
    this.previewBtn = document.querySelector('.btn-preview');
    this.previewPane = document.querySelector('.preview-pane');
    
    // Add section selector if it doesn't exist
    this.sectionSelect = document.querySelector('.section-select');
    if (!this.sectionSelect) {
      this.createSectionSelector();
    }
  }

  /**
   * Create section selector dropdown if it doesn't exist
   */
  createSectionSelector() {
    const container = document.querySelector('.article-header') || document.querySelector('.edit-container');
    if (!container) return;

    const selectContainer = document.createElement('div');
    selectContainer.className = 'section-select-container';
    selectContainer.innerHTML = `
      <label for="section-select">Section:</label>
      <select id="section-select" class="section-select">
        <option value="Projects">Projects</option>
        <option value="Areas">Areas</option>
        <option value="Resources">Resources</option>
        <option value="Archives">Archives</option>
      </select>
    `;
    
    container.appendChild(selectContainer);
    this.sectionSelect = selectContainer.querySelector('.section-select');
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Save button
    if (this.saveBtn) {
      this.saveBtn.onclick = (e) => {
        e.preventDefault();
        this.handleSave();
      };
    }

    // Cancel button
    if (this.cancelBtn) {
      this.cancelBtn.onclick = (e) => {
        e.preventDefault();
        this.handleCancel();
      };
    }

    // Preview button
    if (this.previewBtn) {
      this.previewBtn.onclick = (e) => {
        e.preventDefault();
        this.togglePreview();
      };
    }

    // Auto-save on content change (debounced)
    if (this.mdEditor) {
      let autoSaveTimer;
      this.mdEditor.addEventListener('input', () => {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
          this.autoSave();
        }, 2000); // Auto-save after 2 seconds of inactivity
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Prevent accidental navigation away with unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  /**
   * Get particle ID from URL parameters
   * @returns {string|null} - Particle ID or null if creating new particle
   */
  getParticleIdFromUrl() {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('id');
  }

  /**
   * Load particle data if editing existing particle
   */
  async loadParticleData() {
    if (!this.particleId) {
      this.setDefaultValues();
      return;
    }

    try {
      this.editing = await window.ApiService.getParticle(this.particleId);
      this.populateForm();
    } catch (err) {
      console.error('Failed to load particle:', err);
      alert('Failed to load particle: ' + err.message);
      // Redirect to dashboard if particle not found
      window.location.href = 'dashboard.html';
    }
  }

  /**
   * Set default values for new particle
   */
  setDefaultValues() {
    if (this.sectionSelect) {
      this.sectionSelect.value = 'Projects';
    }
    
    if (this.titleInput) {
      this.titleInput.focus();
    }
  }

  /**
   * Populate form with existing particle data
   */
  populateForm() {
    if (!this.editing) return;

    if (this.titleInput) {
      this.titleInput.value = this.editing.title || '';
    }

    if (this.mdEditor) {
      this.mdEditor.value = this.editing.content || '';
    }

    if (this.tagsInput) {
      this.tagsInput.value = (this.editing.tags || []).join(', ');
    }

    if (this.sectionSelect) {
      this.sectionSelect.value = this.editing.section || 'Projects';
    }

    // Update page title
    document.title = `Edit: ${this.editing.title} - PIM System`;
  }

  /**
   * Handle save button click
   */
  async handleSave() {
    if (!this.validateForm()) {
      return;
    }

    const particleData = this.getFormData();
    
    // Disable form during save
    this.setFormEnabled(false);

    try {
      let savedParticle;
      
      if (this.editing) {
        // Update existing particle
        savedParticle = await window.ApiService.updateParticle(this.particleId, particleData);
      } else {
        // Create new particle
        savedParticle = await window.ApiService.createParticle(particleData);
      }

      // Clear unsaved changes flag
      this.markAsSaved();
      
      // Redirect to view page
      window.location.href = `view.html?id=${savedParticle.id}`;
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed: ' + err.message);
    } finally {
      this.setFormEnabled(true);
    }
  }

  /**
   * Handle cancel button click
   */
  handleCancel() {
    if (this.hasUnsavedChanges()) {
      if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
    }

    // Go back to previous page or dashboard
    if (this.particleId) {
      window.location.href = `view.html?id=${this.particleId}`;
    } else {
      window.location.href = 'dashboard.html';
    }
  }

  /**
   * Toggle markdown preview
   */
  togglePreview() {
    if (!this.mdEditor || !this.previewBtn) return;

    if (this.previewPane && this.previewPane.style.display !== 'none') {
      // Hide preview
      this.previewPane.style.display = 'none';
      this.mdEditor.style.display = '';
      this.previewBtn.textContent = 'Preview';
    } else {
      // Show preview
      this.showPreview();
      this.previewBtn.textContent = 'Edit';
    }
  }

  /**
   * Show markdown preview
   */
  showPreview() {
    if (!this.mdEditor) return;

    // Create preview pane if it doesn't exist
    if (!this.previewPane) {
      this.previewPane = document.createElement('div');
      this.previewPane.className = 'preview-pane';
      this.previewPane.style.border = '1px solid #ccc';
      this.previewPane.style.padding = '10px';
      this.previewPane.style.minHeight = '300px';
      this.previewPane.style.backgroundColor = '#f9f9f9';
      
      this.mdEditor.parentNode.insertBefore(this.previewPane, this.mdEditor.nextSibling);
    }

    // Convert markdown to HTML and display
    const content = this.mdEditor.value || '';
    this.previewPane.innerHTML = window.MarkdownProcessor.toHtml(content);
    
    // Show preview, hide editor
    this.previewPane.style.display = '';
    this.mdEditor.style.display = 'none';
  }

  /**
   * Auto-save functionality
   */
  async autoSave() {
    if (!this.editing || !this.hasUnsavedChanges()) return;

    const particleData = this.getFormData();
    if (!this.validateFormData(particleData, false)) return;

    try {
      await window.ApiService.updateParticle(this.particleId, particleData);
      this.showAutoSaveIndicator();
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }

  /**
   * Show auto-save indicator
   */
  showAutoSaveIndicator() {
    // Remove existing indicator
    const existingIndicator = document.querySelector('.autosave-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'autosave-indicator';
    indicator.textContent = 'Auto-saved';
    indicator.style.position = 'fixed';
    indicator.style.top = '10px';
    indicator.style.right = '10px';
    indicator.style.background = '#4CAF50';
    indicator.style.color = 'white';
    indicator.style.padding = '5px 10px';
    indicator.style.borderRadius = '3px';
    indicator.style.fontSize = '12px';
    indicator.style.zIndex = '1000';
    
    document.body.appendChild(indicator);
    
    // Remove after 2 seconds
    setTimeout(() => {
      indicator.remove();
    }, 2000);
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyboardShortcuts(e) {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.handleSave();
    }
    
    // Ctrl+P or Cmd+P to preview
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      this.togglePreview();
    }
    
    // Escape to cancel
    if (e.key === 'Escape') {
      this.handleCancel();
    }
  }

  /**
   * Validate form inputs
   * @returns {boolean} - True if form is valid
   */
  validateForm() {
    const data = this.getFormData();
    return this.validateFormData(data, true);
  }

  /**
   * Validate form data
   * @param {Object} data - Form data to validate
   * @param {boolean} showErrors - Whether to show error messages
   * @returns {boolean} - True if data is valid
   */
  validateFormData(data, showErrors = true) {
    // Validate title
    if (!window.SecurityUtils.validateTitle(data.title)) {
      if (showErrors && this.titleInput) this.titleInput.focus();
      return false;
    }

    // Validate content
    if (!window.SecurityUtils.validateContent(data.content)) {
      if (showErrors && this.mdEditor) this.mdEditor.focus();
      return false;
    }

    return true;
  }

  /**
   * Get form data as object
   * @returns {Object} - Form data
   */
  getFormData() {
    const title = this.titleInput ? this.titleInput.value.trim() : '';
    const content = this.mdEditor ? this.mdEditor.value.trim() : '';
    const tagsString = this.tagsInput ? this.tagsInput.value.trim() : '';
    const section = this.sectionSelect ? this.sectionSelect.value : 'Projects';
    
    const tags = window.SecurityUtils.validateTags(tagsString);

    return {
      title,
      content,
      tags,
      section
    };
  }

  /**
   * Check if there are unsaved changes
   * @returns {boolean} - True if there are unsaved changes
   */
  hasUnsavedChanges() {
    if (!this.editing) {
      // New particle - check if any fields have content
      const title = this.titleInput ? this.titleInput.value.trim() : '';
      const content = this.mdEditor ? this.mdEditor.value.trim() : '';
      const tags = this.tagsInput ? this.tagsInput.value.trim() : '';
      
      return title || content || tags;
    }

    // Existing particle - check if fields have changed
    const currentData = this.getFormData();
    
    return (
      currentData.title !== this.editing.title ||
      currentData.content !== this.editing.content ||
      JSON.stringify(currentData.tags) !== JSON.stringify(this.editing.tags || []) ||
      currentData.section !== this.editing.section
    );
  }

  /**
   * Mark form as saved (no unsaved changes)
   */
  markAsSaved() {
    if (this.editing) {
      const currentData = this.getFormData();
      this.editing = { ...this.editing, ...currentData };
    }
  }

  /**
   * Enable or disable form elements
   * @param {boolean} enabled - Whether form should be enabled
   */
  setFormEnabled(enabled) {
    if (this.titleInput) this.titleInput.disabled = !enabled;
    if (this.mdEditor) this.mdEditor.disabled = !enabled;
    if (this.tagsInput) this.tagsInput.disabled = !enabled;
    if (this.sectionSelect) this.sectionSelect.disabled = !enabled;
    if (this.saveBtn) {
      this.saveBtn.disabled = !enabled;
      this.saveBtn.textContent = enabled ? 'Save' : 'Saving...';
    }
  }
}

// Initialize edit controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.endsWith('edit.html')) {
    window.editController = new EditController();
  }
});