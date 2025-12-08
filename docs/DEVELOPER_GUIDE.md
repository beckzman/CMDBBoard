# CMDB Dashboard - Developer Guide

## Project Structure
The project is divided into two main parts:
-   **Backend (`/backend`)**: A FastAPI application using PostgreSQL.
-   **Frontend (`/frontend`)**: A React application using Vite and TypeScript.

### Backend Architecture
-   **`app/api/routes`**: API endpoints (Controllers).
-   **`app/core`**: Configuration, authentication, and core services (e.g., `health_service.py`).
-   **`app/db`**: Database models (`models.py`) and connection logic (`database.py`).
-   **`app/services`**: Business logic.

### Frontend Architecture
-   **`src/api`**: Axios client and API wrappers (`ciAPI`, `healthAPI`).
-   **`src/components`**: Reusable UI components (Modals, etc.).
-   **`src/pages`**: Main page views (`ConfigurationItems.tsx`).
-   **`src/store`**: Global state management (Zustand).

## Development Workflow

### Setting up Local Environment
1.  **Backend**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # or venv\Scripts\activate on Windows
    pip install -r requirements.txt
    uvicorn app.main:app --reload
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

### Seeding Test Data
The `backend/seed_data.py` script populates the database with:
-   **Users**: `admin` (Admin) and `user` (Viewer).
-   **CIs**: Sample servers, applications, and databases.
-   **Relationships**: Dependencies between the sample CIs.

Run it via:
```bash
python backend/seed_data.py
```

### Adding New Features
1.  **Backend**: Add model in `models.py`, create migration with Alembic, add schema in `schemas.py`, and implement route in `api/routes`.
2.  **Frontend**: Update API client in `src/api`, create components/pages, and add routes.

## Key Services
-   **Health Service**: `app/core/health_service.py` - Handles ICMP pings and DNS resolution for CIs.
-   **Import Service**: `app/services/import_service.py` - Manages CSV and external data imports.
