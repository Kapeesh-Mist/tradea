# AI Coding Agent Instructions for Tradea Project

Welcome to the Tradea project! This document provides essential guidelines for AI coding agents to be productive in this codebase. Follow these instructions to understand the architecture, workflows, and conventions specific to this project.

---

## Project Overview

The Tradea project consists of two main components:

1. **Backend (tradea-backend):**
   - Built with Python.
   - Organized into modular directories for database interactions (`db`), machine learning (`ml`), and API routes (`routes`).
   - Routes are defined in `app/routes/` and follow RESTful conventions.

2. **Frontend (tradea-frontend):**
   - Built with React.
   - Bootstrapped using Create React App.
   - Organized into `src/` with components, pages, and layout files.

---

## Key Files and Directories

### Backend
- **`app/routes/`**: Contains route handlers for the API. Each file corresponds to a specific feature (e.g., `auth.py`, `trade.py`).
- **`app/db/database.py`**: Handles database connections and queries.
- **`app/ml/train_trust_model.py`**: Contains machine learning logic for trust model training.

### Frontend
- **`src/pages/`**: Contains React components for different pages (e.g., `Dashboard.js`, `Chat.js`).
- **`src/components/`**: Reusable UI components (e.g., `Navbar.js`).
- **`src/Layout.js`**: Wraps pages with shared layout elements like navigation.

---

## Developer Workflows

### Backend
- **Run the backend server:**
  ```bash
  python main.py
  ```
- **Database migrations:** Ensure database scripts are updated in `app/db/`.
- **Testing:** Use `pytest` for backend tests.

### Frontend
- **Run the development server:**
  ```bash
  npm start
  ```
- **Build for production:**
  ```bash
  npm run build
  ```
- **Run tests:**
  ```bash
  npm test
  ```

---

## Project-Specific Conventions

1. **Backend Routes:**
   - Follow RESTful conventions.
   - Use descriptive function names (e.g., `get_user_profile` for `GET /user/{user_id}`).

2. **Frontend Routing:**
   - Defined in `App.js` using `react-router-dom`.
   - Pages are wrapped with `Layout` for consistent navigation.

3. **File Naming:**
   - Use PascalCase for React components (e.g., `Chat.js`).
   - Use snake_case for Python files and functions.

---

## Integration Points

- **Frontend-Backend Communication:**
  - The frontend communicates with the backend via RESTful APIs.
  - Example: `POST /auth/login` for user authentication.

- **External Dependencies:**
  - Backend: Ensure Python dependencies are listed in `requirements.txt`.
  - Frontend: Manage dependencies via `package.json`.

---

## Examples

### Backend Route Example
```python
# app/routes/auth.py
@router.post("/auth/login")
def login():
    # Logic for user login
    pass
```

### Frontend Route Example
```javascript
// src/App.js
<Route path="/dashboard" element={<Dashboard />} />
```

---

## Notes for AI Agents
- Always follow the existing patterns in the codebase.
- When adding new routes or components, ensure they are consistent with the current structure.
- Validate changes with appropriate tests.

---

For any questions or clarifications, refer to the `README.md` files in the respective directories.