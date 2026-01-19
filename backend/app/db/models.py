"""
Database models for ITIL CMDB.
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class CIStatus(str, enum.Enum):
    """Configuration Item status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    RETIRED = "retired"
    PLANNED = "planned"
    MAINTENANCE = "maintenance"


class CIType(str, enum.Enum):
    """Configuration Item type enumeration."""
    SERVER = "server"
    APPLICATION = "application"
    NETWORK_DEVICE = "network_device"
    DATABASE = "database"
    WORKSTATION = "workstation"
    STORAGE = "storage"
    SERVICE = "service"
    OTHER = "other"


class RelationType(str, enum.Enum):
    """Relationship type enumeration."""
    DEPENDS_ON = "depends_on"
    RUNS_ON = "runs_on"
    CONNECTS_TO = "connects_to"
    USES = "uses"
    HOSTS = "hosts"
    MANAGED_BY = "managed_by"


class UserRole(str, enum.Enum):
    """User role enumeration."""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class User(Base):
    """User model for authentication and authorization."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ConfigurationItem(Base):
    """Base Configuration Item model."""
    __tablename__ = "configuration_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    ci_type = Column(Enum(CIType), nullable=False, index=True)
    status = Column(Enum(CIStatus), default=CIStatus.ACTIVE, nullable=False, index=True)
    domain = Column(String(255), nullable=True)
    description = Column(Text)
    department = Column(String(255))
    location = Column(String(255))
    environment = Column(String(50))  # production, development, test, etc.
    cost_center = Column(String(100))
    os_db_system = Column(String(255))
    sla = Column(String(255))  # Service Level Agreement
    service_provider = Column(String(255))  # e.g. BTC, CGI
    contact = Column(String(255))  # Person or Team responsible
    
    # Technical details (JSON-like text field for flexibility)
    # Technical details (JSON-like text field for flexibility)
    technical_details = Column(Text)  # Store as JSON string
    
    # Raw Data from Import Source (Full JSON dump)
    raw_data = Column(JSON, nullable=True)  # Store original import data
    patch_summary = Column(JSON, nullable=True) # Store WSUS/Patch summary: {needed: int, critical: int, etc}
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete
    
    # Health monitoring
    last_ping_success = Column(DateTime(timezone=True), nullable=True)  # Last successful ping
    
    # Import / Sync
    external_id = Column(String(255), index=True)  # ID in the source system
    last_sync = Column(DateTime(timezone=True))
    import_source_id = Column(Integer, ForeignKey("import_sources.id"), nullable=True)

    # Link to Software Catalog (DML)
    software_id = Column(Integer, ForeignKey("software_catalog.id"), nullable=True)
    software = relationship("SoftwareCatalog", back_populates="cis")
    
    # Relationships
    source_relationships = relationship(
        "Relationship",
        foreign_keys="Relationship.source_ci_id",
        back_populates="source_ci",
        cascade="all, delete-orphan"
    )
    target_relationships = relationship(
        "Relationship",
        foreign_keys="Relationship.target_ci_id",
        back_populates="target_ci",
        cascade="all, delete-orphan"
    )

    @property
    def relationships_summary(self) -> str:
        """Returns a comma-separated string of related CIs."""
        summary_parts = []
        
        # Source relationships
        for rel in self.source_relationships:
            if rel.target_ci:
                summary_parts.append(rel.target_ci.name)
                
        # Target relationships
        for rel in self.target_relationships:
            if rel.source_ci:
                summary_parts.append(rel.source_ci.name)
                
        if not summary_parts:
            return None
            
        return ", ".join(summary_parts)


class Relationship(Base):
    """Relationship between CIs."""
    __tablename__ = "relationships"
    
    id = Column(Integer, primary_key=True, index=True)
    source_ci_id = Column(Integer, ForeignKey("configuration_items.id"), nullable=False)
    target_ci_id = Column(Integer, ForeignKey("configuration_items.id"), nullable=False)
    relationship_type = Column(Enum(RelationType), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    source_ci = relationship("ConfigurationItem", foreign_keys=[source_ci_id], back_populates="source_relationships")
    target_ci = relationship("ConfigurationItem", foreign_keys=[target_ci_id], back_populates="target_relationships")


class ImportLog(Base):
    """Import history tracking."""
    __tablename__ = "import_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    import_type = Column(String(50), nullable=False)  # csv, sharepoint, api
    source = Column(String(500))  # filename, URL, etc.
    status = Column(String(50), nullable=False)  # pending, success, failed
    records_processed = Column(Integer, default=0)
    records_success = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    error_message = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    details = Column(Text)  # JSON string for detailed logs


class ImportSource(Base):
    """Configuration for external import sources."""
    __tablename__ = "import_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    source_type = Column(String(50), nullable=False)  # sharepoint, idoit
    config = Column(Text)  # JSON string for credentials and settings
    is_active = Column(Boolean, default=True)
    
    # Schedule
    schedule_cron = Column(String(100))  # e.g., "0 2 * * *"
    last_run = Column(DateTime(timezone=True))
    next_run = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Domain(Base):
    """Domain Configuration model."""
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CostRule(Base):
    """Cost calculation rules based on CI attributes."""
    __tablename__ = "cost_rules"

    id = Column(Integer, primary_key=True, index=True)
    ci_type = Column(Enum(CIType), nullable=False, index=True)
    sla = Column(String(255), nullable=True)
    os_db_system = Column(String(255), nullable=True)
    base_cost = Column(Float, nullable=False)
    currency = Column(String(3), default="EUR", nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SoftwareCategory(str, enum.Enum):
    """Category of software in the catalog."""
    OS = "os"
    DATABASE = "database"
    APPLICATION = "application"
    OTHER = "other"


class SoftwareStatus(str, enum.Enum):
    """Lifecycle status of the software."""
    APPROVED = "approved"
    UNAPPROVED = "unapproved"
    RESTRICTED = "restricted"
    END_OF_LIFE = "end_of_life"


class SoftwareCatalog(Base):
    """Definitive Media Library (DML) - Software Catalog."""
    __tablename__ = "software_catalog"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)  # e.g., "Windows Server 2022"
    version = Column(String(100))  # e.g., "2022"
    publisher = Column(String(255))  # e.g., "Microsoft"
    category = Column(Enum(SoftwareCategory), default=SoftwareCategory.OTHER, nullable=False)
    status = Column(Enum(SoftwareStatus), default=SoftwareStatus.UNAPPROVED, nullable=False)
    end_of_life_date = Column(DateTime(timezone=True), nullable=True)
    
    # Aliases: stored as JSON list of strings [ "Win2022", "Windows 2022" ]
    aliases = Column(Text) 

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    cis = relationship("ConfigurationItem", back_populates="software")


