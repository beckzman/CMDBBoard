"""
Import Engine for CMDB.
Handles data fetching from external sources and reconciliation with internal CIs.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Iterator
import logging
import json
from datetime import datetime
import requests
from sqlalchemy.orm import Session
from app.db.models import ConfigurationItem, ImportSource, ImportLog, CIType, CIStatus
from app.core.field_mapper import FieldMapper, ReconciliationConfig, parse_import_config
try:
    import oracledb
except ImportError:
    oracledb = None
try:
    import pandas as pd
except ImportError:
    pd = None
try:
    from pyVim.connect import SmartConnect, Disconnect
    from pyVmomi import vim
    import ssl
except ImportError:
    vim = None
import os

logger = logging.getLogger(__name__)

class Connector(ABC):
    """Base class for import connectors."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config

    @abstractmethod
    def fetch_data(self) -> Iterator[List[Dict[str, Any]]]:
        """Fetch data from the external source, yielding batches."""
        pass

    @abstractmethod
    def test_connection(self) -> bool:
        """Test if the connection to the source is working."""
        pass

    @abstractmethod
    def get_schema(self) -> List[str]:
        """Get list of available field names from the source."""
        pass

    @abstractmethod
    def get_categories(self) -> List[Dict[str, Any]]:
        """Get list of available object categories/types from the source."""
        return []


class SharePointConnector(Connector):
    """Connector for SharePoint Lists."""
    
    def fetch_data(self) -> Iterator[List[Dict[str, Any]]]:
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
            
            # Fetch all items with text values (resolved lookups)
            items = sp_list.items.expand(["FieldValuesAsText"]).get_all().execute_query()
            
            # Convert SharePoint items to dictionaries
            result = []
            for item in items:
                # Get all properties from the item
                item_dict = {}
                for key, value in item.properties.items():
                    # Skip internal SharePoint fields
                    if not key.startswith('_') and key not in ['__metadata', 'odata.type', 'odata.id', 'odata.editLink']:
                        item_dict[key] = value
                
                # Merge resolved text values (e.g. for Lookups/Choice fields)
                # This makes 'Server' available alongside 'ServerId'
                # Access via properties dict as direct attribute might not be available depending on library version/state
                field_values_as_text = item.properties.get('FieldValuesAsText', None)
                
                if field_values_as_text and hasattr(field_values_as_text, 'properties'):
                    for key, value in field_values_as_text.properties.items():
                        if not key.startswith('_') and key not in ['__metadata', 'odata.type', 'odata.id', 'odata.editLink']:
                            if key not in item_dict:
                                item_dict[key] = value
                            
                            # Also add decoded key (remove _x005f_)
                            # SharePoint often double-escapes underscores in FieldValuesAsText
                            if '_x005f_' in key:
                                clean_key = key.replace('_x005f_', '_')
                                if clean_key not in item_dict:
                                    item_dict[clean_key] = value

                elif isinstance(field_values_as_text, dict):
                     # Fallback if it's just a dict
                     for key, value in field_values_as_text.items():
                        if not key.startswith('_') and key not in ['__metadata', 'odata.type', 'odata.id', 'odata.editLink']:
                            if key not in item_dict:
                                item_dict[key] = value
                            
                            # Also add decoded key
                            if '_x005f_' in key:
                                clean_key = key.replace('_x005f_', '_')
                                if clean_key not in item_dict:
                                    item_dict[clean_key] = value
                            
                result.append(item_dict)
            
            logger.info(f"Successfully fetched {len(result)} items from SharePoint list '{list_name}'")
            yield result
            
        except (IndexError, ValueError) as e:
            logger.error(f"SharePoint auth/fetch error: {e}")
            raise ValueError(f"Authentication failed or invalid response (MFA might be enabled?): {str(e)}")
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
            
        except (IndexError, ValueError) as e:
             logger.error(f"SharePoint connection failed (likely auth): {e}")
             # Log traceback for debugging
             import traceback
             logger.error(traceback.format_exc())
             return False # The UI will show "Connection failed" but logs will hint at MFA
             
        except Exception as e:
            import traceback
            logger.error(f"SharePoint connection test failed: {e}\n{traceback.format_exc()}")
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
            logger.error(f"Failed to fetch SharePoint schema: {e}", exc_info=True)
            return []

    def get_categories(self) -> List[Dict[str, Any]]:
        """Get list of available object categories/types from the source. Not applicable for SharePoint lists."""
        return []



class IDoitConnector(Connector):
    """Connector for i-doit JSON-RPC API."""
    
    def fetch_data(self) -> Iterator[List[Dict[str, Any]]]:
        """Fetch data from i-doit via JSON-RPC API with pagination."""
        import requests
        import time
        
        try:
            api_url = self.config.get('api_url')
            api_key = self.config.get('api_key')
            
            if not all([api_url, api_key]):
                raise ValueError("Missing required i-doit configuration: api_url, api_key")
            
            logger.info(f"Connecting to i-doit: {api_url}")
            
            # Prepare Base Filter
            obj_filter = {
                "type": self.config.get('category')  # Filter by object type if configured
            }

            # Incremental Import: Filter by update time if last_run is present
            last_run = self.config.get('last_run')
            if last_run:
                # i-doit expects specific date format or comparison operator
                logger.info(f"Incremental Import: Fetching objects updated since {last_run}")
                # Removing 'T' from isoformat if present for SQL-like compatibility often used by PHP apps
                clean_date = last_run.replace('T', ' ').split('.')[0]
                obj_filter["updated"] = { "from": clean_date }
            
            # Dynamic Category Optimization: Only fetch categories that are used in the mapping
            # Always fetch GLOBAL as it contains core info
            active_categories = {"C__CATG__GLOBAL"}
            
            # List of all supported/relevant i-doit categories to check against
            known_categories = [
                "C__CATG__IP", 
                "C__CATG__MODEL", 
                "C__CATG__CPU", 
                "C__CATG__MEMORY", 
                "C__CATG__OPERATING_SYSTEM",
                "C__CATG__LOCATION",
                "C__CATG__CONTACT",
                "C__CATG__ACCOUNTING",
                "C__CATG__NETWORK",
                "C__CATG__INTERFACE",
                "C__CATG__DRIVE"
            ]

            # Check field mappings to see which categories are required
            mappings = self.config.get('field_mapping', {}).values()
            flat_mappings = str(list(mappings)) # simple string check is sufficient and faster

            for cat in known_categories:
                if cat in flat_mappings:
                    active_categories.add(cat)
            
            logger.info(f"Fetching categories: {active_categories}")

            # STEP 1: Fetch ALL IDs (lightweight)
            logger.info("Step 1: Fetching all relevant object IDs from i-doit...")
            
            id_filter = obj_filter.copy()
            id_payload = {
                "jsonrpc": "2.0",
                "method": "cmdb.objects.read",
                "params": {
                    "apikey": api_key,
                    "filter": id_filter,
                    "categories": ["C__CATG__GLOBAL"],
                    "limit": 10000, 
                    "order_by": "id",
                    "sort": "ASC"
                },
                "id": 1
            }
            
            response = requests.post(
                api_url,
                json=id_payload,
                headers={'Content-Type': 'application/json'},
                timeout=120
            )
            response.raise_for_status()
            result = response.json()
            
            if 'error' in result:
                raise ValueError(f"i-doit API error (fetching IDs): {result['error']}")
            
            all_items = result.get('result', [])
            all_ids = []
            for item in all_items:
                if 'id' in item:
                    all_ids.append(int(item['id']))
            
            logger.info(f"Found {len(all_ids)} objects to import. Starting batch fetch...")
            
            if not all_ids:
                return

            # STEP 2: Fetch details in chunks
            chunk_size = 50
            
            for i in range(0, len(all_ids), chunk_size):
                chunk_ids = all_ids[i:i + chunk_size]
                
                logger.info(f"Fetching batch {i//chunk_size + 1}: {len(chunk_ids)} items")
                
                batch_filter = {
                    "ids": chunk_ids
                }
                
                batch_payload = {
                    "jsonrpc": "2.0",
                    "method": "cmdb.objects.read",
                    "params": {
                        "apikey": api_key,
                        "filter": batch_filter,
                        "categories": list(active_categories),
                    },
                    "id": i
                }
                
                try:
                    batch_response = requests.post(
                        api_url,
                        json=batch_payload,
                        headers={'Content-Type': 'application/json'},
                        timeout=120
                    )
                    batch_response.raise_for_status()
                    batch_result = batch_response.json()
                    
                    if 'error' in batch_result:
                        logger.error(f"Error fetching batch {chunk_ids}: {batch_result['error']}")
                        continue
                        
                    batch = batch_result.get('result', [])
                    
                    # Clean FQDN if configured
                    if self.config.get('clean_fqdn'):
                        for obj in batch:
                            if 'title' in obj and isinstance(obj['title'], str) and '.' in obj['title']:
                                obj['title'] = obj['title'].split('.')[0]
                                
                    yield batch
                    
                    # Be gentle on the server
                    time.sleep(0.2)
                    
                except Exception as e:
                    logger.error(f"Failed to fetch batch starting at index {i}: {e}")
                    continue

        except requests.exceptions.RequestException as e:
            logger.error(f"i-doit connection error: {e}")
            raise ValueError(f"Failed to connect to i-doit: {str(e)}")
        
        logger.info(f"Finished fetching data from i-doit")

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
        """Get list of available field names from i-doit by fetching a sample object and flattening it."""
        try:
            import requests
            api_url = self.config.get('api_url')
            api_key = self.config.get('api_key')
            
            if not all([api_url, api_key]):
                 return self._get_default_schema()

            payload = {
                "jsonrpc": "2.0",
                "method": "cmdb.objects.read",
                "params": {
                    "apikey": api_key,
                    "filter": {
                         "type": self.config.get('category')
                    },
                    "categories": [
                        "C__CATG__GLOBAL", 
                        "C__CATG__IP", 
                        "C__CATG__MODEL", 
                        "C__CATG__CPU", 
                        "C__CATG__MEMORY",
                        "C__CATG__OPERATING_SYSTEM",
                        "C__CATG__LOCATION",
                        "C__CATG__CONTACT",
                        "C__CATG__ACCOUNTING"
                    ],
                    "limit": 1
                },
                "id": 1
            }
            
            response = requests.post(
                api_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            result = response.json()
            
            if 'result' in result and len(result['result']) > 0:
                first_obj = result['result'][0]
                return self._flatten_schema(first_obj)
            
            return self._get_default_schema()
            
        except Exception as e:
            logger.warning(f"Failed to fetch dynamic i-doit schema: {e}")
            return self._get_default_schema()
            
    def _flatten_schema(self, data: Dict[str, Any], prefix: str = "") -> List[str]:
        """Recursively flatten dictionary keys to dot notation."""
        keys = []
        for k, v in data.items():
            full_key = f"{prefix}{k}" if prefix else k
            
            if isinstance(v, dict):
                keys.extend(self._flatten_schema(v, f"{full_key}."))
            elif isinstance(v, list):
                # For lists, we assume a list of objects or values.
                # We expose the '0' index to allow mapping the first item.
                # If the list is empty, we can't guess schema, so we just add the key itself
                if len(v) > 0 and isinstance(v[0], dict):
                    keys.extend(self._flatten_schema(v[0], f"{full_key}.0."))
                else:
                    keys.append(full_key)
            else:
                keys.append(full_key)
        
        return sorted(list(set(keys)))

    def _get_default_schema(self) -> List[str]:
        return sorted([
            'id', 'title', 'sysid', 'type', 'type_title', 
            'type_group_title', 'status', 'cmdb_status', 
            'cmdb_status_title', 'created', 'updated', 
            'objecttype', 'location_path'
        ])

    def preview_data(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Fetch a small sample of data for preview."""
        import requests
        
        try:
            api_url = self.config.get('api_url')
            api_key = self.config.get('api_key')
            
            if not all([api_url, api_key]):
                 raise ValueError("Missing configuration")

            payload = {
                "jsonrpc": "2.0",
                "method": "cmdb.objects.read",
                "params": {
                    "apikey": api_key,
                    "filter": {
                         "type": self.config.get('category')
                    },
                    "limit": limit
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
                raise ValueError(result['error'].get('message'))
                
            return result.get('result', [])
            
        except Exception as e:
            logger.error(f"Preview fetch failed: {e}")
            raise e

    def get_categories(self) -> List[Dict[str, Any]]:
        """Get list of available object categories (types) from i-doit."""
        import requests
        
        try:
            api_url = self.config.get('api_url')
            api_key = self.config.get('api_key')
            
            if not all([api_url, api_key]):
                raise ValueError("Missing required i-doit configuration")
            
            # Method: cmdb.object_types.read (requested by user)
            payload = {
                "jsonrpc": "2.0",
                "method": "cmdb.object_types.read",
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
                logger.error(f"i-doit API error (object_types): {result['error']}")
                return []
            
            # Extract types
            types = []
            
            raw_result = result.get('result')
            if not raw_result:
                return []
                
            # Handle both list and dict formats
            iterator = []
            if isinstance(raw_result, list):
                iterator = raw_result
            elif isinstance(raw_result, dict):
                iterator = raw_result.values()
            
            for item in iterator:
                if not isinstance(item, dict):
                    continue
                
                # Try to find ID and Title
                type_id = item.get('const', item.get('id'))
                type_name = item.get('title', 'Unknown')
                
                if type_id:
                    types.append({
                        "id": str(type_id),
                        "name": type_name
                    })
            
            # Sort by name
            return sorted(types, key=lambda x: x['name'])
            
        except Exception as e:
            logger.error(f"Failed to fetch i-doit categories: {e}")
            return []



class OracleConnector(Connector):
    """Connector for Oracle Database."""

    def fetch_data(self) -> Iterator[List[Dict[str, Any]]]:
        logger.info("Fetching data from Oracle DB...")
        try:
            # Extract config
            user = self.config.get('user')
            password = self.config.get('password')
            dsn = f"{self.config.get('host')}:{self.config.get('port')}/{self.config.get('service_name')}"

            # Connect to Oracle
            if not oracledb:
                raise ImportError("oracledb module is not installed.")
                
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
                    yield rows
                    
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

    def get_categories(self) -> List[Dict[str, Any]]:
        """Get list of available object categories/types from the source. Not applicable for Oracle tables."""
        return []


class VCenterConnector(Connector):
    """Connector for VMware vCenter."""

    def _get_connection(self):
        """Helper to establish vCenter connection."""
        if not vim:
            raise ImportError("pyvmomi module is not installed.")

        host = self.config.get('host')
        user = self.config.get('username')
        password = self.config.get('password')
        port = int(self.config.get('port', 443))
        
        if not all([host, user, password]):
            raise ValueError("Missing vCenter configuration: host, username, password")

        # Disable SSL verification for internal vCenters
        context = ssl._create_unverified_context()
        
        try:
            si = SmartConnect(host=host, user=user, pwd=password, port=port, sslContext=context)
            return si
        except Exception as e:
            logger.error(f"Failed to connect to vCenter: {e}")
            raise ValueError(f"Connection failed: {str(e)}")

    def fetch_data(self) -> Iterator[List[Dict[str, Any]]]:
        """Fetch VMs from vCenter."""
        si = None
        try:
            si = self._get_connection()
            content = si.RetrieveContent()
            
            # Create a container view for VirtualMachines
            container = content.rootFolder
            view_type = [vim.VirtualMachine]
            recursive = True
            container_view = content.viewManager.CreateContainerView(container, view_type, recursive)
            
            vms = container_view.view
            
            batch_size = 50
            batch = []
            
            for vm in vms:
                try:
                    summary = vm.summary
                    config = vm.config
                    guest = vm.guest
                    
                    # Basic Info
                    vm_data = {
                        "name": config.name if config else summary.config.name,
                        "id": summary.vm.type + ":" + summary.config.uuid if summary.config.uuid else None, # Unique ID
                        "uuid": summary.config.uuid if summary.config.uuid else None,
                        "path": summary.config.vmPathName,
                        "memory_mb": config.hardware.memoryMB if config else summary.config.memorySizeMB,
                        "cpu_count": config.hardware.numCPU if config else summary.config.numCpu,
                        "status": summary.runtime.powerState, # poweredOn, poweredOff, suspended
                        "ip_address": guest.ipAddress if guest else None,
                        "hostname": guest.hostName if guest else None,
                        "guest_os": config.guestFullName if config else summary.config.guestFullName,
                        "notes": config.annotation if config else None
                    }
                    
                    # Add to batch
                    batch.append(vm_data)
                    
                    if len(batch) >= batch_size:
                        yield batch
                        batch = []
                        
                except Exception as vm_e:
                    logger.warning(f"Error processing VM: {vm_e}")
                    continue
            
            if batch:
                yield batch
                
        except Exception as e:
            logger.error(f"vCenter fetch error: {e}")
            raise
        finally:
            if si:
                Disconnect(si)

    def test_connection(self) -> bool:
        si = None
        try:
            si = self._get_connection()
            # Just checking if session is active
            if si.content.sessionManager.currentSession:
                return True
            return False
        except Exception:
            return False
        finally:
            if si:
                Disconnect(si)

    def get_schema(self) -> List[str]:
        """Return hardcoded schema for now since dynamic reflection is complex in pyvmomi."""
        return sorted([
            "name", "id", "uuid", "path", "memory_mb", "cpu_count", 
            "status", "ip_address", "hostname", "guest_os", "notes"
        ])

    def get_categories(self) -> List[Dict[str, Any]]:
        return []


class BaramundiConnector(Connector):
    """Connector for Baramundi Management Suite (bConnect REST API)."""

    def fetch_data(self) -> Iterator[List[Dict[str, Any]]]:
        """Fetch devices from Baramundi."""
        import requests
        
        try:
            api_url = self.config.get('api_url')
            username = self.config.get('username')
            password = self.config.get('password')
            verify_ssl = self.config.get('verify_ssl', True)
            
            if not all([api_url, username, password]):
                raise ValueError("Missing Baramundi configuration")
                
            # Ensure URL ends with slash
            if not api_url.endswith('/'):
                api_url += '/'
                
            # Endpoint for devices (endpoints)
            # Assuming bConnect v1 structure: GET /endpoints
            # Adjust endpoint based on specific API version docs if needed
            endpoint = f"{api_url}endpoints"
            
            logger.info(f"Connecting to Baramundi: {endpoint}")
            
            # Pagination loop (if API supports it, otherwise fetch all)
            # implementation assumes standard list response for now
            
            response = requests.get(
                endpoint,
                auth=(username, password),
                verify=verify_ssl,
                headers={'Accept': 'application/json'},
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Handle different response structures (list vs dict with 'items')
            items = []
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict) and 'items' in data:
                items = data['items']
            elif isinstance(data, dict):
                 # maybe a single object or wrapped result
                 items = [data]
            
            logger.info(f"Fetched {len(items)} items from Baramundi")
            
            if items:
                yield items
                
        except Exception as e:
            logger.error(f"Baramundi fetch error: {e}")
            raise ValueError(f"Failed to fetch data from Baramundi: {str(e)}")

    def test_connection(self) -> bool:
        """Test connection to Baramundi."""
        import requests
        
        try:
            api_url = self.config.get('api_url')
            username = self.config.get('username')
            password = self.config.get('password')
            verify_ssl = self.config.get('verify_ssl', True)
            
            if not all([api_url, username, password]):
                return False

            if not api_url.endswith('/'):
                api_url += '/'
            
            # Simple ping to root or specific endpoint
            endpoint = f"{api_url}endpoints"
            
            response = requests.get(
                endpoint,
                auth=(username, password),
                verify=verify_ssl,
                headers={'Accept': 'application/json'},
                params={'limit': 1}, # Try to limit data if possible
                timeout=10
            )
            response.raise_for_status()
            return True
            
        except Exception as e:
            logger.error(f"Baramundi connection test failed: {e}")
            return False

    def get_schema(self) -> List[str]:
        """Get schema from a sample device."""
        import requests
        try:
            api_url = self.config.get('api_url')
            username = self.config.get('username')
            password = self.config.get('password')
            verify_ssl = self.config.get('verify_ssl', True)
            
            if not api_url.endswith('/'):
                api_url += '/'
            
            endpoint = f"{api_url}endpoints"
            
            response = requests.get(
                endpoint,
                auth=(username, password),
                verify=verify_ssl,
                headers={'Accept': 'application/json'},
                params={'limit': 1},
                timeout=10
            )
            data = response.json()
            
            sample = None
            if isinstance(data, list) and data:
                sample = data[0]
            elif isinstance(data, dict) and 'items' in data and data['items']:
                sample = data['items'][0]
                
            if sample:
                return sorted(list(sample.keys()))
            return []
            
        except Exception:
            return []

    def get_categories(self) -> List[Dict[str, Any]]:
        return []

class WSUSConnector(Connector):
    def __init__(self, config: dict):
        self.config = config

    def fetch_data(self) -> List[dict]:
        try:
            import pymssql
        except ImportError:
            raise ImportError("pymssql module not found. Please install it.")

        host = self.config.get("host")
        user = self.config.get("user")
        password = self.config.get("password")
        database = self.config.get("database", "SUSDB")
        port = int(self.config.get("port", 1433))

        conn = pymssql.connect(server=host, user=user, password=password, database=database, port=port)
        cursor = conn.cursor(as_dict=True)

        # Query to get Computer Name and Needed/Critical update counts
        # This is a simplified query. Real WSUS schema is complex.
        # Assuming v_ComputerStatus view or similiar logic.
        # Note: WSUS Public Views are recommended.
        
        query = """
        SELECT 
            c.FullDomainName as hostname,
            SUM(CASE WHEN u.UpdateClassificationTitle = 'Critical Updates' AND s.SummarizationState = 2 THEN 1 ELSE 0 END) as needed_critical,
            SUM(CASE WHEN u.UpdateClassificationTitle = 'Security Updates' AND s.SummarizationState = 2 THEN 1 ELSE 0 END) as needed_security,
            MAX(s.LastSyncTime) as last_sync
        FROM PUBLIC_VIEWS.vComputerTarget c
        JOIN PUBLIC_VIEWS.vUpdateInstallationInfoBasic s ON c.ComputerTargetId = s.ComputerTargetId
        JOIN PUBLIC_VIEWS.vUpdateInfo u ON s.UpdateId = u.UpdateId
        WHERE s.SummarizationState = 2 -- 2 = Needed/Missing
        GROUP BY c.FullDomainName
        """
        
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                results.append({
                    "name": row['hostname'].split('.')[0], # Match on hostname
                    "fqdn": row['hostname'],
                    "patch_summary": {
                        "needed_critical": row['needed_critical'],
                        "needed_security": row['needed_security'],
                        "last_sync": str(row['last_sync']) if row['last_sync'] else None
                    },
                    "source_id": row['hostname']
                })
            return results
        finally:
            conn.close()

    def test_connection(self) -> bool:
        try:
            import pymssql
            host = self.config.get("host")
            user = self.config.get("user")
            password = self.config.get("password")
            database = self.config.get("database", "SUSDB")
            port = int(self.config.get("port", 1433))
            
            conn = pymssql.connect(server=host, user=user, password=password, database=database, port=port)
            conn.close()
            return True
        except Exception as e:
            print(f"WSUS Connection Error: {e}")
            return False

class CSVConnector(Connector):
    """Connector for Local CSV Files."""

    def fetch_data(self) -> Iterator[List[Dict[str, Any]]]:
        file_path = self.config.get('file_path')
        logger.info(f"Reading data from CSV file: {file_path}")
        
        try:
            if not pd:
                raise ImportError("pandas module is not installed.")

            if not os.path.exists(file_path):
                raise FileNotFoundError(f"CSV file not found: {file_path}")
                
            df = pd.read_csv(file_path)
            # Replace NaN with None for JSON compatibility
            df = df.where(pd.notnull(df), None)
            yield df.to_dict('records')
            
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
            
            if not pd:
                 return [] # Or raise error, but get_schema usually returns empty list on failure

            df = pd.read_csv(file_path, nrows=0)  # Read only headers
            return sorted(df.columns.tolist())
            
        except Exception as e:
            logger.error(f"Failed to read CSV schema: {e}")
            return []

    def get_categories(self) -> List[Dict[str, Any]]:
        """Get list of available object categories/types from the source. Not applicable for CSV files."""
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
            records_created=0,
            records_updated=0,
            user_id=1  # System user or admin
        )
        self.db.add(self.log)
        self.db.commit()
        
        # Initialize audit log to track detailed changes
        self.audit_log = []

    def run_import(self):
        """Execute the import process."""
        try:
            connector = self._get_connector()
            if not connector:
                raise ValueError(f"Unknown source type: {self.source.source_type}")

            # Stream data in batches
            self.log.records_processed = 0
            
            # Prepare log file path early to enable incremental writing
            log_dir = os.path.join(os.getcwd(), "logs")
            os.makedirs(log_dir, exist_ok=True)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"import_{self.source.id}_{timestamp}.json"
            filepath = os.path.join(log_dir, filename)
            
            # Raw log file
            raw_filename = f"raw_import_{self.source.id}_{timestamp}.json"
            raw_filepath = os.path.join(log_dir, raw_filename)
            
            raw_data_generator = connector.fetch_data()
            errors = []
            all_raw_records = []
            
            processed_cis: List[Tuple[ConfigurationItem, Dict[str, Any]]] = []

            for batch in raw_data_generator:
                all_raw_records.extend(batch)
                batch_count = 0
                for raw_record in batch:
                    try:
                        self.log.records_processed += 1
                        batch_count += 1
                        
                        # Map external data to CMDB format
                        mapped_record = self.field_mapper.map_data(raw_record)
                        ci = self._process_record(mapped_record, raw_record)
                        if ci:
                            processed_cis.append((ci, raw_record))
                    except Exception as e:
                        logger.error(f"Failed to process record: {e}")
                        self.db.rollback()  # Reset session state after failure
                        self.log.records_failed += 1
                        errors.append({
                            "record": str(raw_record),
                            "error": str(e)
                        })
                
                # Commit progress and write logs after every batch
                try:
                    self.db.commit()
                    # Refresh log object to prevent stale data
                    self.db.refresh(self.log)
                    
                    # Incremental Log Write: Overwrite file with current state
                    with open(filepath, 'w') as f:
                        json.dump(self.audit_log, f, indent=2, default=str)
                        
                    # Write Raw Data Log (Incremental verify)
                    with open(raw_filepath, 'w') as f:
                        json.dump(all_raw_records, f, indent=2, default=str)
                        
                    # Update details in DB with file path
                    summary_data = {
                        "log_file": filepath,
                        "raw_file": raw_filepath,
                        "summary": f"In Progress: Processed {self.log.records_processed}...",
                        "errors": errors
                    }
                    self.log.details = json.dumps(summary_data)
                    self.db.commit() # Commit the detail update
                    
                except Exception as e:
                    logger.error(f"Failed to commit batch progress or write logs: {e}")
                    self.db.rollback()
            
            # Second Pass: Process Relationships
            # Now that all CIs are created/updated, we can safely link them.
            if self.config.get('relationship_mapping'):
                logger.info("Starting relationship processing pass...")
                for ci, raw_rec in processed_cis:
                    try:
                         # Refresh CI to ensure attached to session (though should be if session mostly alive)
                         # If session was cleared or rolled back, we might need to re-query, but let's try direct.
                         self._process_relationships(ci, raw_rec)
                    except Exception as e:
                         # Don't fail the whole import for a relationship error, just log it
                         logger.error(f"Relationship processing failed for {ci.name}: {e}")
                         # Maybe add to errors list or a separate relationship errors list?
                self.db.commit()


            # Final Write audit log to file (to ensure completion)
            try:
                with open(filepath, 'w') as f:
                    json.dump(self.audit_log, f, indent=2, default=str)
                
                # Update log details with summary and file path
                summary_data = {
                    "log_file": filepath,
                    "raw_file": raw_filepath,
                    "summary": f"Processed {len(self.audit_log)} changes ({self.log.records_success} success (Created: {self.log.records_created}, Updated: {self.log.records_updated}), {self.log.records_failed} failed).",
                    "errors": errors
                }
                self.log.details = json.dumps(summary_data)
                
            except Exception as e:
                logger.error(f"Failed to write audit log: {e}")
                # Fallback: at least save errors in details
                if errors:
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
        # Inject last_run into config for incremental imports
        if self.source.last_run:
            self.config['last_run'] = self.source.last_run.isoformat()

        if self.source.source_type == "sharepoint":
            return SharePointConnector(self.config)
        elif self.source.source_type == "idoit":
            return IDoitConnector(self.config)
        elif self.source.source_type == "oracle":
            return OracleConnector(self.config)
        elif self.source.source_type == "csv":
            return CSVConnector(self.config)
        elif self.source.source_type == "vcenter":
            return VCenterConnector(self.config)
        elif self.source.source_type == "wsus":
            return WSUSConnector(self.config)
        elif self.source.source_type == "baramundi":
            return BaramundiConnector(self.config)
        return None

    def _process_record(self, mapped_record: Dict[str, Any], raw_record: Dict[str, Any]) -> Optional[ConfigurationItem]:
        """Process a single mapped record and merge with DB. Returns the CI if successful."""
        # Get the reconciliation key value
        match_value = self.recon_config.get_match_value(mapped_record)
        if not match_value:
            logger.warning(f"No reconciliation key found in record: {mapped_record}")
            self.log.records_failed += 1
            return None

        # Try to find existing CI by External ID + Source (Stable ID)
        # This is more robust than Name matching, especially for renamed items
        external_id = raw_record.get('id') or raw_record.get('ID') or raw_record.get('Id')
        ci = None
        
        if external_id:
             ci = self.db.query(ConfigurationItem).filter(
                ConfigurationItem.external_id == str(external_id),
                ConfigurationItem.import_source_id == self.source.id
            ).first()

        # Fallback to Key Field matching if not found by External ID
        if not ci:
            # Find existing CI using reconciliation key
            key_field = self.recon_config.key_field
            
            if self.recon_config.match_strategy == 'case_insensitive':
                ci = self.db.query(ConfigurationItem).filter(
                    getattr(ConfigurationItem, key_field).ilike(match_value)
                ).first()
            else:
                ci = self.db.query(ConfigurationItem).filter(
                    getattr(ConfigurationItem, key_field) == match_value
                ).first()

        if ci:
            # Update existing CI
            was_updated = self._update_ci(ci, mapped_record, raw_record)
            self.log.records_success += 1
            if was_updated:
                self.log.records_updated += 1
            return ci
        elif self.recon_config.update_mode == 'upsert':
            # Create new CI only if in upsert mode
            new_ci = self._create_ci(mapped_record, raw_record)
            self.log.records_success += 1
            self.log.records_created += 1
            return new_ci
        else:
            # Skip creation in 'update_only' mode
            logger.info(f"Skipping new CI creation (Update Only mode): {match_value}")
            self.log.records_success += 1
            return None

    def _create_ci(self, mapped_record: Dict[str, Any], raw_record: Dict[str, Any]) -> ConfigurationItem:
        """Create a new CI from mapped data."""
        # Initialize raw_data as a dict with the current source type
        initial_raw_data = {
            self.source.source_type: raw_record
        }

        ci_data = {
            'name': mapped_record.get('name'),
            'ci_type': self._parse_ci_type(mapped_record.get('ci_type')),
            'status': CIStatus.ACTIVE,
            'description': mapped_record.get('description'),
            'department': mapped_record.get('department') or mapped_record.get('owner'),
            'location': mapped_record.get('location'),
            'environment': mapped_record.get('environment'),
            'cost_center': mapped_record.get('cost_center'),
            'service_provider': mapped_record.get('service_provider') or mapped_record.get('Service_x0020_Provider'),
            'contact': mapped_record.get('contact') or mapped_record.get('Kontakt') or mapped_record.get('KontaktStringId'),
            'technical_details': mapped_record.get('technical_details'),
            'os_db_system': mapped_record.get('os_db_system') or mapped_record.get('operating_system'),
            'domain': mapped_record.get('domain'),
            'external_id': raw_record.get('id') or raw_record.get('ID'),
            'import_source_id': self.source.id,
            'last_sync': datetime.utcnow(),
            'raw_data': json.dumps(initial_raw_data, default=str)
        }
        
        new_ci = ConfigurationItem(**ci_data)
        self.db.add(new_ci)
        self.db.commit()
        logger.info(f"Created new CI: {new_ci.name}")
        
        self.audit_log.append({
            "action": "created",
            "ci_id": new_ci.id,
            "ci_name": new_ci.name,
            "data": ci_data,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return new_ci

    def _process_relationships(self, source_ci: ConfigurationItem, raw_record: Dict[str, Any]):
        """
        Process configured relationship mappings.
        Expected config format:
        {
            "relationships": [
                {
                    "source_column": "ParentServer",
                    "relationship_type": "runs_on",
                    "separator": ",",
                    "direction": "outbound" # source -> target
                }
            ]
        }
        """
        relationship_mappings = self.config.get('relationship_mapping', [])
        if not relationship_mappings:
            return

        from app.db.models import Relationship
        
        for mapping in relationship_mappings:
            col_name = mapping.get('source_column')
            rel_type = mapping.get('relationship_type')
            separator = mapping.get('separator', ',')
            # direction = mapping.get('direction', 'outbound') # Not fully implemented yet, assuming outbound
            
            raw_value = raw_record.get(col_name)
            if not raw_value:
                continue
                
            # Parse values
            target_names = [n.strip() for n in str(raw_value).split(separator) if n.strip()]
            
            for target_name in target_names:
                # Find Target CI
                # Try exact match first
                target_ci = self.db.query(ConfigurationItem).filter(
                    ConfigurationItem.name == target_name,
                    ConfigurationItem.deleted_at.is_(None)
                ).first()
                
                if not target_ci:
                    logger.warning(f"Relationship Import: Target CI '{target_name}' not found for source '{source_ci.name}'")
                    continue
                
                # Check if relationship already exists
                existing_rel = self.db.query(Relationship).filter(
                    Relationship.source_ci_id == source_ci.id,
                    Relationship.target_ci_id == target_ci.id,
                    Relationship.relationship_type == rel_type
                ).first()
                
                if not existing_rel:
                    new_rel = Relationship(
                        source_ci_id=source_ci.id,
                        target_ci_id=target_ci.id,
                        relationship_type=rel_type,
                        description=f"Imported from column {col_name}"
                    )
                    self.db.add(new_rel)
                    self.db.commit()
                    logger.info(f"Created Relationship: {source_ci.name} -> {target_name} ({rel_type})")
                    
                    self.audit_log.append({
                        "action": "relationship_created",
                        "source": source_ci.name,
                        "target": target_name,
                        "type": rel_type,
                        "timestamp": datetime.utcnow().isoformat()
                    })

    def _update_ci(self, ci: ConfigurationItem, mapped_record: Dict[str, Any], raw_record: Dict[str, Any]) -> bool:
        """Update existing CI based on conflict resolution rules. Returns True if changes were made."""
        # ... (mostly same logic)
        # Track changes for audit log
        changes = {}
        updated_fields = []
        
        # Pre-process Enum fields to ensure valid values (Postgres strict Enums)
        if 'ci_type' in mapped_record:
             mapped_record['ci_type'] = self._parse_ci_type(mapped_record['ci_type'])
        if 'status' in mapped_record:
             mapped_record['status'] = self._parse_ci_status(mapped_record['status'])

        for field_name, value in mapped_record.items():
            if hasattr(ci, field_name):
                current_value = getattr(ci, field_name)
                
                # Normalize for comparison
                str_old = str(current_value) if current_value is not None else ""
                str_new = str(value) if value is not None else ""
                
                # Only update if value actually changed
                if str_old != str_new:
                        setattr(ci, field_name, value)
                        updated_fields.append(field_name)
                        changes[field_name] = {
                            "old": str_old,
                            "new": str_new
                        }
        
        # Always update sync metadata
        ci.last_sync = datetime.utcnow()
        ci.deleted_at = None  # Resurrect if deleted
        if raw_record.get('id') or raw_record.get('ID'):
            ci.external_id = raw_record.get('id') or raw_record.get('ID')
        
        # Parse existing raw_data to merge instead of overwrite
        current_raw = {}
        if ci.raw_data:
            if isinstance(ci.raw_data, dict):
                current_raw = ci.raw_data
            elif isinstance(ci.raw_data, str):
                try:
                    current_raw = json.loads(ci.raw_data)
                    # If loaded JSON is not a dict (e.g. list), reset it
                    if not isinstance(current_raw, dict):
                         current_raw = {}
                except Exception:
                    current_raw = {}
        
        # Update only this source's section
        current_raw[self.source.source_type] = raw_record
        ci.raw_data = json.dumps(current_raw, default=str)
        
        self.db.commit()
        
        if changes:
            logger.info(f"Updated CI: {ci.name} (fields: {', '.join(updated_fields)})")
            self.audit_log.append({
                "action": "updated",
                "ci_id": ci.id,
                "ci_name": ci.name,
                "changes": changes,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            return True
        else:
            # Debug: Log that we saw it but changed nothing
            self.audit_log.append({
                "action": "unchanged",
                "ci_id": ci.id,
                "ci_name": ci.name,
                "timestamp": datetime.utcnow().isoformat()
            })
            return False # Removed _process_relationships call from false branch too

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

    def _parse_ci_status(self, status_str: Optional[str]) -> CIStatus:
        """Parse CI status from string."""
        if not status_str:
            return CIStatus.ACTIVE
            
        status_map = {
            'active': CIStatus.ACTIVE,
            'aktiv': CIStatus.ACTIVE,
            'live': CIStatus.ACTIVE,
            'inactive': CIStatus.INACTIVE,
            'inaktiv': CIStatus.INACTIVE,
            'retired': CIStatus.RETIRED,
            'abgeschaltet': CIStatus.RETIRED,
            'planned': CIStatus.PLANNED,
            'geplant': CIStatus.PLANNED,
            'maintenance': CIStatus.MAINTENANCE,
            'wartung': CIStatus.MAINTENANCE
        }
        
        return status_map.get(status_str.lower(), CIStatus.ACTIVE)

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
    elif source_type == "vcenter":
        return VCenterConnector(config)
    return None
