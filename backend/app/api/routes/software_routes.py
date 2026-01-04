from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.db.database import get_db
from app.db.models import SoftwareCatalog, SoftwareCategory, SoftwareStatus, ConfigurationItem
from pydantic import BaseModel
from datetime import datetime
import json

router = APIRouter()

from app.schemas import (
    SoftwareCatalogCreate, 
    SoftwareCatalogUpdate, 
    SoftwareCatalogResponse, 
    MatchRequest
)

# --- Endpoints ---

# --- Endpoints ---

@router.get("/", response_model=List[SoftwareCatalogResponse])
def get_software_catalog(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    category: Optional[SoftwareCategory] = None,
    status: Optional[SoftwareStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SoftwareCatalog)
    
    if search:
        query = query.filter(
            or_(
                SoftwareCatalog.name.ilike(f"%{search}%"),
                SoftwareCatalog.publisher.ilike(f"%{search}%"),
                SoftwareCatalog.aliases.ilike(f"%{search}%")
            )
        )
    if category:
        query = query.filter(SoftwareCatalog.category == category)
    if status:
        query = query.filter(SoftwareCatalog.status == status)
        
    items = query.offset(skip).limit(limit).all()
    
    # Enrich with CI count (rudimentary, better with a subquery or separate endpoint for perf)
    results = []
    for item in items:
        count = db.query(func.count(ConfigurationItem.id)).filter(ConfigurationItem.software_id == item.id).scalar()
        item_dict = item.__dict__
        item_dict['aliases'] = json.loads(item.aliases) if item.aliases else []
        item_dict['ci_count'] = count
        results.append(item_dict)
        
    return results

@router.post("/", response_model=SoftwareCatalogResponse)
def create_software_item(item: SoftwareCatalogCreate, db: Session = Depends(get_db)):
    # specific handling for aliases list -> json string
    aliases_json = json.dumps(item.aliases) if item.aliases else None
    
    db_item = SoftwareCatalog(
        name=item.name,
        version=item.version,
        publisher=item.publisher,
        category=item.category,
        status=item.status,
        end_of_life_date=item.end_of_life_date,
        aliases=aliases_json
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Return matched format
    res = db_item.__dict__
    res['aliases'] = json.loads(db_item.aliases) if db_item.aliases else []
    res['ci_count'] = 0
    return res

@router.put("/{item_id}", response_model=SoftwareCatalogResponse)
def update_software_item(item_id: int, item_in: SoftwareCatalogUpdate, db: Session = Depends(get_db)):
    db_item = db.query(SoftwareCatalog).filter(SoftwareCatalog.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Software item not found")
    
    db_item.name = item_in.name
    db_item.version = item_in.version
    db_item.publisher = item_in.publisher
    db_item.category = item_in.category
    db_item.status = item_in.status
    db_item.end_of_life_date = item_in.end_of_life_date
    db_item.aliases = json.dumps(item_in.aliases) if item_in.aliases else None
    
    db.commit()
    db.refresh(db_item)
    
    ci_count = db.query(func.count(ConfigurationItem.id)).filter(ConfigurationItem.software_id == db_item.id).scalar()
    
    res = db_item.__dict__
    res['aliases'] = json.loads(db_item.aliases) if db_item.aliases else []
    res['ci_count'] = ci_count
    return res

@router.get("/unmatched", response_model=List[dict])
def get_unmatched_software(db: Session = Depends(get_db)):
    """
    Returns list of distinct 'os_db_system' values from CIs that:
    1. Have os_db_system populated
    2. Have software_id IS NULL
    Returns format: { "value": "Win 10", "count": 15 }
    """
    results = db.query(
        ConfigurationItem.os_db_system, 
        func.count(ConfigurationItem.id)
    ).filter(
        ConfigurationItem.os_db_system.isnot(None),
        ConfigurationItem.software_id.is_(None)
    ).group_by(
        ConfigurationItem.os_db_system
    ).order_by(
        func.count(ConfigurationItem.id).desc()
    ).all()
    
    return [{"value": r[0], "count": r[1]} for r in results]

@router.post("/match", response_model=dict)
def match_alias(data: MatchRequest, db: Session = Depends(get_db)):
    """
    Manually triggers matching: Updates all CIs with os_db_system = `string_to_match`
    to have software_id = `software_id`.
    Also optionally adds the string to the software's alias list if not present.
    """
    # 1. Update CIs
    updated_count = db.query(ConfigurationItem).filter(
        ConfigurationItem.os_db_system == data.string_to_match
    ).update({ConfigurationItem.software_id: data.software_id}, synchronize_session=False)
    
    # 2. Add to aliases if new
    software = db.query(SoftwareCatalog).filter(SoftwareCatalog.id == data.software_id).first()
    if software:
        current_aliases = json.loads(software.aliases) if software.aliases else []
        if data.string_to_match not in current_aliases:
            current_aliases.append(data.string_to_match)
            software.aliases = json.dumps(current_aliases)
            
    db.commit()
    return {"message": "Matched successfully", "updated_count": updated_count}
