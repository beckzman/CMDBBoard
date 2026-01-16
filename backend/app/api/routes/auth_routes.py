"""
Authentication routes for login, registration, and token management.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    require_role
)
from app.core.config import settings
from app.db.database import get_db
from app.db.models import User, UserRole
from app.schemas import UserCreate, UserResponse, Token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Register a new user (admin only)."""
    # Check if user already exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role=UserRole.VIEWER  # Default role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token."""
    # Setup simple file logger for debug
    import logging
    import os
    
    # Ensure logs directory exists
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
        
    logger = logging.getLogger("auth_debug")
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        fh = logging.FileHandler(os.path.join(log_dir, "login_errors.log"))
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        fh.setFormatter(formatter)
        logger.addHandler(fh)
    
    logger.info(f"Login attempt for username: '{form_data.username}'")

    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user:
        logger.warning(f"Login failed: User '{form_data.username}' not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Login failed: Invalid password for user '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"Login failed: User '{form_data.username}' is inactive")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    logger.info(f"Login successful for user: '{form_data.username}'")
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user


# Keycloak Routes
from app.core.keycloak_service import keycloak_service
from fastapi.responses import RedirectResponse
import secrets

@router.get("/keycloak/login")
def keycloak_login():
    """Redirect to Keycloak login page."""
    if not keycloak_service.enabled:
        raise HTTPException(status_code=501, detail="Keycloak authentication not configured")
        
    redirect_uri = f"{settings.CORS_ORIGINS.split(',')[0]}/auth/callback"
    # Actually, the callback should be to the backend or frontend?
    # Standard flow: 
    # Frontend -> Backend /login -> Keycloak -> Backend /callback -> Frontend /
    # But for SPA, often: Frontend -> Keycloak -> Frontend /callback -> Backend /exchange
    
    # Let's use Backend callback to keep secrets safe.
    # Frontend -> Backend /keycloak/login -> Keycloak -> Backend /keycloak/callback -> Frontend /?token=...
    
    # We need to compute the CALLBACK URL that Keycloak will return to.
    # It must be an absolute URL.
    # Assuming the backend is reachable via a known URL in production, but here we might need to be careful.
    # However, for simplicity let's assume the Keycloak will redirect back to the FRONTEND, 
    # OR we make the backend handle the code exchange.
    
    # If we use authorization_code flow:
    # 1. User visits /auth/keycloak/login
    # 2. Redirect to Keycloak with redirect_uri = http://backend_host/api/auth/keycloak/callback
    # 3. Keycloak redirects to http://backend_host/api/auth/keycloak/callback?code=...
    # 4. Backend exchanges code for token.
    # 5. Backend finds/creates user.
    # 6. Backend creates generic JWT.
    # 7. Backend redirects to http://frontend_host/auth/callback?token=...
    
    # We need to know the Frontend URL to redirect back to.
    frontend_url = settings.CORS_ORIGINS.split(',')[0] # First origin
    backend_callback_uri = "http://localhost:8000/api/auth/keycloak/callback" # TODO: Make configurable
    
    # Let's use the pattern where we return the URL to the frontend, or redirect directly.
    return RedirectResponse(keycloak_service.get_auth_url(redirect_uri=backend_callback_uri))


@router.get("/keycloak/callback")
def keycloak_callback(code: str, db: Session = Depends(get_db)):
    """Handle Keycloak callback."""
    if not keycloak_service.enabled:
        raise HTTPException(status_code=501, detail="Keycloak authentication not configured")
        
    backend_callback_uri = "http://localhost:8000/api/auth/keycloak/callback" # Must match above
    
    try:
        token_info = keycloak_service.get_token(code=code, redirect_uri=backend_callback_uri)
        user_info = keycloak_service.get_user_info(token_info["access_token"])
        
        # Sync user
        username = user_info.get("preferred_username", user_info.get("sub"))
        email = user_info.get("email")
        
        user = db.query(User).filter(User.username == username).first()
        if not user:
            # Create new user
            user = User(
                username=username,
                email=email,
                full_name=user_info.get("name"),
                hashed_password="KEYCLOAK_USER", # Dummy password
                role=UserRole.VIEWER,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        # Create local JWT
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=access_token_expires
        )
        
        # Redirect to frontend with token
        frontend_url = settings.CORS_ORIGINS.split(',')[0]
        return RedirectResponse(f"{frontend_url}/auth/callback?token={access_token}")
        
    except Exception as e:
        # In case of error redirect to login with error
        frontend_url = settings.CORS_ORIGINS.split(',')[0]
        return RedirectResponse(f"{frontend_url}/login?error=KeycloakAuthenticationFailed")

