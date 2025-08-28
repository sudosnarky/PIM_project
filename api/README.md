# PIM Project Backend (FastAPI + SQLite)

This backend provides authentication and CRUD for notes/particles, organized by PARA, with tagging and user support. It is designed to integrate with your existing frontend.

## Quick Start

1. **Install Python dependencies**

   ```sh
   cd api
   pip install -r requirements.txt
   ```

2. **Run the API server**

   ```sh
   uvicorn main:app --reload
   ```
   The server will start at http://127.0.0.1:8000

3. **First-time setup**
   - The database (`pim.db`) is created automatically on first run.
   - Register a user via POST `/register` (see below).

## API Endpoints

- `POST /register` — Register a new user. JSON: `{ "username": "...", "password": "..." }`
- `POST /token` — Login. Form: `username`, `password`. Returns: `{ "access_token": ... }`
- `GET /particles` — List all your notes. Query params: `section`, `q` (search).
- `GET /particles/{id}` — Get a single note.
- `POST /particles` — Create a note. JSON: `{ title, content, tags, section }`
- `PUT /particles/{id}` — Update a note.
- `DELETE /particles/{id}` — Delete a note.

All `/particles` endpoints require an `Authorization: Bearer <token>` header.

## Integration
- The backend is CORS-enabled for local frontend development.
- Store the token in the browser and send it with each request.
- The `tags` field is a list of strings.
- The `section` field should be one of: `Projects`, `Areas`, `Resources`, `Archives`.

## Example: Register and Login

```sh
# Register
curl -X POST http://127.0.0.1:8000/register -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'

# Login
curl -X POST http://127.0.0.1:8000/token -d "username=test&password=test" -H "Content-Type: application/x-www-form-urlencoded"
```

## Notes
- The backend is stateless except for in-memory tokens (for demo/dev only).
- For production, use a persistent token system and HTTPS.
- The database file is `api/pim.db`.

---

**You can now connect your frontend to these endpoints for full-stack functionality!**
