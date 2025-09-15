# UI Design Document

## Overview
This document describes the user interface design for the PARA InfoSystem project. The goal is to provide a clean, intuitive, and responsive experience for users managing their notes and information using the PARA method.

---

## Design Principles
- **Simplicity:** Minimalist layout, clear navigation, and easy-to-read content.
- **Responsiveness:** Works on desktop, tablet, and mobile devices.
- **Accessibility:** Uses semantic HTML, proper labels, and keyboard navigation.
- **Consistency:** Reusable components and consistent color scheme.

---

## Main Screens

### 1. Login & Registration
- **Login Page:**  
  - Centered login box with username, password, and login button.
  - Link to registration form.
  - Error messages shown below inputs.
- **Registration Page:**  
  - Email, username, password fields.
  - Register button.
  - Link to login form.
  - Validation errors shown inline.

### 2. Dashboard
- **Header:**  
  - App logo and user menu (logout).
- **Sidebar (on desktop):**  
  - PARA categories (Projects, Areas, Resources, Archives).
  - Create Note button.
- **Main Area:**  
  - List/grid of notes (“particles”) with title, preview, tags, and category badge.
  - Search bar and filter options.
  - Responsive layout: sidebar collapses on mobile.

### 3. Create/Edit Note
- **Form Fields:**  
  - Title (input)
  - Content (markdown editor/textarea)
  - Tags (comma-separated input)
  - Category selector (dropdown for PARA)
  - Save Changes button
- **Validation:**  
  - Required fields highlighted.
  - Error messages shown below fields.

### 4. View Note
- **Note Display:**  
  - Title, content (rendered markdown), tags, category badge.
  - Edit and Delete buttons.
  - Metadata (created/updated date).

---

## Color Scheme & Typography
- **Primary Color:** #2D6A4F (green)
- **Accent Color:** #40916C (lighter green)
- **Background:** #F8F9FA (light gray)
- **Text:** #212529 (dark gray)
- **Font:** 'Inter', 'Roboto', sans-serif
- **Buttons:** Rounded corners, hover effects

---

## Accessibility Features
- All forms use `<label>` elements.
- Buttons and links are keyboard accessible.
- Sufficient color contrast for text and UI elements.
- ARIA roles for navigation and main content.

---

## Wireframe Sketches
*(See attached images or Figma link if available. Otherwise, wireframes are described below.)*
- **Login/Register:** Centered card, simple form, clear error messages.
- **Dashboard:** Sidebar navigation, main content grid, floating “Create” button on mobile.
- **Edit/View Note:** Form or read-only card, action buttons at top/right.

---

## Future Improvements
- Dark mode toggle.
- Drag-and-drop note organization.
- Rich text editor for note content.
- User profile/settings page.

---

*Document discussed and drafted by the PARA InfoSystem team (Sarah, Mike, Priya, and Alex).*
