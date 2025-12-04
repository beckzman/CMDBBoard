"""
Field mapping utilities for transforming external data to CMDB format.
"""
from typing import Dict, Any, Optional
import json


class FieldMapper:
    """Maps external source fields to CMDB fields based on configuration."""
    
    def __init__(self, field_mapping: Dict[str, str]):
        """
        Initialize the field mapper.
        
        Args:
            field_mapping: Dict mapping CMDB field names to source field paths
                          e.g., {"name": "Title", "owner": "Owner.Email"}
        """
        self.field_mapping = field_mapping
    
    def map_data(self, source_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform source data to CMDB format using field mappings.
        
        Args:
            source_data: Raw data from external source
            
        Returns:
            Dict with CMDB field names and transformed values
        """
        mapped_data = {}
        
        for cmdb_field, source_path in self.field_mapping.items():
            value = self._get_nested_value(source_data, source_path)
            if value is not None:
                mapped_data[cmdb_field] = self._transform_value(value)
        
        return mapped_data
    
    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Optional[Any]:
        """
        Get value from nested dictionary using dot notation.
        
        Args:
            data: Source data dictionary
            path: Dot-separated path (e.g., "Owner.Email")
            
        Returns:
            Value at the path, or None if not found
        """
        keys = path.split('.')
        current = data
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        
        return current
    
    def _transform_value(self, value: Any) -> Any:
        """
        Apply basic transformations to values.
        
        Args:
            value: Raw value from source
            
        Returns:
            Transformed value
        """
        if isinstance(value, str):
            # Trim whitespace
            value = value.strip()
            
        return value


class ReconciliationConfig:
    """Configuration for CI reconciliation and conflict resolution."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize reconciliation configuration.
        
        Args:
            config: Reconciliation config dict with key_field, match_strategy, etc.
        """
        self.key_field = config.get('key_field', 'name')
        self.match_strategy = config.get('match_strategy', 'exact')
        self.conflict_resolution = config.get('conflict_resolution', {})
    
    def should_update_field(self, field_name: str) -> bool:
        """
        Determine if a field should be updated based on conflict resolution rules.
        
        Args:
            field_name: Name of the CMDB field
            
        Returns:
            True if field should be updated with source data
        """
        resolution = self.conflict_resolution.get(field_name, 'source')
        return resolution == 'source'
    
    def get_match_value(self, data: Dict[str, Any]) -> Optional[str]:
        """
        Get the value to use for matching existing CIs.
        
        Args:
            data: Mapped CMDB data
            
        Returns:
            Value of the key field for matching
        """
        value = data.get(self.key_field)
        
        if value and self.match_strategy == 'case_insensitive':
            return str(value).lower()
        
        return value


def parse_import_config(config_json: str) -> Dict[str, Any]:
    """
    Parse and validate import source configuration.
    
    Args:
        config_json: JSON string with import configuration
        
    Returns:
        Parsed configuration dictionary
    """
    try:
        config = json.loads(config_json) if isinstance(config_json, str) else config_json
        
        # Ensure required sections exist
        if 'field_mapping' not in config:
            config['field_mapping'] = {}
        
        if 'reconciliation' not in config:
            config['reconciliation'] = {
                'key_field': 'name',
                'match_strategy': 'exact',
                'conflict_resolution': {}
            }
        
        return config
    except json.JSONDecodeError:
        return {
            'field_mapping': {},
            'reconciliation': {
                'key_field': 'name',
                'match_strategy': 'exact',
                'conflict_resolution': {}
            }
        }
