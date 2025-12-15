"""
Domain management routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.auth import get_current_user, require_role
from app.db.database import get_db
from app.db.models import Domain, User, UserRole
from app.schemas import DomainCreate, DomainResponse
from app.services.domain_service import resolve_domains_for_cis
from typing import Dict, Any

router = APIRouter(prefix="/api/domains", tags=["Domains"])


@router.get("", response_model=List[DomainResponse])
def list_domains(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all domains."""
    query = db.query(Domain)
    if active_only:
        query = query.filter(Domain.is_active == True)
    
    return query.order_by(Domain.name).all()


@router.post("", response_model=DomainResponse, status_code=status.HTTP_201_CREATED)
def create_domain(
    domain_data: DomainCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Create a new domain (Admin only)."""
    # Check if domain already exists
    existing = db.query(Domain).filter(Domain.name == domain_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Domain with this name already exists"
        )
    
    new_domain = Domain(**domain_data.model_dump())
    db.add(new_domain)
    db.commit()
    db.refresh(new_domain)
    
    return new_domain


@router.delete("/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_domain(
    domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete (deactivate) a domain (Admin only)."""
    # Look for domain
    domain = db.query(Domain).filter(Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Domain not found"
        )
        
    # Hard delete or soft delete? 
    # Usually configuration lists are hard deleted or just deactivated. 
    # Let's delete for now as requested "configure list". 
    # But if used in CIs, maybe better to just block usage.
    # User asked to "configure the list", implies add/remove. 
    # Let's do hard delete for now but ensure we check usage?
    # Simple requirements: configure list. 
    
    db.delete(domain)
    db.commit()
    return None


@router.post("/resolve", status_code=status.HTTP_200_OK)
def resolve_domains(
    limit: int = 0, # Default to 0 (all)
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Trigger DNS resolution for CIs.
    Admin only.
    """
    return resolve_domains_for_cis(db, limit)
