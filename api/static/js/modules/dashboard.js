/**
 * Dashboard page controller.
 * Manages the dashboard interface, particle listing, filtering, and user interactions.
 */

/**
 * Dashboard controller class for managing the main dashboard interface
 */
class DashboardController {
  constructor() {
    this.currentSection = 'Projects';
    this.particles = [];
    this.searchDebounceTimer = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadInitialData();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.paraTabs = document.querySelectorAll('.para-tab');
    this.searchInput = document.querySelector('.search-input');
    this.itemsList = document.querySelector('.items-list');
    this.createBtn = document.getElementById('create-particle-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    this.userDisplay = document.querySelector('.user-display');
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Logout button
    if (this.logoutBtn) {
      this.logoutBtn.onclick = () => {
        window.AuthManager.logout();
      };
    }

    // PARA tabs
    this.paraTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.handleTabClick(e.target);
      });
    });

    // Search input with debouncing
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.handleSearchInput(e.target.value);
      });
    }

    // Create new particle button
    if (this.createBtn) {
      this.createBtn.addEventListener('click', () => {
        window.location.href = 'edit.html';
      });
    }
  }

  /**
   * Handle tab click events
   * @param {HTMLElement} clickedTab - The clicked tab element
   */
  handleTabClick(clickedTab) {
    // Remove active class from all tabs
    this.paraTabs.forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked tab
    clickedTab.classList.add('active');
    
    // Update current section and reload data
    this.currentSection = clickedTab.textContent;
    this.renderList();
  }

  /**
   * Handle search input with debouncing
   * @param {string} searchTerm - The search term entered by user
   */
  handleSearchInput(searchTerm) {
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Set new timer to delay search
    this.searchDebounceTimer = setTimeout(() => {
      this.renderList();
    }, 300); // 300ms delay
  }

  /**
   * Load initial data and render dashboard
   */
  async loadInitialData() {
    // Ensure user is authenticated
    if (!window.AuthManager.requireAuth()) {
      return;
    }

    // Display current user
    const username = window.AuthManager.getUser();
    if (this.userDisplay && username) {
      this.userDisplay.textContent = username;
    }

    // Load and render particles
    await this.renderList();
  }

  /**
   * Fetch particles from server based on current filters
   */
  async fetchParticles() {
    const searchTerm = this.searchInput ? this.searchInput.value.trim() : '';
    
    try {
      this.particles = await window.ApiService.getParticles(
        this.currentSection,
        searchTerm || null
      );
    } catch (err) {
      console.error('Failed to fetch particles:', err);
      alert('Failed to load notes: ' + err.message);
      this.particles = [];
    }
  }

  /**
   * Render the particles list in the dashboard
   */
  async renderList() {
    await this.fetchParticles();
    
    if (!this.itemsList) return;
    
    this.itemsList.innerHTML = '';

    if (this.particles.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Create cards for each particle
    this.particles.forEach(particle => {
      const card = this.createParticleCard(particle);
      this.itemsList.appendChild(card);
    });

    // Set up event listeners for the newly created cards
    this.setupCardEventListeners();
  }

  /**
   * Render empty state when no particles found
   */
  renderEmptyState() {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.innerHTML = `
      <div class="empty-state-content">
        <h3>No particles found</h3>
        <p>Start by creating your first ${this.currentSection.toLowerCase()} particle.</p>
        <button class="btn btn-primary" id="create-first-particle">Create First Particle</button>
      </div>
    `;
    
    this.itemsList.appendChild(emptyDiv);

    // Add event listener to create button
    const createFirstBtn = emptyDiv.querySelector('#create-first-particle');
    if (createFirstBtn) {
      createFirstBtn.onclick = () => {
        window.location.href = 'edit.html';
      };
    }
  }

  /**
   * Create a particle card element
   * @param {Object} particle - The particle data
   * @returns {HTMLElement} - The created card element
   */
  createParticleCard(particle) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    // Create snippet from content (first few lines)
    const snippet = particle.content
      .split('\n')
      .slice(0, 3)
      .join(' ')
      .substring(0, 150) + (particle.content.length > 150 ? '...' : '');

    // Format creation date
    const createdDate = particle.created 
      ? new Date(particle.created).toLocaleDateString()
      : '';

    card.innerHTML = `
      <div class="item-info">
        <h3 class="item-title">${window.SecurityUtils.escapeHtml(particle.title)}</h3>
        <p class="item-snippet">${window.SecurityUtils.escapeHtml(snippet)}</p>
        <div class="item-meta">
          <span class="item-date">${createdDate}</span>
          <span class="item-section">${window.SecurityUtils.escapeHtml(particle.section)}</span>
        </div>
      </div>
      <div class="item-actions">
        <a href="view.html?id=${particle.id}" class="btn btn-view">View</a>
        <a href="edit.html?id=${particle.id}" class="btn btn-edit">Edit</a>
        <select class="move-section" data-id="${particle.id}">
          <option disabled selected>Move to...</option>
          <option value="Projects">Projects</option>
          <option value="Areas">Areas</option>
          <option value="Resources">Resources</option>
          <option value="Archives">Archives</option>
        </select>
        <button class="btn btn-secondary archive-btn" data-id="${particle.id}">Archive</button>
      </div>
    `;

    return card;
  }

  /**
   * Set up event listeners for particle cards
   */
  setupCardEventListeners() {
    // Move section dropdowns
    this.itemsList.querySelectorAll('.move-section').forEach(select => {
      select.addEventListener('change', (e) => {
        this.handleMoveParticle(e.target);
      });
    });

    // Archive buttons
    this.itemsList.querySelectorAll('.archive-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        this.handleArchiveParticle(e.target);
      });
    });
  }

  /**
   * Handle moving a particle to a different section
   * @param {HTMLElement} selectElement - The select element that was changed
   */
  async handleMoveParticle(selectElement) {
    const particleId = selectElement.getAttribute('data-id');
    const newSection = selectElement.value;
    const particle = this.particles.find(p => p.id === parseInt(particleId));
    
    if (!particle) {
      console.error('Particle not found:', particleId);
      return;
    }

    try {
      await window.ApiService.updateParticle(particleId, {
        ...particle,
        section: newSection
      });
      
      // Reset dropdown
      selectElement.selectedIndex = 0;
      
      // Refresh list if moving out of current section
      if (newSection !== this.currentSection) {
        await this.renderList();
      }
      
      // Show success message
      this.showMessage(`Moved "${particle.title}" to ${newSection}`, 'success');
    } catch (err) {
      console.error('Failed to move particle:', err);
      alert('Failed to move particle: ' + err.message);
      selectElement.selectedIndex = 0; // Reset dropdown
    }
  }

  /**
   * Handle archiving a particle
   * @param {HTMLElement} buttonElement - The archive button that was clicked
   */
  async handleArchiveParticle(buttonElement) {
    const particleId = buttonElement.getAttribute('data-id');
    const particle = this.particles.find(p => p.id === parseInt(particleId));
    
    if (!particle) {
      console.error('Particle not found:', particleId);
      return;
    }

    // Confirm archival
    if (!confirm(`Archive "${particle.title}"?`)) {
      return;
    }

    try {
      await window.ApiService.updateParticle(particleId, {
        ...particle,
        section: 'Archives'
      });
      
      // Refresh list if archiving from current section
      if (this.currentSection !== 'Archives') {
        await this.renderList();
      }
      
      // Show success message
      this.showMessage(`Archived "${particle.title}"`, 'success');
    } catch (err) {
      console.error('Failed to archive particle:', err);
      alert('Failed to archive particle: ' + err.message);
    }
  }

  /**
   * Show a temporary message to the user
   * @param {string} message - The message to show
   * @param {string} type - Message type ('success', 'error', 'info')
   */
  showMessage(message, type = 'info') {
    // Remove any existing messages
    const existingMessage = document.querySelector('.dashboard-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `dashboard-message message-${type}`;
    messageElement.textContent = message;
    
    // Style the message
    messageElement.style.position = 'fixed';
    messageElement.style.top = '20px';
    messageElement.style.right = '20px';
    messageElement.style.padding = '10px 15px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.zIndex = '1000';
    messageElement.style.backgroundColor = type === 'success' ? '#4CAF50' : 
                                         type === 'error' ? '#f44336' : '#2196F3';
    messageElement.style.color = 'white';
    
    // Add to page
    document.body.appendChild(messageElement);
    
    // Remove after 3 seconds
    setTimeout(() => {
      messageElement.remove();
    }, 3000);
  }

  /**
   * Refresh the current view
   */
  async refresh() {
    await this.renderList();
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.endsWith('dashboard.html')) {
    window.dashboardController = new DashboardController();
  }
});