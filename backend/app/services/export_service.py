"""
Export service for generating CI exports in various formats.
"""
import pandas as pd
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import ConfigurationItem, CIType, CIStatus
from datetime import datetime
import json


class ExportService:
    """Service for exporting configuration items."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def export_to_csv(
        self,
        output_path: str,
        ci_type: Optional[CIType] = None,
        status: Optional[CIStatus] = None
    ) -> str:
        """Export CIs to CSV file."""
        cis = self._get_cis(ci_type, status)
        df = self._cis_to_dataframe(cis)
        df.to_csv(output_path, index=False)
        return output_path
    
    def export_to_excel(
        self,
        output_path: str,
        ci_type: Optional[CIType] = None,
        status: Optional[CIStatus] = None
    ) -> str:
        """Export CIs to Excel file with multiple sheets."""
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # All CIs
            cis = self._get_cis(ci_type, status)
            df_all = self._cis_to_dataframe(cis)
            df_all.to_excel(writer, sheet_name='All CIs', index=False)
            
            # CIs by type (if no specific type filter)
            if not ci_type:
                for ci_type_enum in CIType:
                    type_cis = self._get_cis(ci_type_enum, status)
                    if type_cis:
                        df_type = self._cis_to_dataframe(type_cis)
                        sheet_name = ci_type_enum.value.replace('_', ' ').title()[:31]  # Excel limit
                        df_type.to_excel(writer, sheet_name=sheet_name, index=False)
        
        return output_path
    
    def export_to_json(
        self,
        output_path: str,
        ci_type: Optional[CIType] = None,
        status: Optional[CIStatus] = None
    ) -> str:
        """Export CIs to JSON file."""
        cis = self._get_cis(ci_type, status)
        
        data = []
        for ci in cis:
            ci_dict = {
                'id': ci.id,
                'name': ci.name,
                'ci_type': ci.ci_type.value,
                'status': ci.status.value,
                'description': ci.description,
                'Abteilung': ci.department,
                'location': ci.location,
                'environment': ci.environment,
                'environment': ci.environment,
                'cost_center': ci.cost_center,
                'service_provider': ci.service_provider,
                'contact': ci.contact,
                'technical_details': ci.technical_details,
                'external_id': ci.external_id,
                'created_at': ci.created_at.isoformat() if ci.created_at else None,
                'updated_at': ci.updated_at.isoformat() if ci.updated_at else None
            }
            data.append(ci_dict)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return output_path
    
    def _get_cis(
        self,
        ci_type: Optional[CIType] = None,
        status: Optional[CIStatus] = None
    ) -> List[ConfigurationItem]:
        """Get CIs with optional filters."""
        query = self.db.query(ConfigurationItem).filter(
            ConfigurationItem.deleted_at.is_(None)
        )
        
        if ci_type:
            query = query.filter(ConfigurationItem.ci_type == ci_type)
        
        if status:
            query = query.filter(ConfigurationItem.status == status)
        
        return query.all()
    
    def _cis_to_dataframe(self, cis: List[ConfigurationItem]) -> pd.DataFrame:
        """Convert CIs to pandas DataFrame."""
        data = []
        for ci in cis:
            data.append({
                'id': ci.id,
                'name': ci.name,
                'ci_type': ci.ci_type.value,
                'status': ci.status.value,
                'description': ci.description,
                'Abteilung': ci.department,
                'location': ci.location,
                'environment': ci.environment,
                'environment': ci.environment,
                'cost_center': ci.cost_center,
                'service_provider': ci.service_provider,
                'contact': ci.contact,
                'technical_details': ci.technical_details,
                'external_id': ci.external_id,
                'created_at': ci.created_at,
                'updated_at': ci.updated_at
            })
        
        return pd.DataFrame(data)
