// PARA InfoSystem App Frontend JS (API-integrated)
// Handles login, dashboard, note CRUD, PARA filtering, search, markdown rendering, tags, and backend persistence

/**
 * Get the API base URL for backend requests.
 * Dynamically determines if we're running in production (render.com) or local development
 * @type {string}
 */
const API_BASE_URL = window.location.hostname.includes('render.com') 
  ? 'https://pim-project-qgyu.onrender.com'  // Production URL when deployed on Render
  : window.location.origin.replace(/\/static.*/, '');  // Local development URL

// === AUTHENTICATION TOKEN MANAGEMENT ===
// These functions handle storing/retrieving the user's authentication token in browser storage

/**
 * Retrieve the authentication token from browser's localStorage
 * @returns {string|null} The stored token or null if not found
 */
function getToken() {
  return localStorage.getItem('pimToken');
}

/**
 * Store the authentication token in browser's localStorage
 * @param {string} token - JWT token received from server after successful login
 */
function setToken(token) {
  localStorage.setItem('pimToken', token);
  // Store token timestamp for expiration checking (24 hour expiry)
  localStorage.setItem('pimTokenTime', Date.now().toString());
}

/**
 * Check if the stored token is expired (24 hour limit)
 * @returns {boolean} - True if token is expired or missing
 */
function isTokenExpired() {
  const tokenTime = localStorage.getItem('pimTokenTime');
  if (!tokenTime) return true;
  
  const tokenAge = Date.now() - parseInt(tokenTime);
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return tokenAge > twentyFourHours;
}

/**
 * Remove the authentication token from localStorage (used during logout)
 */
function clearToken() {
  localStorage.removeItem('pimToken');
  localStorage.removeItem('pimTokenTime');
}

// === USER SESSION MANAGEMENT ===
// These functions handle storing/retrieving the username in browser storage

/**
 * Retrieve the current username from localStorage
 * @returns {string|null} The stored username or null if not logged in
 */
function getUser() {
  return localStorage.getItem('pimUser');
}

/**
 * Store the username in localStorage after successful login
 * @param {string} username - The user's username
 */
function setUser(username) {
  localStorage.setItem('pimUser', username);
}

/**
 * Remove the username from localStorage (used during logout)
 */
function clearUser() {
  localStorage.removeItem('pimUser');
}

// === API COMMUNICATION FUNCTION ===
/**
 * Makes authenticated HTTP requests to the backend API
 * Automatically handles token authentication, JSON formatting, and error responses
 * @param {string} path - API endpoint path (e.g., '/particles', '/login')
 * @param {object} opts - Fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} - Parsed JSON response from server
 */
async function apiFetch(path, opts = {}) {
  // Check for token expiration before making request
  if (getToken() && isTokenExpired()) {
    clearToken();
    clearUser();
    alert('Your session has expired. Please log in again.');
    window.location.href = 'index.html';
    throw new Error('Token expired');
  }
  
  // Initialize headers object if not provided
  opts.headers = opts.headers || {};
  
  // Add authentication token to request headers if user is logged in
  if (getToken()) {
    opts.headers['Authorization'] = 'Bearer ' + getToken();
  }
  
  // Set content type to JSON for non-form data requests
  if (!opts.headers['Content-Type'] && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
  }
  
  // Convert JavaScript objects to JSON strings for the request body
  if (opts.body && typeof opts.body !== 'string' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }
  
  // Send the HTTP request to the server
  const res = await fetch(API_BASE_URL + path, opts);
  
  // Handle authentication errors (invalid/expired token)
  if (res.status === 401) {
    // Clear stored credentials and redirect to login
    clearToken();
    clearUser();
    alert('Session expired. Please log in again.');
    window.location.href = 'index.html';
    throw new Error('Unauthorized');
  }
  
  // Handle other HTTP errors
  if (!res.ok) {
    let msg = 'API error';
    try { 
      // Try to extract error message from server response
      const errorData = await res.json();
      msg = errorData.detail || msg; 
    } catch (parseError) {
      // If we can't parse the error response, use generic message
    }
    throw new Error(`${msg} (Status: ${res.status})`);
  }
  
  // Parse and return successful response as JSON
  return res.json();
}

// === SECURITY UTILITIES ===
/**
 * Escape HTML characters to prevent XSS attacks
 * @param {string} unsafe - User input that may contain malicious HTML
 * @returns {string} - Safe HTML-escaped text
 */
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate input length to prevent excessive data
 * @param {string} input - Input to validate
 * @param {number} maxLength - Maximum allowed length
 * @param {string} fieldName - Name of field for error messages
 * @returns {boolean} - True if valid, false otherwise
 */
function validateLength(input, maxLength, fieldName) {
  if (input.length > maxLength) {
    alert(`${fieldName} must be under ${maxLength} characters (currently ${input.length})`);
    return false;
  }
  return true;
}

/**
 * Validate and sanitize tag input
 * @param {string} tagString - Comma-separated tag string
 * @returns {string[]} - Array of valid, sanitized tags
 */
function validateTags(tagString) {
  if (!tagString) return [];
  
  return tagString
    .split(',')
    .map(t => t.trim())
    .filter(t => {
      // Only allow alphanumeric, hyphens, and underscores
      return t && /^[a-zA-Z0-9_-]+$/.test(t) && t.length <= 50;
    })
    .filter((t, i, arr) => arr.indexOf(t) === i) // Remove duplicates
    .slice(0, 10); // Limit to 10 tags max
}

// === MARKDOWN TO HTML CONVERTER ===
/**
 * Converts Markdown syntax to HTML for display in the browser
 * Supports headings, bold, italics, code, links, lists, blockquotes, and hashtags
 * @param {string} md - Raw markdown text from user input
 * @returns {string} - Sanitized HTML formatted text ready for display
 */
function markdownToHtml(md) {
  if (typeof md !== 'string') return '';
  
  // First escape any existing HTML to prevent XSS
  let html = escapeHtml(md)
    // Convert markdown headings to HTML headings (# = h1, ## = h2, etc.)
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Convert **bold** text to <strong> tags
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Convert *italic* text to <em> tags
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Convert `code` text to <code> tags
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    // Convert [link text](url) to <a> tags with safe URL validation
    .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Convert > blockquotes to <blockquote> tags
    .replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>')
    // Convert empty lines to <br> tags
    .replace(/^\s*\n/gim, '<br>')
    // Convert all remaining newlines to <br> tags
    .replace(/\n/g, '<br>');
    
  // Convert bullet lists (* item) to HTML <ul><li> structure
  html = html.replace(/<br>\s*\* (.*?)(?=<br>|$)/g, '<ul><li>$1</li></ul>');
  // Convert numbered lists (1. item) to HTML <ol><li> structure
  html = html.replace(/<br>\s*\d+\. (.*?)(?=<br>|$)/g, '<ol><li>$1</li></ol>');
  // Convert #hashtags to clickable spans with special styling
  html = html.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
  
  return html;
}

// ===== LOGIN & REGISTRATION PAGE LOGIC =====
// This code only runs when the user is on the index.html (login) page
if (location.pathname.endsWith('index.html')) {
  // Get references to all the form elements and buttons on the login page
  const loginBox = document.getElementById('login-box');
  const registerBox = document.getElementById('register-box');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  
  // Set up toggle buttons to switch between login and registration forms
  if (showRegister && showLogin && loginBox && registerBox) {
    // When "Register" link is clicked, hide login form and show register form
    showRegister.onclick = e => {
      e.preventDefault();  // Prevent default link behavior
      loginBox.style.display = 'none';
      registerBox.style.display = '';
    };
    // When "Login" link is clicked, hide register form and show login form
    showLogin.onclick = e => {
      e.preventDefault();  // Prevent default link behavior
      registerBox.style.display = 'none';
      loginBox.style.display = '';
    };
  }
  
  // === LOGIN BUTTON HANDLER ===
  if (loginBtn) {
    loginBtn.onclick = async function(e) {
      e.preventDefault();  // Prevent form submission reload
      
      // Get the username and password from input fields, removing extra whitespace
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();
      
      // Basic validation - make sure both fields are filled
      if (!username || !password) return alert('Username and password required.');
      
      // Validate input lengths
      if (!validateLength(username, 50, 'Username')) return;
      if (!validateLength(password, 100, 'Password')) return;
      
      try {
        // Create form data for the login request (API expects form data, not JSON)
        const form = new FormData();
        form.append('username', username);
        form.append('password', password);
        
        // Send login request to server
        const res = await fetch(API_BASE_URL + '/token', { method: 'POST', body: form });
        if (!res.ok) throw new Error('Login failed');
        
        // Parse the response to get the authentication token
        const data = await res.json();
        setToken(data.access_token);  // Store token for future API requests
        setUser(username);           // Store username for display purposes
        
        // Check if this is the user's first login (show onboarding if so)
        if (!localStorage.getItem('onboarded')) {
          localStorage.setItem('onboarded', '1');
          window.location.href = 'onboarding.html';
        } else {
          // Existing user - go straight to dashboard
          window.location.href = 'dashboard.html';
        }
      } catch (err) {
        // Show error message if login fails
        alert('Login failed: ' + err.message);
      }
    };
  }
  
  // === REGISTRATION BUTTON HANDLER ===
  if (registerBtn) {
    registerBtn.onclick = async function(e) {
      e.preventDefault();  // Prevent form submission reload
      
      // Get the username and password from registration form inputs
      const username = document.getElementById('register-username').value.trim();
      const password = document.getElementById('register-password').value.trim();
      
      // Basic validation - make sure both fields are filled
      if (!username || !password) return alert('Username and password required.');
      
      // Validate input lengths  
      if (!validateLength(username, 50, 'Username')) return;
      if (!validateLength(password, 100, 'Password')) return;
      
      try {
        // Send registration request to server using our API function
        await apiFetch('/register', {
          method: 'POST',
          body: { username, password }  // This gets converted to JSON automatically
        });
        
        // Mark user as having seen onboarding after successful registration
        localStorage.setItem('onboarded', '1');
        window.location.href = 'onboarding.html';
      } catch (err) {
        // Show error message if registration fails
        alert('Registration failed: ' + err.message);
      }
    };
  }
}

// ===== DASHBOARD PAGE LOGIC =====
// This code only runs when the user is on the dashboard.html page
if (location.pathname.endsWith('dashboard.html')) {
  // Get references to all the dashboard interface elements
  const paraTabs = document.querySelectorAll('.para-tab');     // PARA method tabs (Projects, Areas, Resources, Archives)
  const searchInput = document.querySelector('.search-input');  // Search box for filtering notes
  const itemsList = document.querySelector('.items-list');     // Container where note cards are displayed
  const createBtn = document.getElementById('create-particle-btn'); // "New Note" button
  const logoutBtn = document.getElementById('logout-btn');      // Logout button
  
  // Variables to track current state
  let currentSection = 'Projects';  // Which PARA tab is currently active
  let particles = [];               // Array to store all notes from server

  // === LOGOUT BUTTON HANDLER ===
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      clearToken();  // Remove authentication token from localStorage
      clearUser();   // Remove username from localStorage
      window.location.href = 'index.html';  // Redirect to login page
    };
  }

  // === FETCH NOTES FROM SERVER ===
  async function fetchParticles() {
    // Build URL with current section and search query
    let url = `/particles?section=${encodeURIComponent(currentSection)}`;
    const q = searchInput.value.trim();
    if (q) url += `&q=${encodeURIComponent(q)}`;  // Add search query if user entered text
    
    try {
      // Get notes from API using our authenticated fetch function
      particles = await apiFetch(url);
    } catch (err) {
      alert('Failed to load notes: ' + err.message);
      particles = [];  // Set to empty array on error
    }
  }

  // === RENDER NOTES LIST IN DASHBOARD ===
  async function renderList() {
    await fetchParticles();  // Get latest data from server
    itemsList.innerHTML = '';  // Clear existing content
    
    // Create a card for each note
    particles.forEach(p => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-info">
          <h3 class="item-title">${escapeHtml(p.title)}</h3>
          <p class="item-snippet" style="max-height:6em;overflow-y:auto;">${escapeHtml(p.content.split('\n').slice(0, 4).join(' '))}</p>
        </div>
        <div class="item-actions" style="display:flex;gap:0.5em;align-items:center;">
          <a href="view.html?id=${p.id}" class="btn btn-view">View</a>
          <a href="edit.html?id=${p.id}" class="btn btn-edit">Edit</a>
          <select class="move-section" data-id="${p.id}" style="border-radius:12px;padding:0.2em 0.7em;">
            <option disabled selected>Move</option>
            <option value="Projects">Projects</option>
            <option value="Areas">Areas</option>
            <option value="Resources">Resources</option>
            <option value="Archives">Archives</option>
          </select>
          <button class="btn btn-secondary archive-btn" data-id="${p.id}" style="padding:0.2em 1em;">Archive</button>
        </div>`;
      itemsList.appendChild(card);
      
      // Set the dropdown to show current section of this note
      const select = card.querySelector('.move-section');
      if (select) select.value = p.section;
    });

    // === MOVE SECTION FUNCTIONALITY ===
    // Set up event listeners for "Move" dropdowns on each note card
    itemsList.querySelectorAll('.move-section').forEach(sel => {
      sel.addEventListener('change', async function() {
        const id = this.getAttribute('data-id');      // Get note ID from dropdown
        const newSection = this.value;                // Get selected new section
        const particle = particles.find(p => p.id === parseInt(id)); // Find the note object
        if (!particle) return;
        
        try {
          // Send update request to server to change note's section
          await apiFetch(`/particles/${id}`, {
            method: 'PUT',
            body: { ...particle, section: newSection }  // Keep all fields, just change section
          });
          renderList();  // Refresh the display after successful move
        } catch (err) {
          alert('Failed to move: ' + err.message);
        }
      });
    });
    
    // === ARCHIVE BUTTON FUNCTIONALITY ===
    // Set up event listeners for "Archive" buttons on each note card
    itemsList.querySelectorAll('.archive-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const id = this.getAttribute('data-id');      // Get note ID from button
        const particle = particles.find(p => p.id === parseInt(id)); // Find the note object
        if (!particle) return;
        
        try {
          // Send update request to move note to Archives section
          await apiFetch(`/particles/${id}`, {
            method: 'PUT',
            body: { ...particle, section: 'Archives' }  // Set section to Archives
          });
          renderList();  // Refresh the display after successful archive
        } catch (err) {
          alert('Failed to archive: ' + err.message);
        }
      });
    });
  }
  
  // === PARA TAB SWITCHING ===
  // Set up click handlers for Projects/Areas/Resources/Archives tabs
  paraTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove 'active' class from all tabs
      paraTabs.forEach(t => {
        t.classList.remove('active');
      });
      // Add 'active' class to clicked tab
      this.classList.add('active');
      // Update current section and reload notes for that section
      currentSection = this.textContent;
      renderList();
    });
  });
  
  // === SEARCH FUNCTIONALITY ===
  // When user types in search box, reload and filter notes
  searchInput.addEventListener('input', renderList);
  
  // === CREATE NEW NOTE BUTTON ===
  if (createBtn) {
    createBtn.addEventListener('click', function() {
      window.location.href = 'edit.html';  // Go to edit page without ID (creates new note)
    });
  }
  
  // Load and display notes when page first loads
  renderList();
}

// ===== EDIT PAGE LOGIC =====
// This code only runs when the user is on the edit.html page (creating/editing notes)
if (location.pathname.endsWith('edit.html')) {
  // Get the note ID from URL parameters (if editing existing note)
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get('id');  // Will be null if creating new note
  
  // Get references to all form elements on the edit page
  const titleInput = document.querySelector('.article-header input');    // Note title input field
  const mdEditor = document.querySelector('.markdown-editor');           // Markdown content textarea
  const tagsInput = document.querySelector('input[placeholder*="tags"]'); // Tags input field
  const saveBtn = document.querySelector('.btn-primary');                // Save button
  
  // Variable to store note data when editing existing note
  let editing = null;
  
  // === LOAD EXISTING NOTE FOR EDITING ===
  async function loadParticle() {
    if (!id) return;  // If no ID, we're creating a new note, so nothing to load
    
    try {
      // Fetch the existing note from the server
      editing = await apiFetch(`/particles/${id}`);
      
      // Populate form fields with existing note data
      titleInput.value = editing.title;
      mdEditor.value = editing.content;
      // Convert tags array back to comma-separated string for display
      tagsInput.value = (editing.tags || []).join(', ');
    } catch (err) {
      alert('Failed to load note: ' + err.message);
    }
  }
  
  // === SAVE NOTE FUNCTIONALITY ===
  saveBtn.addEventListener('click', async function(e) {
    e.preventDefault();  // Prevent form submission
    
    // Get values from form fields, removing extra whitespace
    const title = titleInput.value.trim();
    const content = mdEditor.value.trim();
    
    // Validation - ensure required fields are filled
    if (!title) {
      alert('Title is required.');
      titleInput.focus();  // Focus on the empty field for user convenience
      return;
    }
    
    if (!content) {
      alert('Content is required.');
      mdEditor.focus();    // Focus on the empty field for user convenience
      return;
    }
    
    // Validate input lengths
    if (!validateLength(title, 255, 'Title')) {
      titleInput.focus();
      return;
    }
    
    if (!validateLength(content, 10000, 'Content')) {
      mdEditor.focus();
      return;
    }
    
    // Process and validate tags input
    let tags = validateTags(tagsInput.value);
    
    try {
      let particle;  // Variable to store the saved note
      
      if (editing) {
        // UPDATING EXISTING NOTE
        particle = await apiFetch(`/particles/${id}`, {
          method: 'PUT',
          body: { 
            title, 
            content, 
            tags, 
            section: editing.section || 'Projects'  // Keep existing section or default to Projects
          }
        });
      } else {
        // CREATING NEW NOTE
        particle = await apiFetch('/particles', {
          method: 'POST',
          body: { 
            title, 
            content, 
            tags, 
            section: 'Projects'  // New notes default to Projects section
          }
        });
      }
      
      // After successful save, redirect to view the note
      window.location.href = `view.html?id=${particle.id}`;
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  });
  
  // Load existing note data if we're editing (not creating new)
  loadParticle();
}

// ===== VIEW PAGE LOGIC =====
// This code only runs when the user is on the view.html page (reading a note)
if (location.pathname.endsWith('view.html')) {
  // Get the note ID from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get('id');
  
  // Get references to page elements where we'll display note content
  const h1 = document.querySelector('.article-header h1');        // Note title display
  const contentDiv = document.querySelector('.article-content');   // Note content display
  const tagsDiv = document.querySelector('.tags-container');       // Tags display area
  
  // === TAG MODAL FUNCTIONALITY ===
  // Shows a popup window listing all notes that have a specific tag
  function showTagModal(tag, particles) {
    // Create modal overlay element with dark background
    let modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.7)';  // Semi-transparent dark overlay
    modal.style.zIndex = '9999';                 // Ensure modal appears above everything
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // Create modal content with list of related notes
    modal.innerHTML = `<div style="background:#222;padding:2em;max-width:600px;width:90vw;border-radius:16px;max-height:80vh;overflow:auto;">
      <h2 style="margin-bottom:1em;">Particles with tag <span class='hashtag'>#${escapeHtml(tag)}</span></h2>
      <button style="float:right;margin-top:-2.5em;margin-right:-2em;font-size:1.5em;background:none;border:none;color:#fff;cursor:pointer;" id="close-tag-modal">&times;</button>
      <div id="tag-particles-list"></div>
    </div>`;
    
    // Add modal to page and set up close button
    document.body.appendChild(modal);
    document.getElementById('close-tag-modal').onclick = () => modal.remove();
    
    // Populate the modal with notes that have this tag
    const list = modal.querySelector('#tag-particles-list');
    if (particles.length === 0) {
      list.innerHTML = '<p>No particles found for this tag.</p>';
    } else {
      // Create a card for each related note
      list.innerHTML = particles.map(p =>
        `<div style='margin-bottom:1em;padding:1em;background:#333;border-radius:10px;'>
          <h3 style='margin:0 0 0.5em 0;'>${escapeHtml(p.title)}</h3>
          <div style='font-size:0.95em;color:#aaa;margin-bottom:0.5em;'>${escapeHtml(p.section)} &middot; ${p.created ? escapeHtml(p.created.split('T')[0]) : ''}</div>
          <div style='margin-bottom:0.5em;'>${(p.tags || []).map(t => `<span class='hashtag'>#${escapeHtml(t)}</span>`).join(' ')}</div>
          <a href="view.html?id=${p.id}" class="btn btn-view">View</a>
        </div>`
      ).join('');
    }
  }

  // === LOAD AND DISPLAY NOTE ===
  async function loadParticle() {
    try {
      // Fetch the note data from the server
      const particle = await apiFetch(`/particles/${id}`);
      
      // Display the note title
      h1.textContent = particle.title;
      
      // Convert markdown content to HTML and display it
      contentDiv.innerHTML = markdownToHtml(particle.content);
      
      // Create tags display with the note ID and user-defined tags
      tagsDiv.innerHTML = `<span class="tag tag-id">#${particle.id}</span>` +
        (particle.tags || []).map((t, i) => 
          `<span class="tag tag-${['purple', 'orange'][i % 2]} tag-clickable" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`
        ).join('');

      // Make user-defined tags clickable to show related notes
      tagsDiv.querySelectorAll('.tag-clickable').forEach(tagEl => {
        tagEl.style.cursor = 'pointer';  // Show pointer cursor on hover
        tagEl.onclick = async function() {
          const tag = this.getAttribute('data-tag');  // Get the tag name
          let particles = [];
          
          try {
            // Fetch all notes and filter by this tag
            particles = await apiFetch(`/particles`);
            particles = particles.filter(p => 
              (p.tags || []).map(t => t.toLowerCase()).includes(tag.toLowerCase())
            );
          } catch (err) {
            // If API call fails, show modal with empty list
          }
          
          // Show modal with all notes that have this tag
          showTagModal(tag, particles);
        };
      });
    } catch (err) {
      // If note loading fails, show error message
      h1.textContent = 'Not found';
      contentDiv.textContent = err.message;
      tagsDiv.innerHTML = '';  // Clear tags area on error
    }
  }
  
  // Load and display the note when page loads
  loadParticle();
}
