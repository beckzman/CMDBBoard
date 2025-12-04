"""
Import Engine for CMDB.
Handles data fetching from external sources and reconciliation with internal CIs.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import logging
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import ConfigurationItem, ImportSource, ImportLog, CIType, CIStatus
from app.core.field_mapper import FieldMapper, ReconciliationConfig, parse_import_config

logger = logging.getLogger(__name__)

class Connector(ABC):
    """Base class for import connectors."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config

    @abstractmethod
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch data from the external source."""
        pass

    @abstractmethod
    def test_connection(self) -> bool:
        """Test if the connection to the source is working."""
        pass


class SharePointConnector(Connector):
    """Connector for SharePoint Lists."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        # TODO: Implement actual SharePoint API call using Office365-REST-Python-Client
        logger.info("Fetching data from SharePoint...")
        
        # Return sample data for testing
        return [
            {
                "Title": "web-server-01",
                "AssetType": "server",
                "Owner": {"Email": "admin@arcelormittal.com"},
                "Location": "Data Center A",
                "Environment": "Production",
                "Specifications": "16GB RAM, 4 CPU"
            }
        ]

    def test_connection(self) -> bool:
        # TODO: Implement connection test
        return True


class IDoitConnector(Connector):
    """Connector for i-doit JSON-RPC API."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        # TODO: Implement i-doit API call
        logger.info("Fetching data from i-doit...")
        return []

    def test_connection(self) -> bool:
        # TODO: Implement connection test
        return True


class ReconciliationService:
    """Service to reconcile external data with internal CIs."""
    
    def __init__(self, db: Session, source: ImportSource):
        self.db = db
        self.source = source
        
        # Parse configuration
        self.config = parse_import_config(source.config or '{}')
        self.field_mapper = FieldMapper(self.config.get('field_mapping', {}))
        self.recon_config = ReconciliationConfig(self.config.get('reconciliation', {}))
        
        self.log = ImportLog(
            import_type=source.source_type,
            source=source.name,
            status="running",
            user_id=1  # System user or admin
        )
        self.db.add(self.log)
        self.db.commit()

    def run_import(self):
        """Execute the import process."""
        try:
            connector = self._get_connector()
            if not connector:
                raise ValueError(f"Unknown source type: {self.source.source_type}")

            raw_data = connector.fetch_data()
            self.log.records_processed = len(raw_data)
            
            for raw_record in raw_data:
                try:
                    # Map external data to CMDB format
                    mapped_record = self.field_mapper.map_data(raw_record)
                    self._process_record(mapped_record, raw_record)
                except Exception as e:
                    logger.error(f"Failed to process record: {e}")
                    self.log.records_failed += 1
            
            self.log.status = "success"
            self.log.completed_at = datetime.utcnow()
            self.source.last_run = datetime.utcnow()
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Import failed: {e}")
            self.log.status = "failed"
            self.log.error_message = str(e)
            self.log.completed_at = datetime.utcnow()
            self.db.commit()

    def _get_connector(self) -> Optional[Connector]:
        if self.source.source_type == "sharepoint":
            return SharePointConnector(self.config)
        elif self.source.source_type == "idoit":
            return IDoitConnector(self.config)
        return None

    def _process_record(self, mapped_record: Dict[str, Any], raw_record: Dict[str, Any]):
        """Process a single mapped record and merge with DB."""
        # Get the reconciliation key value
        match_value = self.recon_config.get_match_value(mapped_record)
        if not match_value:
            logger.warning(f"No reconciliation key found in record: {mapped_record}")
            self.log.records_failed += 1
            return

        # Find existing CI using reconciliation key
        key_field = self.recon_config.key_field
        ci = self.db.query(ConfigurationItem).filter(
            getattr(ConfigurationItem, key_field) == match_value
        ).first()

        if ci:
            # Update existing CI
            self._update_ci(ci, mapped_record, raw_record)
        else:
            # Create new CI
            self._create_ci(mapped_record, raw_record)
        
        self.log.records_success += 1

    def _create_ci(self, mapped_record: Dict[str, Any], raw_record: Dict[str, Any]):
        """Create a new CI from mapped data."""
        ci_data = {
            'name': mapped_record.get('name'),
            'ci_type': self._parse_ci_type(mapped_record.get('ci_type')),
            'status': CIStatus.ACTIVE,
            'description': mapped_record.get('description'),
            'owner': mapped_record.get('owner'),
            'location': mapped_record.get('location'),
            'environment': mapped_record.get('environment'),
            'cost_center': mapped_record.get('cost_center'),
            'technical_details': mapped_record.get('technical_details'),
            'domain': mapped_record.get('domain'),
            'external_id': raw_record.get('id') or raw_record.get('ID'),
            'import_source_id': self.source.id,
            'last_sync': datetime.utcnow()
        }
        
        new_ci = ConfigurationItem(**ci_data)
        self.db.add(new_ci)
        self.db.commit()
        logger.info(f"Created new CI: {new_ci.name}")

    def _update_ci(self, ci: ConfigurationItem, mapped_record: Dict[str, Any], raw_record: Dict[str, Any]):
        """Update existing CI based on conflict resolution rules."""
        updated_fields = []
        
        for field_name, value in mapped_record.items():
            if field_name == self.recon_config.key_field:
                continue  # Don't update the reconciliation key
            
            # Check if we should update this field
            if self.recon_config.should_update_field(field_name):
                if hasattr(ci, field_name) and value is not None:
                    setattr(ci, field_name, value)
                    updated_fields.append(field_name)
        
        # Always update sync metadata
        ci.last_sync = datetime.utcnow()
        if raw_record.get('id') or raw_record.get('ID'):
            ci.external_id = raw_record.get('id') or raw_record.get('ID')
        
        self.db.commit()
        logger.info(f"Updated CI: {ci.name} (fields: {', '.join(updated_fields)})")

    def _parse_ci_type(self, type_str: Optional[str]) -> CIType:
        """Parse CI type from string."""
        if not type_str:
            return CIType.OTHER
        
        type_map = {
            'server': CIType.SERVER,
            'workstation': CIType.WORKSTATION,
            'network': CIType.NETWORK_DEVICE,
            'storage': CIType.STORAGE,
            'application': CIType.APPLICATION,
            'database': CIType.DATABASE,
            'service': CIType.SERVICE
        }
        
        return type_map.get(type_str.lower(), CIType.OTHER)
