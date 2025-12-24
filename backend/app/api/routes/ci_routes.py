"""
Configuration Item CRUD routes.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, cast, String
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
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    # New Filters (List support)
    department: Optional[List[str]] = Query(None),
    location: Optional[List[str]] = Query(None),
    operating_system: Optional[List[str]] = Query(None),
    cost_center: Optional[List[str]] = Query(None),
    sla: Optional[List[str]] = Query(None),
    environment: Optional[List[str]] = Query(None),
    domain: Optional[List[str]] = Query(None),
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
    
        query = query.filter(
            or_(
                ConfigurationItem.name.ilike(f"%{search}%"),
                ConfigurationItem.description.ilike(f"%{search}%"),
                ConfigurationItem.department.ilike(f"%{search}%")
            )
        )
    
    # Apply attribute filters (Multi-select support)
    if department:
        query = query.filter(ConfigurationItem.department.in_(department))
        
    if location:
        query = query.filter(ConfigurationItem.location.in_(location))
        
    if operating_system:
        query = query.filter(ConfigurationItem.operating_system.in_(operating_system))
        
    if cost_center:
        query = query.filter(ConfigurationItem.cost_center.in_(cost_center))
        
    if sla:
        query = query.filter(ConfigurationItem.sla.in_(sla))
        
    if environment:
        query = query.filter(ConfigurationItem.environment.in_(environment))
        
    if domain:
        query = query.filter(ConfigurationItem.domain.in_(domain))
    
    # Apply sorting
    if sort_by:
        sort_field = None
        is_string_field = False
        
        if sort_by == 'name':
            sort_field = ConfigurationItem.name
            is_string_field = True
        elif sort_by == 'type':  # Using specific query param 'type' to map to model field 'ci_type'
            sort_field = ConfigurationItem.ci_type
            is_string_field = True # Enum, but effectively string sorting
        elif sort_by == 'status':
            sort_field = ConfigurationItem.status
            is_string_field = True # Enum
        elif sort_by == 'department':
            sort_field = ConfigurationItem.department
            is_string_field = True
        elif sort_by == 'location':
            sort_field = ConfigurationItem.location
            is_string_field = True
        elif sort_by == 'sla':
            sort_field = ConfigurationItem.sla
            is_string_field = True
        elif sort_by == 'cost_center':
            sort_field = ConfigurationItem.cost_center
            is_string_field = True
        elif sort_by == 'operating_system':
            sort_field = ConfigurationItem.operating_system
            is_string_field = True
        elif sort_by == 'domain':
            sort_field = ConfigurationItem.domain
            is_string_field = True
        elif sort_by == 'environment':
            sort_field = ConfigurationItem.environment
            is_string_field = True
        elif sort_by == 'description':
            sort_field = ConfigurationItem.description
            is_string_field = True
        elif sort_by == 'created_at':
            sort_field = ConfigurationItem.created_at
        elif sort_by == 'updated_at':
            sort_field = ConfigurationItem.updated_at
        elif sort_by == 'last_ping':
            sort_field = ConfigurationItem.last_ping_success
            
        if sort_field:
            order_expr = sort_field
            if is_string_field:
                # Check if field is Enum (simple check by column type if available, but for now we know specifics)
                # Actually safest to always cast to String for text sorting if unsure of underlying type
                order_expr = func.lower(cast(sort_field, String))
                
            if sort_desc:
                query = query.order_by(order_expr.desc())
            else:
                query = query.order_by(order_expr.asc())
    else:
        # Default sort by created_at desc
        query = query.order_by(ConfigurationItem.created_at.desc())
    
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


@router.get("/attributes/{field_name}/distinct", response_model=List[str])
def get_distinct_attribute_values(
    field_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get distinct values for a specific attribute."""
    # Whitelist allowed fields to prevent arbitrary query injection
    allowed_fields = {
        'department': ConfigurationItem.department,
        'location': ConfigurationItem.location,
        'operating_system': ConfigurationItem.operating_system,
        'cost_center': ConfigurationItem.cost_center,
        'sla': ConfigurationItem.sla,
        'environment': ConfigurationItem.environment,
        'domain': ConfigurationItem.domain,
        'ci_type': ConfigurationItem.ci_type,
        'status': ConfigurationItem.status
    }

    if field_name not in allowed_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid field name: {field_name}"
        )

    column = allowed_fields[field_name]
    
    # Query distinct values, filtering out nulls
    results = db.query(column).distinct().filter(
        column.isnot(None), 
        ConfigurationItem.deleted_at.is_(None)
    ).order_by(column).all()

    # Flatten result (results will be list of tuples like [('IT',), ('Sales',)])
    values = [str(r[0]) for r in results if r[0] is not None]
    
    return values
