# Analytics Dashboard — Setup & Run Guide

## Architecture

| Layer    | Stack                                  | Port  |
|----------|----------------------------------------|-------|
| Frontend | Vite + React + Recharts                | 5173  |
| Backend  | Django + DRF + pandas                  | 8000  |

The React app calls Django REST endpoints.  All heavy calculations
(aggregations, filtering, pagination) happen in the backend.

---

## 1. Backend Setup

```bash
cd backend

# Create & activate a virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# (Optional) Copy .env.example → .env and customise
cp .env.example .env

# Run migrations (creates an empty sqlite db — no models, but Django requires it)
python manage.py migrate

# Start the dev server
python manage.py runserver
```

The server starts at **http://localhost:8000**.  
Verify with: `curl http://localhost:8000/api/health/`

---

## 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# (Optional) Copy .env.example → .env and customise
cp .env.example .env

# Start the dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 3. API Endpoints

All endpoints live under `/api/`.  
Filters are passed as **comma-separated** query params:  
`?cluster=1,2&age_group=25-34,35-44&gender=0&homeowner=1`

| Endpoint          | Description                                      |
|-------------------|--------------------------------------------------|
| `GET /api/health/`   | Returns `{"status": "ok"}`                    |
| `GET /api/metadata/` | Unique values for each filter dropdown        |
| `GET /api/summary/`  | KPI totals, averages, medians, top breakdowns |
| `GET /api/charts/`   | Aggregated chart datasets                     |
| `GET /api/table/`    | Paginated rows with search & sort             |

### Table endpoint query params

| Param       | Default         | Notes                              |
|-------------|-----------------|------------------------------------|
| `page`      | 1               | Page number                        |
| `page_size` | 50              | Rows per page (max 200)            |
| `search`    | (empty)         | Case-insensitive text search       |
| `sort_by`   | Total Profit    | Column name to sort by             |
| `sort_dir`  | desc            | `asc` or `desc`                    |

---

## 4. Deployment

### Frontend → Netlify

1. Connect the repo to Netlify.
2. Set build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
3. Add environment variable:
   - `VITE_API_BASE_URL` = your deployed backend URL (e.g. `https://my-api.onrender.com`)
4. Add a `frontend/netlify.toml` (included in this repo) that rewrites SPA routes.

### Backend → Render / Railway / Fly

1. Point the service to the `backend/` directory.
2. **Build command**: `pip install -r requirements.txt && python manage.py migrate`
3. **Start command**: `gunicorn server.wsgi:application --bind 0.0.0.0:$PORT`
4. Set environment variables:
   - `DJANGO_SECRET_KEY` – a strong random string
   - `DJANGO_DEBUG` = `False`
   - `DJANGO_ALLOWED_HOSTS` – your domain
   - `CORS_ALLOWED_ORIGINS` – your Netlify URL

---

## 5. Local Checklist

- [ ] Backend: `python manage.py runserver` → no errors
- [ ] `curl http://localhost:8000/api/health/` → `{"status":"ok"}`
- [ ] `curl http://localhost:8000/api/metadata/` → JSON with filter values
- [ ] Frontend: `npm run dev` → opens at http://localhost:5173
- [ ] KPI cards display numbers
- [ ] Charts render (4 charts visible)
- [ ] Filters open/close and update the dashboard
- [ ] Table loads with pagination, search, and sort working
- [ ] `npm run build` succeeds with no errors
