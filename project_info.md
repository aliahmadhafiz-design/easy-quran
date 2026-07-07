# FOA Quran Project Information

## 1. Project Overview
FOA Quran is a single-page application (SPA) for a Quran academy platform. It provides a modern web-based interface for browsing Quran content, navigating surahs, paras, and rukus, and managing related academy features such as attendance, homework, planner, and student pages.

The project is designed to be simple, lightweight, and easy to maintain. The main UI is built with HTML, CSS, and vanilla JavaScript without a heavy framework.

## 2. Project Purpose
This software is intended to help an academy or Quran teaching center:
- display Quran content in an attractive reader view,
- navigate surahs, paras, and rukus easily,
- manage attendance records,
- manage homework and lesson sheets,
- organize planner and student-related information.

## 3. Project Structure
Root structure:
- index.html — main SPA shell and layout container
- src/
  - components/ — reusable HTML fragments such as navbar, sidebar, profile
  - css/ — global styling and Quran page styling
  - js/
    - app.js — main SPA router and shared app logic
    - dashboard.js — dashboard page logic
    - quran.js — Quran reader and navigation logic
    - attendance.js — attendance-related logic
    - homework.js — homework-related logic
    - planner.js — planner-related logic
  - pages/ — page HTML templates for each route
- res/
  - database/ — Quran SQLite database and documentation
  - font/ — Urdu and Arabic font files
  - image/ — icons, logos, headers, dividers, etc.

## 4. Application Type
This is a client-side SPA (Single Page Application).

### How SPA works
- The main shell is loaded once from index.html.
- Different pages are injected dynamically into the main content area.
- Navigation uses hash-based routing such as:
  - #/quran
  - #/dashboard
  - #/attendance
  - #/homework
  - #/planner
  - #/students

## 5. Core Technologies
- HTML5
- CSS3
- Vanilla JavaScript
- Tailwind-like utility classes used in the markup
- SQLite database loaded in browser using sql.js

## 6. Database
The Quran data is stored in a local SQLite database file:
- res/database/quran_database.db

### Database purpose
The database stores Quran-related content such as:
- surahs
- paras
- rukus
- verses

### Important note
The application loads the database client-side in the browser using sql.js, so the Quran content is available without a backend server.

## 7. Quran Reader Features
The Quran page is designed to display Quran text in a clean and attractive reader-like layout.

### Current Quran features
- Surah-based navigation
- Para-based navigation
- Ruku-based navigation
- Verse navigation from sidebar
- Physical-style continuous Quran text rendering
- Arabic / Urdu typography support
- Smooth scrolling to selected ayah or ruku

## 8. Styling Approach
The styling system is mainly controlled through:
- src/css/global.css — shared project styles
- inline utility classes in HTML templates

### Styling notes
- The app uses a clean, premium-looking UI with rounded cards and soft shadows.
- Quran text uses custom fonts for Arabic/Urdu appearance.
- The Quran page uses special styling for headers, verse display, and continuous text layout.

## 9. JavaScript Architecture
The project is divided into page-specific scripts and one main SPA script.

### Main app responsibilities
- routing between pages
- loading page templates
- managing shared state
- loading the Quran database once
- handling global navigation and layout behavior

### Page-specific scripts
- dashboard.js — dashboard page UI and dashboard card rendering
- quran.js — Quran page reader, sidebar, navigation, and rendering
- attendance.js — attendance page logic
- homework.js — homework page logic
- planner.js — planner page logic

This separation makes it easier for future edits and maintenance.

## 10. Page Routes
The app includes these main pages:
- /quran — Quran reader page
- /dashboard — dashboard landing page
- /attendance — attendance page
- /homework — homework page
- /planner — planner page
- /students — students page

## 11. Navigation Model
Navigation is handled by hash routing.

Example:
- #/quran
- #/quran?surah=1
- #/quran?para=1
- #/quran?surah=2&ayah=10

This makes it easy to share direct links to a selected Quran section.

## 12. Assets
The project uses local assets such as:
- logos
- icons
- headers
- dividers
- fonts

These assets are stored under the res/ folder.

## 13. Developer Notes
### Recommended editing approach
- Edit page structure in src/pages/*.html
- Edit page behavior in the matching JS file in src/js/
- Edit shared styling in src/css/global.css
- Avoid changing app.js unless you need to change central routing or app-wide behavior

### Benefits of this structure
- easier collaboration
- easier debugging
- easier future upgrades
- easier AI-assisted editing

## 14. How to Run the Project
Because this is a static frontend project, it can be opened locally using a simple static server.

Recommended approach:
- open the project in VS Code
- use Live Server or another local static server

## 15. Notes for Future Developers / AI Tools
When working on this project, keep in mind:
- this is a frontend-only SPA,
- Quran data is loaded from a local SQLite file,
- the app relies on browser-side JavaScript,
- page-specific logic should stay isolated in its own JS module,
- shared styling should be kept consistent in the global CSS file.

## 16. Summary
FOA Quran is a modern, lightweight SPA for Quran academy usage. It combines:
- Quran reading experience,
- database-driven content,
- clean SPA navigation,
- modular JavaScript structure,
- attractive custom styling.

This project is structured in a way that makes it easy to maintain, extend, and hand over to another developer or AI tool.
