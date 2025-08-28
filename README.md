A minimalist, aesthetic, Markdown-powered Personal Information Management (PIM) app built using HTML + CSS (with optional JavaScript for interactivity).

It follows the PARA Method (Projects, Areas, Resources, Archives) to organize knowledge and personal information in a structured, easy-to-navigate way.

This app is designed to be presentation-ready, with clean UI/UX inspired by productivity and note-taking tools.

✨ Features

🔐 Login Page – Simple username & password form.

🔎 Dashboard – Centralized search bar, "Create Particle" button, and list of items.

📄 Items List – View or Edit existing notes (called particles).

📝 Markdown Support – Notes can use bold, italics, code, and links
.

📚 Scrolling Snippets – Preview snippets scroll after 4 lines.

🏷 Tagging System – Hashtags (#Markdown, #HTML) automatically rendered as clickable pill-shaped tags.

🆔 Particle Linking – Each note gets an ID (#45) which can link to other notes.

🗂 PARA Organization – Notes can be organized into Projects, Areas, Resources, and Archives.

🎨 Minimalist Design – Dark theme, flat inputs, rounded buttons, modern fonts.

🖼 Screens Overview
1. Login Page

Centered login form.

Fields: Username, Password.

Button: Sign In (cyan).

2. Dashboard

App title: "PIM Labs".

Search bar at the top.

Buttons: Create Particle (orange), Search (cyan).

Below: List of notes, each with View (green) and Edit (light green) buttons.

3. Snippet Preview

Displays first 4 lines of a note.

If longer, shows a vertical scroll bar.

View/Edit buttons aligned to the right.

4. Full Article View

Displays the entire note in rendered Markdown.

Links styled blue & underlined on hover.

Hashtags shown as pill-shaped tags.

Particle ID displayed as an orange pill (e.g., #45).

5. Edit Mode

Title field at the top.

Raw Markdown text area (monospace font).

Save button (green).

🎨 Design Guidelines
Color Palette
Element	Color
Background	#0a0a0a
Text (body)	#e0e0e0
Headings	#ffffff
Primary button	#00aaff
Secondary button	#ff7f32
View button	#4CAF50
Edit button	#8BC34A
Tags	#6c63ff, #8c52ff, #ffb347 (varied pastels)
Typography

Font: "Inter", "Segoe UI", sans-serif

Headings: Bold (600–700)

Body: Regular (300–400)

Code/Textareas: "Fira Code", monospace

Layout

Center-aligned forms and content.

16–24px padding around elements.

Buttons: Rounded (border-radius: 20px).

Minimal borders (1px solid rgba(255,255,255,0.1)).
🗂 PARA Integration

The app is structured to reflect the PARA method:

Projects – Active notes related to specific deliverables.

Areas – Notes tied to ongoing responsibilities.

Resources – Knowledge and reference materials.

Archives – Inactive or completed notes.

For implementation:

Add a sidebar or filter dropdown with these four categories.

Clicking a section filters items on the dashboard.

🚀 Future Enhancements (Optional)

Add JavaScript for:

Live search (filter as you type).

Markdown-to-HTML conversion.

LocalStorage or simple backend integration.

Add drag-and-drop notes between PARA sections.

Add dark/light theme toggle.

📌 Usage Instructions

Clone/download this repository.

Open index.html in a browser.

Use Sign In → Navigate to dashboard.html.

From the dashboard, search, create, and manage notes.

Open an article → view Markdown rendered text.

Switch to edit mode → modify raw Markdown → Save.

🧑‍💻 Tech Stack

HTML5 for structure.

CSS3 for styling (flexbox, grid, custom classes).

(Optional) JavaScript for interactivity.

📜 License

This project is free to use for demos, presentations, and personal productivity experiments.