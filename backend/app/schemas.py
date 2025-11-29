"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.db.models import CIStatus, CIType, RelationType, UserRole


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# Configuration Item Schemas
class CIBase(BaseModel):
    name: str
    ci_type: CIType
    status: CIStatus = CIStatus.ACTIVE
    description: Optional[str] = None
    owner: Optional[str] = None
    location: Optional[str] = None
    environment: Optional[str] = None
    cost_center: Optional[str] = None
    technical_details: Optional[str] = None


class CICreate(CIBase):
    pass


class CIUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[CIStatus] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    location: Optional[str] = None
    environment: Optional[str] = None
    cost_center: Optional[str] = None
    technical_details: Optional[str] = None


class CIResponse(CIBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Relationship Schemas
class RelationshipBase(BaseModel):
    source_ci_id: int
    target_ci_id: int
    relationship_type: RelationType
    description: Optional[str] = None


class RelationshipCreate(RelationshipBase):
    pass


class RelationshipResponse(RelationshipBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Import Log Schemas
class ImportLogResponse(BaseModel):
    id: int
    import_type: str
    source: Optional[str] = None
    status: str
    records_processed: int
    records_success: int
    records_failed: int
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Dashboard Schemas
class DashboardStats(BaseModel):
    total_cis: int
    active_cis: int
    inactive_cis: int
    cis_by_type: dict
    cis_by_status: dict
    recent_imports: int


class CIListResponse(BaseModel):
    items: List[CIResponse]
    total: int
    page: int
    page_size: int
