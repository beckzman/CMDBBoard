"""
Configuration Item CRUD routes.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.auth import get_current_user, require_role
from app.db.database import get_db
from app.db.models import ConfigurationItem, User, UserRole, CIType, CIStatus
from app.schemas import CICreate, CIUpdate, CIResponse, CIListResponse

router = APIRouter(prefix="/api/ci", tags=["Configuration Items"])


@router.get("", response_model=CIListResponse)
def list_configuration_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    ci_type: Optional[CIType] = None,
    status: Optional[CIStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List configuration items with pagination and filters."""
    query = db.query(ConfigurationItem).filter(ConfigurationItem.deleted_at.is_(None))
    
    # Apply filters
    if ci_type:
        query = query.filter(ConfigurationItem.ci_type == ci_type)
    
    if status:
        query = query.filter(ConfigurationItem.status == status)
    
    if search:
        query = query.filter(
            or_(
                ConfigurationItem.name.ilike(f"%{search}%"),
                ConfigurationItem.description.ilike(f"%{search}%"),
                ConfigurationItem.owner.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/{ci_id}", response_model=CIResponse)
def get_configuration_item(
    ci_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific configuration item by ID."""
    ci = db.query(ConfigurationItem).filter(
        ConfigurationItem.id == ci_id,
        ConfigurationItem.deleted_at.is_(None)
    ).first()
    
    if not ci:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration item not found"
        )
    
    return ci


@router.post("", response_model=CIResponse, status_code=status.HTTP_201_CREATED)
def create_configuration_item(
    ci_data: CICreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.EDITOR))
):
    """Create a new configuration item."""
    new_ci = ConfigurationItem(**ci_data.model_dump())
    
    db.add(new_ci)
    db.commit()
    db.refresh(new_ci)
    
    return new_ci


@router.put("/{ci_id}", response_model=CIResponse)
def update_configuration_item(
    ci_id: int,
    ci_data: CIUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.EDITOR))
):
    """Update a configuration item."""
    ci = db.query(ConfigurationItem).filter(
        ConfigurationItem.id == ci_id,
        ConfigurationItem.deleted_at.is_(None)
    ).first()
    
    if not ci:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration item not found"
        )
    
    # Update only provided fields
    update_data = ci_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ci, field, value)
    
    db.commit()
    db.refresh(ci)
    
    return ci


@router.delete("/{ci_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_configuration_item(
    ci_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Soft delete a configuration item."""
    ci = db.query(ConfigurationItem).filter(
        ConfigurationItem.id == ci_id,
        ConfigurationItem.deleted_at.is_(None)
    ).first()
    
    if not ci:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration item not found"
        )
    
    from datetime import datetime
    ci.deleted_at = datetime.utcnow()
    db.commit()
    
    return None
