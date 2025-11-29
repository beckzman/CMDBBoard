"""
CSV import service for bulk data import.
"""
import pandas as pd
from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import ConfigurationItem, ImportLog, CIType, CIStatus
from app.schemas import CICreate
import json


class CSVImporter:
    """Service for importing configuration items from CSV files."""
    
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
    
    def import_from_file(self, file_path: str) -> ImportLog:
        """Import CIs from a CSV file."""
        # Create import log
        import_log = ImportLog(
            import_type="csv",
            source=file_path,
            status="pending",
            user_id=self.user_id
        )
        self.db.add(import_log)
        self.db.commit()
        
        try:
            # Read CSV file
            df = pd.read_csv(file_path)
            
            # Validate required columns
            required_columns = ['name', 'ci_type']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
            
            # Process each row
            records_processed = 0
            records_success = 0
            records_failed = 0
            errors = []
            
            for index, row in df.iterrows():
                records_processed += 1
                
                try:
                    # Prepare CI data
                    ci_data = self._prepare_ci_data(row)
                    
                    # Check if CI already exists (by name and type)
                    existing_ci = self.db.query(ConfigurationItem).filter(
                        ConfigurationItem.name == ci_data['name'],
                        ConfigurationItem.ci_type == ci_data['ci_type'],
                        ConfigurationItem.deleted_at.is_(None)
                    ).first()
                    
                    if existing_ci:
                        # Update existing CI
                        for key, value in ci_data.items():
                            if value is not None:
                                setattr(existing_ci, key, value)
                    else:
                        # Create new CI
                        new_ci = ConfigurationItem(**ci_data)
                        self.db.add(new_ci)
                    
                    records_success += 1
                    
                except Exception as e:
                    records_failed += 1
                    errors.append(f"Row {index + 2}: {str(e)}")
            
            # Commit all changes
            self.db.commit()
            
            # Update import log
            import_log.status = "success" if records_failed == 0 else "partial"
            import_log.records_processed = records_processed
            import_log.records_success = records_success
            import_log.records_failed = records_failed
            import_log.error_message = "\n".join(errors) if errors else None
            import_log.completed_at = datetime.utcnow()
            
        except Exception as e:
            import_log.status = "failed"
            import_log.error_message = str(e)
            import_log.completed_at = datetime.utcnow()
        
        self.db.commit()
        return import_log
    
    def _prepare_ci_data(self, row: pd.Series) -> Dict[str, Any]:
        """Prepare CI data from CSV row."""
        # Map CI type string to enum
        ci_type_map = {
            'server': CIType.SERVER,
            'application': CIType.APPLICATION,
            'network_device': CIType.NETWORK_DEVICE,
            'database': CIType.DATABASE,
            'workstation': CIType.WORKSTATION,
            'storage': CIType.STORAGE,
            'other': CIType.OTHER
        }
        
        # Map status string to enum
        status_map = {
            'active': CIStatus.ACTIVE,
            'inactive': CIStatus.INACTIVE,
            'retired': CIStatus.RETIRED,
            'planned': CIStatus.PLANNED,
            'maintenance': CIStatus.MAINTENANCE
        }
        
        ci_type_str = str(row.get('ci_type', '')).lower()
        status_str = str(row.get('status', 'active')).lower()
        
        ci_data = {
            'name': str(row['name']),
            'ci_type': ci_type_map.get(ci_type_str, CIType.OTHER),
            'status': status_map.get(status_str, CIStatus.ACTIVE),
            'description': str(row['description']) if pd.notna(row.get('description')) else None,
            'owner': str(row['owner']) if pd.notna(row.get('owner')) else None,
            'location': str(row['location']) if pd.notna(row.get('location')) else None,
            'environment': str(row['environment']) if pd.notna(row.get('environment')) else None,
            'cost_center': str(row['cost_center']) if pd.notna(row.get('cost_center')) else None,
        }
        
        # Handle technical details (could be JSON string or individual columns)
        if 'technical_details' in row and pd.notna(row['technical_details']):
            ci_data['technical_details'] = str(row['technical_details'])
        
        return ci_data
