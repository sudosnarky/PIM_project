# Minimalist PARA PIM  

A minimalist, Markdown-powered **Personal Information Management (PIM) app** built with HTML and CSS, with optional JavaScript for interactivity.  

This app implements the **PARA Method (Projects, Areas, Resources, Archives)** to organize notes and knowledge into a structured, easy-to-navigate system. The design takes inspiration from modern productivity and note-taking tools, with a strong focus on **clarity, minimalism, and presentation-ready UI/UX**.  

---

## Features  

- **Login Page** – Simple username and password form.  
- **Dashboard** – Centralized search bar, "Create Particle" button, and categorized item listing.  
- **Items List** – Browse notes ("particles") with View and Edit actions.  
- **Markdown Support** – Notes support bold, italics, code blocks, and links.  
- **Snippet Previews** – Display the first 4 lines of a note, with scroll for longer content.  
- **Tagging System** – Inline hashtags (`#HTML`, `#Markdown`) automatically render as pill-shaped tags.  
- **Particle Linking** – Each note has a unique ID (`#45`) for cross-referencing.  
- **PARA Organization** – Organize notes into Projects, Areas, Resources, and Archives.  
- **Minimalist Dark Theme** – Flat inputs, rounded buttons, modern typography.  

---

## Screens Overview  

### Login Page  
- Centered login form.  
- Fields: Username, Password.  
- Button: **Sign In** (cyan).  

### Dashboard  
- Title: **PIM Labs**.  
- Top search bar with Create Particle (orange) and Search (cyan) buttons.  
- Notes listed with snippet previews.  
- View (green) and Edit (light green) buttons aligned to the right.  

### Snippet Preview  
- Shows first 4 lines of content.  
- Longer notes scroll within the preview area.  

### Full Article View  
- Displays full rendered Markdown content.  
- Links styled in blue, underline on hover.  
- Hashtags as pill-shaped tags.  
- Particle ID shown in orange pill format (`#45`).  

### Edit Mode  
- Title field at the top.  
- Raw Markdown textarea (monospace font).  
- Save button (green).  

---

## Design Guidelines  

**Color Palette**  
- Background: `#0a0a0a`  
- Text (body): `#e0e0e0`  
- Headings: `#ffffff`  
- Primary button: `#00aaff`  
- Secondary button: `#ff7f32`  
- View button: `#4CAF50`  
- Edit button: `#8BC34A`  
- Tags: `#6c63ff`, `#8c52ff`, `#ffb347`  

**Typography**  
- Body: *Inter*, *Segoe UI*, sans-serif (300–400 weight)  
- Headings: Bold (600–700 weight)  
- Code/Textareas: *Fira Code*, monospace  

**Layout**  
- Center-aligned forms and content  
- 16–24px padding  
- Rounded buttons (`border-radius: 20px`)  
- Minimal borders (`1px solid rgba(255,255,255,0.1)`)  

---

## PARA Integration  

The app reflects the **PARA Method**:  
- **Projects** – Notes tied to active deliverables.  
- **Areas** – Notes related to ongoing responsibilities.  
- **Resources** – Knowledge and reference materials.  
- **Archives** – Completed or inactive items.  

Implementation includes:  
- Sidebar or dropdown filters for PARA categories.  
- Clicking a section filters items on the dashboard.  

---

## Future Enhancements  

- Live search (filter notes as you type).  
- Markdown-to-HTML conversion in-browser.  
- LocalStorage or lightweight backend integration.  
- Drag-and-drop organization between PARA sections.  
- Dark/light theme toggle.  

---

## Usage Instructions  

1. Clone or download the repository.  
2. Open `index.html` in a browser.  
3. Sign in to access the dashboard.  
4. Use the search bar and Create Particle button to manage notes.  
5. View notes in rendered Markdown or switch to edit mode to modify raw Markdown.  

---

## Tech Stack  

- **HTML5** – Structure  
- **CSS3** – Styling (Flexbox, Grid)  
- **JavaScript (optional)** – Interactivity  

---

## License  

This project is free to use for personal productivity experiments, demos, and presentations.  
