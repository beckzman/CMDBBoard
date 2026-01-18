# CMDB Dashboard - Developer Guide

## Project Structure
The project is divided into two main parts:
-   **Backend (`/backend`)**: A FastAPI application using PostgreSQL (mapped to Port 5433).
-   **Frontend (`/frontend`)**: A React application using Vite and TypeScript.

### Backend Architecture
-   **`app/api/routes`**: API endpoints (Controllers).
-   **`app/core`**: Configuration, authentication, and core services (e.g., `health_service.py`).
-   **`app/db`**: Database models (`models.py`) and connection logic (`database.py`).
-   **`app/services`**: Business logic.

### Frontend Architecture
-   **`src/api`**: Axios client and API wrappers (`ciAPI`, `healthAPI`, `relationshipAPI`).
-   **`src/components`**: Reusable UI components (Modals, etc.).
-   **`src/pages`**: Main page views (`ConfigurationItems.tsx`, `DependencyGraph.tsx`).
-   **`src/store`**: Global state management (Zustand).
-   **Key Libraries**:
    -   `reactflow`: Graph visualization.
    -   `dagre`: Directed graph layout engine.

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
The `backend/seed_data.py` script populates the database with basic data.
For relationship testing, use:
```bash
python backend/scripts/seed_relationships.py
```

### Adding New Features
1.  **Backend**: Add model in `models.py`, create migration with Alembic, add schema in `schemas.py`, and implement route in `api/routes`.
2.  **Frontend**: Update API client in `src/api`, create components/pages, and add routes.

## Key Services
-   **Health Service**: `app/core/health_service.py`
    -   Handles ICMP pings for general CIs.
    -   Performs TCP port availability checks for Database CIs (ports 1521, 5432, 3306, 1433).
-   **Import Engine**: `app/core/import_engine.py`
    -   Manages connectors (`CSVConnector`, `OracleConnector`) and data reconciliation.
    -   Support "Quick Import" via `CSVImporter` (`app/services/csv_importer.py`).

## API Endpoints
-   **CI Management**: `/api/v1/cis`
-   **Relationships**: `/api/relationships` (GET, POST)
-   **Health Check**: `/api/health/check`
-   **Import Sources**: `/api/import/sources` (CRUD, Run, Test Connection)
-   **CSV Upload**: `/api/import/csv`

## Debugging & Logging
### Authentication Logs
Failed login attempts are logged to a file to assist in troubleshooting usage and attack patterns.
-   **File Path**: `backend/logs/login_errors.log` (In Docker: `/app/logs/login_errors.log`)
-   **Log Content**: Timestamps, usernames, and specific failure reasons (e.g., "User not found", "Invalid password", "User inactive").
-   **Viewing Logs**:
    ```bash
    # View live logs in Docker
    docker-compose exec backend tail -f logs/login_errors.log
    ```

## AI & RAG Architecture
The "AI Insights" feature (v1.1) uses a **Local RAG (Retrieval Augmented Generation)** approach to answer questions using your private data without training a mode.

### Data Flow
1.  **User Query**: User asks a question in the frontend (e.g., "What runs on Server X?").
2.  **Context Retrieval (`ai_routes.py`)**:
    -   The backend fetches Configuration Items (CIs) from PostgreSQL.
    -   **Filtering**: A heuristic ranking algorithm selects the top 30 most relevant CIs based on keyword matches (Name, Type, Location, etc.).
    -   **Formatting**: Selected CIs are converted into a structured text block (Context).
3.  **Prompt Engineering**:
    -   The Context is injected into a prompt template: *"You are a CMDB Assistant. Context: [DATA]. Question: [QUERY]"*.
4.  **Inference (Ollama)**:
    -   The prompt is sent to the local **Ollama** container running `llama3.1`.
    -   Ollama generates the response based *only* on the provided context.

### Configuration
-   **Model**: Defaults to `llama3.1`. Configurable in `ai_routes.py`.
-   **Timeout**: Set to 300s to accommodate CPU-based inference.
-   **Limit**: Context is capped at ~30 items to fit within the Llama context window and ensure performance.
