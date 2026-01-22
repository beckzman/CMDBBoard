# Production Deployment Guide

This guide describes how to deploy the CMDB application to a production server with a real hostname (e.g., `cmdb.example.com`).

## Prerequisites

- Docker and Docker Compose (v2+) installed on the server.
- A domain name (DNS resolved to your server IP).
- (Optional) A reverse proxy (like Nginx on the host, Traefik, or Caddy) to handle SSL/HTTPS termination.

## Configuration

1.  **Environment Variables (.env)**
    Creates a `.env` file in the project root based on individual needs.
    
    ```bash
    # Database
    POSTGRES_USER=cmdb
    POSTGRES_PASSWORD=secure_password_here
    POSTGRES_DB=cmdb
    DATABASE_URL=postgresql://cmdb:secure_password_here@postgres:5432/cmdb

    # Security
    SECRET_KEY=change_this_to_a_long_random_string

    # CORS (Important for real domains)
    # List allowed origins. If API calls are proxy passed via Nginx (default), 
    # the browser sees same-origin, so this is less critical but good practice.
    CORS_ORIGINS=http://cmdb.example.com,https://cmdb.example.com,http://localhost


    # Application
    APP_NAME=ITIL CMDB Dashboard
    # Set to False in production
    DEBUG=False

    # Caddy (Automatic HTTPS)
    DOMAIN_NAME=cmdb.example.com
    ACME_EMAIL=admin@example.com

    # Optional Integrations
    SHAREPOINT_CLIENT_ID=...
    KEYCLOAK_URL=...
    ```

2.  **Architecture**
    The application uses Caddy as a reverse proxy for automatic HTTPS.
    - **Caddy**: Exposed on ports 80/443. Handles SSL and routes all traffic to the Frontend.
    - **Frontend**: Serves the React app and proxies `/api` calls to the Backend.
    - **Backend**: API Server (internal only).

## Running the Application

Use the production Docker Compose file:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This will start:
- `cmdb_postgres_prod`: Database (volume: `postgres_data_prod`)
- `cmdb_backend_prod`: API Server (on internal network)
- `cmdb_frontend_prod`: Nginx Web Server (exposed on port 80)
- `cmdb_ollama_prod`: AI Service (volume: `ollama_vals_prod`)

## Architecture Diagram

The following diagram illustrates the production container architecture:

```mermaid
graph TD
    User((User))
    
    subgraph "Docker Host"
        Caddy[("Caddy<br>(Reverse Proxy)"))]
        
        subgraph "Internal Network"
            Frontend[("Frontend Container<br>(Nginx + React)")]
            Backend[("Backend Container<br>(FastAPI)")]
            DB[("Postgres DB")]
            Ollama[("Ollama<br>(AI Model)")]
        end
        
        VolDB[("Volume:<br>postgres_data")]
        VolOllama[("Volume:<br>ollama_vals")]
        VolCaddy[("Volume:<br>caddy_data")]
    end
    
    User -- "HTTPS (443)" --> Caddy
    User -- "HTTP (80)" --> Caddy
    
    Caddy -- "Reverse Proxy" --> Frontend
    
    Frontend -- "API Calls<br>(/api/*)" --> Backend
    
    Backend -- "SQL" --> DB
    Backend -- "Generate" --> Ollama
    
    DB -.-> VolDB
    Ollama -.-> VolOllama
    Caddy -.-> VolCaddy

    style Caddy fill:#f9f,stroke:#333
    style Frontend fill:#dfd,stroke:#333
    style Backend fill:#bbf,stroke:#333
    style DB fill:#ddf,stroke:#333
```



