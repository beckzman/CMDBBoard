"""
Main FastAPI application.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import Base, engine
from app.api.routes import auth_routes, ci_routes, dashboard_routes, import_routes, export_routes, health_routes, domain_routes, user_routes, relationship_routes, cost_routes, software_routes, ai_routes

# Create database tables
Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    print("DEBUG: Lifespan startup called")
    from app.core.scheduler import start_scheduler
    start_scheduler()
    yield
    # Shutdown logic if needed

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="ITIL Configuration Management Database (CMDB) Dashboard API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_routes.router)
app.include_router(ci_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(import_routes.router)
app.include_router(export_routes.router)
app.include_router(domain_routes.router)
app.include_router(user_routes.router)
app.include_router(relationship_routes.router)
app.include_router(cost_routes.router)
app.include_router(health_routes.router, prefix="/api", tags=["health"])
app.include_router(software_routes.router, prefix="/api/software", tags=["software"])
app.include_router(ai_routes.router)





@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "ITIL CMDB Dashboard API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
