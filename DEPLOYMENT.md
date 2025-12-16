# Production Deployment Guide

This guide describes how to deploy the CMDBBoard application to a production environment using Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on the host machine.
- [Docker Compose](https://docs.docker.com/compose/install/) installed.

## Setup

1.  **Clone the repository** to your production server.

2.  **Create production environment file**:
    Copy the example file to `.env`:
    ```bash
    cp .env.prod.example .env
    ```

3.  **Configure Environment Variables**:
    Edit `.env` and set secure values for:
    - `POSTGRES_PASSWORD`: Use a strong, unique password.
    - `SECRET_KEY`: Use a strong random string (e.g., generate with `openssl rand -hex 32`).
    - `CORS_ORIGINS`: Set this to your actual domain name(s), e.g., `https://cmdb.example.com`.

## Deployment

1.  **Build and Start Services**:
    Run the following command to build the images and start the containers in detached mode:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d --build
    ```

2.  **Verify Status**:
    Check if all containers are running:
    ```bash
    docker-compose -f docker-compose.prod.yml ps
    ```
    You should see `cmdb_postgres_prod`, `cmdb_backend_prod`, and `cmdb_frontend_prod` in a healthy or running state.

3.  **Access the Application**:
    The application should now be accessible at `http://localhost` (or your server's IP/domain) on port 80.

## Maintenance

-   **View Logs**:
    ```bash
    docker-compose -f docker-compose.prod.yml logs -f
    ```

-   **Stop Services**:
    ```bash
    docker-compose -f docker-compose.prod.yml down
    ```

-   **Update Application**:
    1.  Pull the latest code: `git pull origin main`
    2.  Rebuild and restart: `docker-compose -f docker-compose.prod.yml up -d --build`

## Architecture Notes

-   **Frontend**: Served by Nginx (Alpine), which also handles SPA routing (redirecting to `index.html`).
-   **Backend**: Runs with `gunicorn` processing requests, managing multiple workers for concurrency.
-   **Database**: PostgreSQL with persistent volume `postgres_data_prod`.
