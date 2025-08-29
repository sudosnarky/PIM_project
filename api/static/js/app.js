// PARA InfoSystem App Frontend JS (API-integrated)
// Handles login, dashboard, note CRUD, PARA filtering, search, markdown rendering, tags, and backend persistence

/**
 * Get the API base URL for backend requests.
 * @type {string}
 */
const API = window.location.hostname.includes('render.com') 
  ? 'https://pim-project.onrender.com'  // Deployment URL - update this with your actual domain
  : window.location.origin.replace(/\/static.*/, '');

/**
 * Get the authentication token from localStorage.
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem('pim_token');
}

/**
 * Set the authentication token in localStorage.
 * @param {string} token
 */
function setToken(token) {
  localStorage.setItem('pim_token', token);
}

/**
 * Remove the authentication token from localStorage.
 */
function clearToken() {
  localStorage.removeItem('pim_token');
}

/**
 * Get the username from localStorage.
 * @returns {string|null}
 */
function getUser() {
  return localStorage.getItem('pim_user');
}

/**
 * Set the username in localStorage.
 * @param {string} username
 */
function setUser(username) {
  localStorage.setItem('pim_user', username);
}

/**
 * Remove the username from localStorage.
 */
function clearUser() {
  localStorage.removeItem('pim_user');
}

/**
 * Make an authenticated API request to the backend.
 * @param {string} path - API endpoint path
 * @param {object} opts - Fetch options
 * @returns {Promise<any>} - Parsed JSON response
 */
async function apiFetch(path, opts = {}) {
  opts.headers = opts.headers || {};
  if (getToken()) opts.headers['Authorization'] = 'Bearer ' + getToken();
  if (!opts.headers['Content-Type'] && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
  }
  if (opts.body && typeof opts.body !== 'string' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }
  
  // Add better error handling and debugging for deployment
  console.log(`Sending request to: ${API + path}`);
  try {
    const res = await fetch(API + path, opts);
    console.log(`Response status: ${res.status}`);
    
    if (res.status === 401) {
      clearToken();
      clearUser();
      alert('Session expired. Please log in again.');
      window.location.href = 'index.html';
      throw new Error('Unauthorized');
    }
    
    if (!res.ok) {
      let msg = 'API error';
      try { 
        const errorData = await res.json();
        console.error('API error data:', errorData);
        msg = errorData.detail || msg; 
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }
      throw new Error(`${msg} (Status: ${res.status})`);
    }
    
    return res.json();
  } catch (error) {
    console.error('Network or API error:', error);
    throw error;
  }
}

/**
 * Convert Markdown to HTML for note rendering.
 * Supports headings, bold, italics, code, links, lists, blockquotes, and hashtags.
 * @param {string} md - Markdown string
 * @returns {string} - HTML string
 */
function markdownToHtml(md) {
  let html = md
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^\s*\n/gim, '<br>')
    .replace(/\n/g, '<br>');
  // Lists
  html = html.replace(/<br>\s*\* (.*?)(?=<br>|$)/g, '<ul><li>$1</li></ul>');
  html = html.replace(/<br>\s*\d+\. (.*?)(?=<br>|$)/g, '<ol><li>$1</li></ol>');
  // Hashtags to tags
  html = html.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
  return html;
}

// --- Login & Registration Page ---
if (location.pathname.endsWith('index.html')) {
  const loginBox = document.getElementById('login-box');
  const registerBox = document.getElementById('register-box');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  if (showRegister && showLogin && loginBox && registerBox) {
    showRegister.onclick = e => { e.preventDefault(); loginBox.style.display = 'none'; registerBox.style.display = ''; };
    showLogin.onclick = e => { e.preventDefault(); registerBox.style.display = 'none'; loginBox.style.display = ''; };
  }
  if (loginBtn) {
    loginBtn.onclick = async function(e) {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();
      if (!username || !password) return alert('Username and password required.');
      try {
        const form = new FormData();
        form.append('username', username);
        form.append('password', password);
        const res = await fetch(API + '/token', { method: 'POST', body: form });
        if (!res.ok) throw new Error('Login failed');
        const data = await res.json();
        setToken(data.access_token);
        setUser(username);
        // On first login, show onboarding
        if (!localStorage.getItem('onboarded')) {
          localStorage.setItem('onboarded', '1');
          window.location.href = 'onboarding.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      } catch (err) {
        alert('Login failed: ' + err.message);
      }
    };
  }
  if (registerBtn) {
    registerBtn.onclick = async function(e) {
      e.preventDefault();
      const username = document.getElementById('register-username').value.trim();
      const password = document.getElementById('register-password').value.trim();
      if (!username || !password) return alert('Username and password required.');
      try {
        await apiFetch('/register', {
          method: 'POST',
          body: { username, password }
        });
        // After first registration, show onboarding
        localStorage.setItem('onboarded', '1');
        window.location.href = 'onboarding.html';
      } catch (err) {
        alert('Registration failed: ' + err.message);
      }
    };
  }
}

// --- Dashboard Page ---
if (location.pathname.endsWith('dashboard.html')) {
  const paraTabs = document.querySelectorAll('.para-tab');
  const searchInput = document.querySelector('.search-input');
  const itemsList = document.querySelector('.items-list');
  const createBtn = document.getElementById('create-particle-btn');
  const logoutBtn = document.getElementById('logout-btn');
  let currentSection = 'Projects';
  let particles = [];

  if (logoutBtn) {
    logoutBtn.onclick = function() {
      clearToken();
      clearUser();
      window.location.href = 'index.html';
    };
  }

  async function fetchParticles() {
    let url = `/particles?section=${encodeURIComponent(currentSection)}`;
    const q = searchInput.value.trim();
    if (q) url += `&q=${encodeURIComponent(q)}`;
    try {
      particles = await apiFetch(url);
    } catch (err) {
      alert('Failed to load notes: ' + err.message);
      particles = [];
    }
  }
  async function renderList() {
    await fetchParticles();
    itemsList.innerHTML = '';
    particles.forEach(p => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-info">
          <h3 class="item-title">${p.title}</h3>
          <p class="item-snippet" style="max-height:6em;overflow-y:auto;">${p.content.split('\n').slice(0,4).join('<br>')}</p>
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
      // Set current section as selected in dropdown
      const select = card.querySelector('.move-section');
      if (select) select.value = p.section;
    });

    // Move section handler
    itemsList.querySelectorAll('.move-section').forEach(sel => {
      sel.addEventListener('change', async function() {
        const id = this.getAttribute('data-id');
        const newSection = this.value;
        const particle = particles.find(p => p.id == id);
        if (!particle) return;
        try {
          await apiFetch(`/particles/${id}`, {
            method: 'PUT',
            body: { ...particle, section: newSection }
          });
          renderList();
        } catch (err) {
          alert('Failed to move: ' + err.message);
        }
      });
    });
    // Archive button handler
    itemsList.querySelectorAll('.archive-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const id = this.getAttribute('data-id');
        const particle = particles.find(p => p.id == id);
        if (!particle) return;
        try {
          await apiFetch(`/particles/${id}`, {
            method: 'PUT',
            body: { ...particle, section: 'Archives' }
          });
          renderList();
        } catch (err) {
          alert('Failed to archive: ' + err.message);
        }
      });
    });
  }
  paraTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      paraTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentSection = this.textContent;
      renderList();
    });
  });
  searchInput.addEventListener('input', renderList);
  createBtn.addEventListener('click', function() {
    location.href = 'edit.html';
  });
  renderList();
}

// --- Edit Page ---
if (location.pathname.endsWith('edit.html')) {
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get('id');
  const titleInput = document.querySelector('.article-header input');
  const mdEditor = document.querySelector('.markdown-editor');
  const tagsInput = document.querySelector('input[placeholder*="tags"]');
  const saveBtn = document.querySelector('.btn-primary');
  let editing = null;
  async function loadParticle() {
    if (id) {
      try {
        editing = await apiFetch(`/particles/${id}`);
        titleInput.value = editing.title;
        mdEditor.value = editing.content;
        tagsInput.value = (editing.tags || []).join(', ');
      } catch (err) {
        alert('Failed to load note: ' + err.message);
      }
    }
  }
  saveBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    const title = titleInput.value.trim();
    const content = mdEditor.value.trim();
    // Robust tag handling: split by comma, trim, filter empty, always send array
    let tags = tagsInput.value
      .split(',')
      .map(t => t.trim())
      .filter((t, i, arr) => t && arr.indexOf(t) === i); // remove empty and duplicates
    if (!Array.isArray(tags)) tags = [];
    if (!title || !content) return alert('Title and content required.');
    try {
      let particle;
      if (editing) {
        particle = await apiFetch(`/particles/${id}`, {
          method: 'PUT',
          body: { title, content, tags, section: editing.section || 'Projects' }
        });
      } else {
        particle = await apiFetch('/particles', {
          method: 'POST',
          body: { title, content, tags, section: 'Projects' }
        });
      }
      window.location.href = `view.html?id=${particle.id}`;
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  });
  loadParticle();
}

// --- View Page ---
if (location.pathname.endsWith('view.html')) {
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get('id');
  const h1 = document.querySelector('.article-header h1');
  const contentDiv = document.querySelector('.article-content');
  const tagsDiv = document.querySelector('.tags-container');
  // Modal for tag search results
  function showTagModal(tag, particles) {
    let modal = document.createElement('div');
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
    modal.innerHTML = `<div style="background:#222;padding:2em;max-width:600px;width:90vw;border-radius:16px;max-height:80vh;overflow:auto;">
      <h2 style="margin-bottom:1em;">Particles with tag <span class='hashtag'>#${tag}</span></h2>
      <button style="float:right;margin-top:-2.5em;margin-right:-2em;font-size:1.5em;background:none;border:none;color:#fff;cursor:pointer;" id="close-tag-modal">&times;</button>
      <div id="tag-particles-list"></div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('close-tag-modal').onclick = () => modal.remove();
    const list = modal.querySelector('#tag-particles-list');
    if (particles.length === 0) {
      list.innerHTML = '<p>No particles found for this tag.</p>';
    } else {
      list.innerHTML = particles.map(p =>
        `<div style='margin-bottom:1em;padding:1em;background:#333;border-radius:10px;'>
          <h3 style='margin:0 0 0.5em 0;'>${p.title}</h3>
          <div style='font-size:0.95em;color:#aaa;margin-bottom:0.5em;'>${p.section} &middot; ${p.created ? p.created.split('T')[0] : ''}</div>
          <div style='margin-bottom:0.5em;'>${(p.tags||[]).map(t=>`<span class='hashtag'>#${t}</span>`).join(' ')}</div>
          <a href="view.html?id=${p.id}" class="btn btn-view">View</a>
        </div>`
      ).join('');
    }
  }

  async function loadParticle() {
    try {
      const particle = await apiFetch(`/particles/${id}`);
      h1.textContent = particle.title;
      contentDiv.innerHTML = markdownToHtml(particle.content);
      tagsDiv.innerHTML = `<span class="tag tag-id">#${particle.id}</span>` +
        (particle.tags || []).map((t,i) => `<span class="tag tag-${['','purple','orange'][i%3]} tag-clickable" data-tag="${t}">${t}</span>`).join('');

      // Add click event to tags
      tagsDiv.querySelectorAll('.tag-clickable').forEach(tagEl => {
        tagEl.style.cursor = 'pointer';
        tagEl.onclick = async function() {
          const tag = this.getAttribute('data-tag');
          let particles = [];
          try {
            // Fetch all particles for the user and filter by tag
            particles = await apiFetch(`/particles`);
            particles = particles.filter(p => (p.tags||[]).map(t=>t.toLowerCase()).includes(tag.toLowerCase()));
          } catch {}
          showTagModal(tag, particles);
        };
      });
    } catch (err) {
      h1.textContent = 'Not found';
      contentDiv.textContent = err.message;
      tagsDiv.innerHTML = '';
    }
  }
  loadParticle();
}
