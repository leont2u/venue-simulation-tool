# Venue Simulation Tool

This repository is split into two apps:

- `frontend/`: Next.js app for the 3D venue planner UI
- `backend/`: Django + Django REST Framework API with JWT auth

## Frontend

Run the Next.js app from the `frontend/` folder:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`.

JWT auth pages are available at:

- `/login`
- `/register`

Protected pages such as the dashboard and editor require a valid token.

## Backend

Create a virtual environment, install requirements, run migrations, then start Django:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The backend runs on `http://127.0.0.1:8000`.

Auth endpoints:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `GET /api/auth/me/`
- `POST /api/auth/logout/`
- `POST /api/ai/generate-scene/`
- `POST /api/imports/drawio/`
- `POST /api/projects/<id>/share/`
- `GET /api/projects/shared/<token>/`

## Local Development

1. Start the Django backend in `backend/`.
2. Start the Next.js frontend in `frontend/`.
3. Open the frontend with `http://127.0.0.1:3000` so auth cookies work cleanly in local development.
4. Open `http://127.0.0.1:3000/register` to create an account.
5. Log in at `http://127.0.0.1:3000/login`.
6. Open the dashboard or editor after authentication.

## Notes

- The frontend defaults to `http://127.0.0.1:8000` for API requests through `NEXT_PUBLIC_API_BASE_URL`.
- Auth now uses HttpOnly cookies managed by Django instead of frontend localStorage.
- In local development, use `127.0.0.1` for both frontend and backend to avoid cookie issues caused by mixing `localhost` and `127.0.0.1`.
- SQLite is used by default in development at `backend/db.sqlite3`.
- Ollama is now called from the Django backend, not the Next.js app.
- Set `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in the backend environment when needed.
