"""
CI Relationship routes.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.auth import get_current_user, require_role
from app.db.database import get_db
from app.db.models import Relationship, ConfigurationItem, User, UserRole
from app.schemas import RelationshipCreate, RelationshipResponse

router = APIRouter(prefix="/api/relationships", tags=["Relationships"])

@router.get("", response_model=List[RelationshipResponse])
def get_all_relationships(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all relationships."""
    return db.query(Relationship).all()
@router.get("/ci/{ci_id}", response_model=List[RelationshipResponse])
def get_ci_relationships(
    ci_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all relationships for a specific CI (as source or target)."""
    # Verify CI exists
    ci = db.query(ConfigurationItem).filter(
        ConfigurationItem.id == ci_id,
        ConfigurationItem.deleted_at.is_(None)
    ).first()
    
    if not ci:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration item not found"
        )
        
    relationships = db.query(Relationship).filter(
        or_(
            Relationship.source_ci_id == ci_id,
            Relationship.target_ci_id == ci_id
        )
    ).all()
    
    return relationships


@router.post("", response_model=RelationshipResponse, status_code=status.HTTP_201_CREATED)
def create_relationship(
    relation_data: RelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.EDITOR))
):
    """Create a new relationship between two CIs."""
    # Verify both CIs exist
    source_ci = db.query(ConfigurationItem).get(relation_data.source_ci_id)
    target_ci = db.query(ConfigurationItem).get(relation_data.target_ci_id)
    
    if not source_ci or not target_ci:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both configuration items not found"
        )
        
    # Check for existing relationship
    existing = db.query(Relationship).filter(
        Relationship.source_ci_id == relation_data.source_ci_id,
        Relationship.target_ci_id == relation_data.target_ci_id,
        Relationship.relationship_type == relation_data.relationship_type
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Relationship already exists"
        )
        
    new_relation = Relationship(**relation_data.model_dump())
    db.add(new_relation)
    db.commit()
    db.refresh(new_relation)
    
    return new_relation


@router.delete("/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relationship(
    relationship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.EDITOR))
):
    """Delete a relationship."""
    relation = db.query(Relationship).get(relationship_id)
    
    if not relation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )
        
    db.delete(relation)
    db.commit()
    
    return None
