"""
Configuration Item CRUD routes.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, cast, String
from app.core.auth import get_current_user, require_role
from app.db.database import get_db
from app.db.models import ConfigurationItem, User, UserRole, CIType, CIStatus, SoftwareCatalog
from app.schemas import CICreate, CIUpdate, CIResponse, CIListResponse

router = APIRouter(prefix="/api/ci", tags=["Configuration Items"])


@router.get("", response_model=CIListResponse)
def list_configuration_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    ci_type: Optional[List[CIType]] = Query(None),
    status: Optional[CIStatus] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    # New Filters (List support)
    department: Optional[List[str]] = Query(None),
    location: Optional[List[str]] = Query(None),
    os_db_system: Optional[List[str]] = Query(None),
    cost_center: Optional[List[str]] = Query(None),
    sla: Optional[List[str]] = Query(None),
    environment: Optional[List[str]] = Query(None),
    domain: Optional[List[str]] = Query(None),
    software: Optional[List[str]] = Query(None),
    service_provider: Optional[List[str]] = Query(None),
    contact: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List configuration items with pagination and filters."""
    from sqlalchemy.orm import joinedload
    # query = db.query(ConfigurationItem).options(
    #     joinedload(ConfigurationItem.software),
    #     joinedload(ConfigurationItem.source_relationships).joinedload(Relationship.target_ci),
    #     joinedload(ConfigurationItem.target_relationships).joinedload(Relationship.source_ci)
    # ).filter(ConfigurationItem.deleted_at.is_(None))
    
    # Revert to simpler query to test if join is causing issues
    query = db.query(ConfigurationItem).options(joinedload(ConfigurationItem.software)).filter(ConfigurationItem.deleted_at.is_(None))
    
    # Apply filters
    if ci_type:
        # Support both list filtering and single value (for backward compatibility if needed, though Query handles list)
        if isinstance(ci_type, list):
            query = query.filter(ConfigurationItem.ci_type.in_(ci_type))
        else:
            query = query.filter(ConfigurationItem.ci_type == ci_type)
    
    if status:
        query = query.filter(ConfigurationItem.status == status)

    if search:
        query = query.filter(
            or_(
                ConfigurationItem.name.ilike(f"%{search}%"),
                ConfigurationItem.description.ilike(f"%{search}%"),
                ConfigurationItem.department.ilike(f"%{search}%"),
                ConfigurationItem.os_db_system.ilike(f"%{search}%")
            )
        )
    
    # Apply attribute filters (Multi-select support)
    if department:
        query = query.filter(ConfigurationItem.department.in_(department))
        
    if location:
        query = query.filter(ConfigurationItem.location.in_(location))
        
    if os_db_system:
        query = query.filter(ConfigurationItem.os_db_system.in_(os_db_system))
        
    if cost_center:
        query = query.filter(ConfigurationItem.cost_center.in_(cost_center))
        
    if sla:
        query = query.filter(ConfigurationItem.sla.in_(sla))
        
    if environment:
        query = query.filter(ConfigurationItem.environment.in_(environment))
        
    if domain:
        query = query.filter(ConfigurationItem.domain.in_(domain))

    if software:
        query = query.join(ConfigurationItem.software).filter(SoftwareCatalog.name.in_(software))
        
    if service_provider:
        query = query.filter(ConfigurationItem.service_provider.in_(service_provider))
        
    if contact:
        query = query.filter(ConfigurationItem.contact.in_(contact))
    
    # Apply sorting
    if sort_by:
        sort_field = None
        is_string_field = False
        
        if sort_by == 'name':
            sort_field = ConfigurationItem.name
            is_string_field = True
        elif sort_by == 'type' or sort_by == 'ci_type':  # Using specific query param 'type' or 'ci_type'
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
        elif sort_by == 'os_db_system':
            sort_field = ConfigurationItem.os_db_system
            is_string_field = True
        elif sort_by == 'domain':
            sort_field = ConfigurationItem.domain
            is_string_field = True
        elif sort_by == 'environment':
            sort_field = ConfigurationItem.environment
            is_string_field = True
        elif sort_by == 'contact':
            sort_field = ConfigurationItem.contact
            is_string_field = True
        elif sort_by == 'service_provider':
            sort_field = ConfigurationItem.service_provider
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
    from sqlalchemy.orm import joinedload
    ci = db.query(ConfigurationItem).options(joinedload(ConfigurationItem.software)).filter(
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
    
@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_configuration_items(
    ci_type: Optional[CIType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Bulk soft delete configuration items."""
    query = db.query(ConfigurationItem).filter(ConfigurationItem.deleted_at.is_(None))
    
    if ci_type:
        query = query.filter(ConfigurationItem.ci_type == ci_type)
        
    # Perform update for soft delete
    from datetime import datetime
    current_time = datetime.utcnow()
    
    # We use synchronize_session=False for bulk updates efficiency
    # But for soft deletes we should verify if we need to cascade or if that's handled by other logic
    # For simple soft delete, updating the timestamp is enough
    
    # Check if there are items to delete
    count = query.count()
    if count == 0:
        return None
        
    query.update({ConfigurationItem.deleted_at: current_time}, synchronize_session=False)
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
        'os_db_system': ConfigurationItem.os_db_system,
        'cost_center': ConfigurationItem.cost_center,
        'sla': ConfigurationItem.sla,
        'environment': ConfigurationItem.environment,
        'domain': ConfigurationItem.domain,
        'ci_type': ConfigurationItem.ci_type,
        'status': ConfigurationItem.status,
        'software': SoftwareCatalog.name, # Special case, joined
        'service_provider': ConfigurationItem.service_provider,
        'contact': ConfigurationItem.contact
    }

    if field_name not in allowed_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid field name: {field_name}"
        )

    # Special handling for software which requires a join
    if field_name == 'software':
        results = db.query(SoftwareCatalog.name).join(
            ConfigurationItem, ConfigurationItem.software_id == SoftwareCatalog.id
        ).filter(
            ConfigurationItem.deleted_at.is_(None)
        ).distinct().order_by(SoftwareCatalog.name).all()
    else:
        column = allowed_fields[field_name]
        
        # Query distinct values, filtering out nulls
        results = db.query(column).distinct().filter(
            column.isnot(None), 
            ConfigurationItem.deleted_at.is_(None)
        ).order_by(column).all()

    # Flatten result (results will be list of tuples like [('IT',), ('Sales',)])
    values = []
    for r in results:
        val = r[0]
        if val is None:
            continue
        # Handle Enum objects (extract value)
        if hasattr(val, 'value'):
            values.append(str(val.value))
        else:
            values.append(str(val))
    
    return values
