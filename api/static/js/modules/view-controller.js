/**
 * View page controller.
 * Manages the particle viewing interface on the view.html page.
 */

/**
 * View controller class for particle viewing and tag interactions
 */
class ViewController {
  constructor() {
    console.log('ViewController constructor called');
    this.particleId = this.getParticleIdFromUrl();
    console.log('Particle ID from URL:', this.particleId);
    this.particle = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadParticleData();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.titleElement = document.querySelector('.article-header h1');
    this.contentElement = document.querySelector('.article-content');
    this.tagsContainer = document.querySelector('.tags-container');
    
    // Reference existing buttons in HTML
    this.editBtn = document.querySelector('a.btn-edit');  // Edit button in bottom action area
    this.deleteBtn = document.querySelector('button.delete-btn');  // Delete button in bottom action area
    this.backBtn = document.querySelector('a[href="dashboard.html"]');  // Back button in navigation
    this.shareBtn = null;  // Will be created if needed
    
    // Create action buttons if they don't exist
    this.createActionButtons();
  }

  /**
   * Create action buttons for the view page
   */
  createActionButtons() {
    const header = document.querySelector('.article-header');
    if (!header) return;

    let actionsContainer = header.querySelector('.article-actions');
    if (!actionsContainer) {
      actionsContainer = document.createElement('div');
      actionsContainer.className = 'article-actions';
      actionsContainer.style.marginTop = '10px';
      header.appendChild(actionsContainer);
    }

    // Only create share button since edit/delete/back buttons exist elsewhere
    if (!this.shareBtn) {
      this.shareBtn = document.createElement('button');
      this.shareBtn.className = 'btn btn-secondary btn-share';
      this.shareBtn.textContent = 'Share';
      actionsContainer.appendChild(this.shareBtn);
    }
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Edit button
    if (this.editBtn) {
      this.editBtn.onclick = () => {
        window.location.href = `edit.html?id=${this.particleId}`;
      };
    }

    // Delete button
    if (this.deleteBtn) {
      this.deleteBtn.onclick = () => {
        this.handleDelete();
      };
    }

    // Back button
    if (this.backBtn) {
      this.backBtn.onclick = () => {
        window.location.href = 'dashboard.html';
      };
    }

    // Share button
    if (this.shareBtn) {
      this.shareBtn.onclick = () => {
        this.handleShare();
      };
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }

  /**
   * Get particle ID from URL parameters
   * @returns {string|null} - Particle ID or null if not found
   */
  getParticleIdFromUrl() {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('id');
  }

  /**
   * Load and display particle data
   */
  async loadParticleData() {
    if (!this.particleId) {
      this.showError('No particle ID provided');
      return;
    }

    try {
      this.particle = await window.ApiService.getParticle(this.particleId);
      this.displayParticle();
    } catch (err) {
      console.error('Failed to load particle:', err);
      this.showError('Failed to load particle: ' + err.message);
    }
  }

  /**
   * Display particle content on the page
   */
  displayParticle() {
    console.log('displayParticle called, particle:', this.particle);
    if (!this.particle) return;

    // Display title
    if (this.titleElement) {
      this.titleElement.textContent = this.particle.title;
      document.title = `${this.particle.title} - PIM System`;
    }

    // Display content (convert markdown to HTML)
    if (this.contentElement) {
      this.contentElement.innerHTML = window.MarkdownProcessor.toHtml(this.particle.content);
    }

    // Display tags
    this.displayTags();

    // Update edit button href
    if (this.editBtn) {
      this.editBtn.href = `edit.html?id=${this.particleId}`;
    }

    // Show metadata
    this.displayMetadata();
  }

  /**
   * Display particle tags with click functionality
   */
  displayTags() {
    if (!this.tagsContainer) return;

    this.tagsContainer.innerHTML = '';

    // Add particle ID as a tag
    const idTag = document.createElement('span');
    idTag.className = 'tag tag-id';
    idTag.textContent = `#${this.particle.id}`;
    this.tagsContainer.appendChild(idTag);

    // Add user-defined tags
    if (this.particle.tags && this.particle.tags.length > 0) {
      this.particle.tags.forEach((tag, index) => {
        const tagElement = document.createElement('span');
        tagElement.className = `tag tag-clickable tag-${['purple', 'orange'][index % 2]}`;
        tagElement.textContent = tag;
        tagElement.style.cursor = 'pointer';
        tagElement.setAttribute('data-tag', tag);
        
        tagElement.onclick = () => {
          this.handleTagClick(tag);
        };
        
        this.tagsContainer.appendChild(tagElement);
      });
    }

    // Add section tag
    const sectionTag = document.createElement('span');
    sectionTag.className = 'tag tag-section';
    sectionTag.textContent = this.particle.section;
    this.tagsContainer.appendChild(sectionTag);
  }

  /**
   * Display particle metadata
   */
  displayMetadata() {
    let metadataContainer = document.querySelector('.particle-metadata');
    if (!metadataContainer) {
      metadataContainer = document.createElement('div');
      metadataContainer.className = 'particle-metadata';
      metadataContainer.style.marginTop = '20px';
      metadataContainer.style.padding = '10px';
      metadataContainer.style.backgroundColor = '#f5f5f5';
      metadataContainer.style.borderRadius = '5px';
      metadataContainer.style.fontSize = '0.9em';
      metadataContainer.style.color = '#666';
      
      if (this.contentElement) {
        this.contentElement.parentNode.insertBefore(
          metadataContainer, 
          this.contentElement.nextSibling
        );
      }
    }

    const createdDate = this.particle.created 
      ? new Date(this.particle.created).toLocaleString()
      : 'Unknown';
      
    const updatedDate = this.particle.updated 
      ? new Date(this.particle.updated).toLocaleString()
      : 'Unknown';

    const wordCount = window.MarkdownProcessor.getWordCount(this.particle.content);
    const charCount = window.MarkdownProcessor.getCharCount(this.particle.content);

    metadataContainer.innerHTML = `
      <div class="metadata-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
        <div><strong>Created:</strong> ${createdDate}</div>
        <div><strong>Updated:</strong> ${updatedDate}</div>
        <div><strong>Section:</strong> ${this.particle.section}</div>
        <div><strong>Words:</strong> ${wordCount}</div>
        <div><strong>Characters:</strong> ${charCount}</div>
        <div><strong>Author:</strong> ${this.particle.user || 'Unknown'}</div>
      </div>
    `;
  }

  /**
   * Handle tag click events
   * @param {string} tag - The clicked tag
   */
  async handleTagClick(tag) {
    try {
      // Fetch all particles and filter by this tag
      const allParticles = await window.ApiService.getParticles();
      const relatedParticles = allParticles.filter(p => 
        (p.tags || []).map(t => t.toLowerCase()).includes(tag.toLowerCase())
      );
      
      this.showTagModal(tag, relatedParticles);
    } catch (err) {
      console.error('Failed to fetch related particles:', err);
      this.showTagModal(tag, []);
    }
  }

  /**
   * Show modal with particles that have the same tag
   * @param {string} tag - The tag name
   * @param {Array} particles - Array of related particles
   */
  showTagModal(tag, particles) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.tag-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'tag-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.background = '#222';
    modalContent.style.padding = '2em';
    modalContent.style.maxWidth = '600px';
    modalContent.style.width = '90vw';
    modalContent.style.borderRadius = '16px';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'auto';
    modalContent.style.color = 'white';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.float = 'right';
    closeBtn.style.marginTop = '-2.5em';
    closeBtn.style.marginRight = '-2em';
    closeBtn.style.fontSize = '1.5em';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => modal.remove();

    const title = document.createElement('h2');
    title.innerHTML = `Particles with tag <span class='hashtag'>#${window.SecurityUtils.escapeHtml(tag)}</span>`;
    title.style.marginBottom = '1em';

    const particlesList = document.createElement('div');
    particlesList.className = 'tag-particles-list';

    if (particles.length === 0) {
      particlesList.innerHTML = '<p>No particles found for this tag.</p>';
    } else {
      particlesList.innerHTML = particles.map(p => {
        const createdDate = p.created ? new Date(p.created).toISOString().split('T')[0] : '';
        const tagsHtml = (p.tags || []).map(t => 
          `<span class='hashtag'>#${window.SecurityUtils.escapeHtml(t)}</span>`
        ).join(' ');
        
        return `
          <div class="particle-card" style='margin-bottom:1em;padding:1em;background:#333;border-radius:10px;'>
            <h3 style='margin:0 0 0.5em 0;'>${window.SecurityUtils.escapeHtml(p.title)}</h3>
            <div style='font-size:0.95em;color:#aaa;margin-bottom:0.5em;'>
              ${window.SecurityUtils.escapeHtml(p.section)} &middot; ${createdDate}
            </div>
            <div style='margin-bottom:0.5em;'>${tagsHtml}</div>
            <a href="view.html?id=${p.id}" class="btn btn-view" style='display:inline-block;padding:0.3em 0.8em;background:#0066cc;color:white;text-decoration:none;border-radius:4px;'>View</a>
          </div>
        `;
      }).join('');
    }

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(particlesList);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close with Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Handle delete button click
   */
  async handleDelete() {
    if (!this.particle) return;

    const confirmed = confirm(`Are you sure you want to delete "${this.particle.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await window.ApiService.deleteParticle(this.particleId);
      alert('Particle deleted successfully.');
      window.location.href = 'dashboard.html';
    } catch (err) {
      console.error('Failed to delete particle:', err);
      alert('Failed to delete particle: ' + err.message);
    }
  }

  /**
   * Handle share button click
   */
  handleShare() {
    if (!this.particle) return;

    const url = window.location.href;
    
    if (navigator.share) {
      // Use Web Share API if available
      navigator.share({
        title: this.particle.title,
        text: this.particle.content.substring(0, 100) + '...',
        url: url
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Link copied to clipboard!');
      });
    }
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyboardShortcuts(e) {
    // E key to edit
    if (e.key === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        window.location.href = `edit.html?id=${this.particleId}`;
      }
    }
    
    // Escape key to go back
    if (e.key === 'Escape') {
      window.location.href = 'dashboard.html';
    }
    
    // Delete key to delete (with confirmation)
    if (e.key === 'Delete' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.handleDelete();
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    if (this.titleElement) {
      this.titleElement.textContent = 'Error';
    }
    
    if (this.contentElement) {
      this.contentElement.innerHTML = `
        <div class="error-message" style="color: #d32f2f; padding: 20px; text-align: center;">
          <h3>Oops! Something went wrong.</h3>
          <p>${window.SecurityUtils.escapeHtml(message)}</p>
          <button onclick="window.location.href='dashboard.html'" class="btn btn-primary">Go to Dashboard</button>
        </div>
      `;
    }
    
    if (this.tagsContainer) {
      this.tagsContainer.innerHTML = '';
    }
  }
}

// Make ViewController available globally
window.ViewController = ViewController;