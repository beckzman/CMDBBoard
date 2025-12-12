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
import oracledb
import pandas as pd
import os

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

    @abstractmethod
    def get_schema(self) -> List[str]:
        """Get list of available field names from the source."""
        pass


class SharePointConnector(Connector):
    """Connector for SharePoint Lists."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch data from SharePoint list."""
        from office365.sharepoint.client_context import ClientContext
        from office365.runtime.auth.user_credential import UserCredential
        
        try:
            site_url = self.config.get('site_url')
            list_name = self.config.get('list_name')
            username = self.config.get('username')
            password = self.config.get('password')
            
            if not all([site_url, list_name, username, password]):
                raise ValueError("Missing required SharePoint configuration: site_url, list_name, username, password")
            
            logger.info(f"Connecting to SharePoint: {site_url}")
            
            # Create credentials and context
            credentials = UserCredential(username, password)
            ctx = ClientContext(site_url).with_credentials(credentials)
            
            # Get the list
            sp_list = ctx.web.lists.get_by_title(list_name)
            
            # Fetch all items
            items = sp_list.items.get().execute_query()
            
            # Convert SharePoint items to dictionaries
            result = []
            for item in items:
                # Get all properties from the item
                item_dict = {}
                for key, value in item.properties.items():
                    # Skip internal SharePoint fields
                    if not key.startswith('_') and key not in ['__metadata', 'odata.type', 'odata.id', 'odata.editLink']:
                        item_dict[key] = value
                result.append(item_dict)
            
            logger.info(f"Successfully fetched {len(result)} items from SharePoint list '{list_name}'")
            return result
            
        except Exception as e:
            logger.error(f"SharePoint fetch error: {e}")
            raise ValueError(f"Failed to fetch data from SharePoint: {str(e)}")

    def test_connection(self) -> bool:
        """Test connection to SharePoint."""
        from office365.sharepoint.client_context import ClientContext
        from office365.runtime.auth.user_credential import UserCredential
        
        try:
            site_url = self.config.get('site_url')
            username = self.config.get('username')
            password = self.config.get('password')
            
            if not all([site_url, username, password]):
                logger.error("Missing SharePoint credentials")
                return False
            
            # Create credentials and context
            credentials = UserCredential(username, password)
            ctx = ClientContext(site_url).with_credentials(credentials)
            
            # Try to access the web to verify connection
            web = ctx.web.get().execute_query()
            
            logger.info(f"SharePoint connection successful: {web.properties.get('Title', 'Unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"SharePoint connection test failed: {e}")
            return False

    def get_schema(self) -> List[str]:
        """Get list of field names from SharePoint list."""
        from office365.sharepoint.client_context import ClientContext
        from office365.runtime.auth.user_credential import UserCredential
        
        try:
            site_url = self.config.get('site_url')
            list_name = self.config.get('list_name')
            username = self.config.get('username')
            password = self.config.get('password')
            
            if not all([site_url, list_name, username, password]):
                raise ValueError("Missing required SharePoint configuration")
            
            # Create credentials and context
            credentials = UserCredential(username, password)
            ctx = ClientContext(site_url).with_credentials(credentials)
            
            # Get the list and its fields
            sp_list = ctx.web.lists.get_by_title(list_name)
            fields = sp_list.fields.get().execute_query()
            
            # Extract field names, excluding internal fields
            field_names = []
            for field in fields:
                field_name = field.properties.get('InternalName', '')
                if not field_name.startswith('_') and field_name not in ['ContentType', 'Attachments']:
                    field_names.append(field_name)
            
            logger.info(f"Fetched {len(field_names)} fields from SharePoint list")
            return sorted(field_names)
            
        except Exception as e:
            logger.error(f"Failed to fetch SharePoint schema: {e}")
            return []



class IDoitConnector(Connector):
    """Connector for i-doit JSON-RPC API."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch data from i-doit via JSON-RPC API."""
        import requests
        
        try:
            api_url = self.config.get('api_url')
            api_key = self.config.get('api_key')
            
            if not all([api_url, api_key]):
                raise ValueError("Missing required i-doit configuration: api_url, api_key")
            
            logger.info(f"Connecting to i-doit: {api_url}")
            
            # Prepare JSON-RPC request
            payload = {
                "jsonrpc": "2.0",
                "method": "cmdb.objects.read",
                "params": {
                    "apikey": api_key
                },
                "id": 1
            }
            
            # Make request
            response = requests.post(
                api_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            response.raise_for_status()
            
            # Parse response
            result = response.json()
            
            if 'error' in result:
                error_msg = result['error'].get('message', 'Unknown error')
                raise ValueError(f"i-doit API error: {error_msg}")
            
            objects = result.get('result', [])
            logger.info(f"Successfully fetched {len(objects)} objects from i-doit")
            
            return objects
            
        except requests.exceptions.RequestException as e:
            logger.error(f"i-doit connection error: {e}")
            raise ValueError(f"Failed to connect to i-doit: {str(e)}")
        except Exception as e:
            logger.error(f"i-doit fetch error: {e}")
            raise ValueError(f"Failed to fetch data from i-doit: {str(e)}")

    def test_connection(self) -> bool:
        """Test connection to i-doit API."""
        import requests
        
        try:
            api_url = self.config.get('api_url')
            api_key = self.config.get('api_key')
            
            if not all([api_url, api_key]):
                logger.error("Missing i-doit credentials")
                return False
            
            # Test with idoit.version method
            payload = {
                "jsonrpc": "2.0",
                "method": "idoit.version",
                "params": {
                    "apikey": api_key
                },
                "id": 1
            }
            
            response = requests.post(
                api_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response.raise_for_status()
            
            result = response.json()
            
            if 'error' in result:
                logger.error(f"i-doit API error: {result['error']}")
                return False
            
            version = result.get('result', {})
            logger.info(f"i-doit connection successful. Version: {version}")
            return True
            
        except Exception as e:
            logger.error(f"i-doit connection test failed: {e}")
            return False

    def get_schema(self) -> List[str]:
        """Get list of common i-doit field names."""
        # Return common i-doit object fields
        # These are standard fields returned by cmdb.objects.read
        return sorted([
            'id',
            'title',
            'sysid',
            'type',
            'type_title',
            'type_group_title',
            'status',
            'cmdb_status',
            'cmdb_status_title',
            'created',
            'updated',
            'objecttype',
            'location_path'
        ])



class OracleConnector(Connector):
    """Connector for Oracle Database."""

    def fetch_data(self) -> List[Dict[str, Any]]:
        logger.info("Fetching data from Oracle DB...")
        try:
            # Extract config
            user = self.config.get('user')
            password = self.config.get('password')
            dsn = f"{self.config.get('host')}:{self.config.get('port')}/{self.config.get('service_name')}"

            # Connect to Oracle
            with oracledb.connect(user=user, password=password, dsn=dsn) as connection:
                with connection.cursor() as cursor:
                    # Execute query (this should be configurable, but hardcoded for now as per simple requirement)
                    # Assuming a view or table named 'CMDB_EXPORT' exists
                    sql = "SELECT * FROM CMDB_EXPORT"
                    cursor.execute(sql)
                    
                    # Get column names
                    columns = [col[0] for col in cursor.description]
                    cursor.rowfactory = lambda *args: dict(zip(columns, args))
                    
                    rows = cursor.fetchall()
                    return rows
                    
        except oracledb.Error as e:
            logger.error(f"Oracle DB Error: {e}")
            raise ValueError(f"Oracle DB Connection Failed: {e}")
        except Exception as e:
             logger.error(f"Unexpected error in Oracle Connector: {e}")
             raise

    def test_connection(self) -> bool:
        try:
            user = self.config.get('user')
            password = self.config.get('password')
            dsn = f"{self.config.get('host')}:{self.config.get('port')}/{self.config.get('service_name')}"
            
            with oracledb.connect(user=user, password=password, dsn=dsn) as connection:
                return True
        except Exception as e:
            logger.error(f"Oracle Connection Test Failed: {e}")
            return False

    def get_schema(self) -> List[str]:
        """Get list of column names from Oracle table/view."""
        try:
            user = self.config.get('user')
            password = self.config.get('password')
            dsn = f"{self.config.get('host')}:{self.config.get('port')}/{self.config.get('service_name')}"
            
            with oracledb.connect(user=user, password=password, dsn=dsn) as connection:
                with connection.cursor() as cursor:
                    # Query to get columns from CMDB_EXPORT view/table
                    # This assumes the table exists; adjust as needed
                    cursor.execute("""
                        SELECT column_name 
                        FROM user_tab_columns 
                        WHERE table_name = 'CMDB_EXPORT'
                        ORDER BY column_name
                    """)
                    columns = [row[0] for row in cursor.fetchall()]
                    return columns
                    
        except Exception as e:
            logger.error(f"Failed to fetch Oracle schema: {e}")
            # Return empty list if table doesn't exist or error occurs
            return []


class CSVConnector(Connector):
    """Connector for Local CSV Files."""

    def fetch_data(self) -> List[Dict[str, Any]]:
        file_path = self.config.get('file_path')
        logger.info(f"Reading data from CSV file: {file_path}")
        
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"CSV file not found: {file_path}")
                
            df = pd.read_csv(file_path)
            # Replace NaN with None for JSON compatibility
            df = df.where(pd.notnull(df), None)
            return df.to_dict('records')
            
        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            raise

    def test_connection(self) -> bool:
        try:
            file_path = self.config.get('file_path')
            if not file_path:
                return False
            return os.path.exists(file_path) and os.access(file_path, os.R_OK)
        except Exception as e:
            logger.error(f"CSV Connection Test Failed: {e}")
            return False

    def get_schema(self) -> List[str]:
        """Get list of column names from CSV file."""
        file_path = self.config.get('file_path')
        
        try:
            if not file_path or not os.path.exists(file_path):
                return []
            
            df = pd.read_csv(file_path, nrows=0)  # Read only headers
            return sorted(df.columns.tolist())
            
        except Exception as e:
            logger.error(f"Failed to read CSV schema: {e}")
            return []


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
            
            errors = []
            for raw_record in raw_data:
                try:
                    # Map external data to CMDB format
                    mapped_record = self.field_mapper.map_data(raw_record)
                    self._process_record(mapped_record, raw_record)
                except Exception as e:
                    logger.error(f"Failed to process record: {e}")
                    self.db.rollback()  # Reset session state after failure
                    self.log.records_failed += 1
                    errors.append({
                        "record": str(raw_record),
                        "error": str(e)
                    })
            
            if errors:
                import json
                self.log.details = json.dumps(errors)
            
            self.log.status = "success" if self.log.records_failed == 0 else "partial_success"
            self.log.completed_at = datetime.utcnow()
            self.source.last_run = datetime.utcnow()
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()  # Ensure rollback on outer exception
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
        elif self.source.source_type == "oracle":
            return OracleConnector(self.config)
        elif self.source.source_type == "csv":
            return CSVConnector(self.config)
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
                    # Special handling for Enums
                    if field_name == 'ci_type':
                        value = self._parse_ci_type(value)
                    
                    setattr(ci, field_name, value)
                    updated_fields.append(field_name)
        
        # Always update sync metadata
        ci.last_sync = datetime.utcnow()
        ci.deleted_at = None  # Resurrect if deleted
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

def get_connector_for_test(source_type: str, config: Dict[str, Any]) -> Optional[Connector]:
    """Factory to get a connector for testing purposes."""
    if source_type == "sharepoint":
        return SharePointConnector(config)
    elif source_type == "idoit":
        return IDoitConnector(config)
    elif source_type == "oracle":
        return OracleConnector(config)
    elif source_type == "csv":
        return CSVConnector(config)
    return None
