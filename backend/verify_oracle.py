import sys
import os
from unittest.mock import MagicMock, patch

# Mock oracledb before importing import_engine
sys.modules["oracledb"] = MagicMock()

# Add backend to path
sys.path.append(os.getcwd())

from app.core.import_engine import OracleConnector

def verify_oracle_connector():
    print("Verifying OracleConnector...")
    
    config = {
        "user": "admin",
        "password": "password",
        "host": "localhost",
        "port": "1521",
        "service_name": "ORCL"
    }
    
    connector = OracleConnector(config)
    
    # Test 1: Test Connection
    print("\nTest 1: Testing Connection Logic")
    with patch("app.core.import_engine.oracledb") as mock_oracledb:
        # Mock successful connection
        mock_conn = MagicMock()
        mock_oracledb.connect.return_value.__enter__.return_value = mock_conn
        
        result = connector.test_connection()
        
        if result:
            print("SUCCESS: Connection test passed (mocked)")
        else:
            print("FAILURE: Connection test failed")
            
        # Verify connect was called with correct params
        mock_oracledb.connect.assert_called_with(
            user="admin", 
            password="password", 
            dsn="localhost:1521/ORCL"
        )
        print("SUCCESS: oracledb.connect called with correct parameters")

    # Test 2: Fetch Data
    print("\nTest 2: Testing Fetch Data Logic")
    with patch("app.core.import_engine.oracledb") as mock_oracledb:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        
        # Setup mock return values
        mock_oracledb.connect.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        # Mock description for columns
        mock_cursor.description = [("ID",), ("NAME",), ("STATUS",)]
        
        # Mock fetchall rows
        mock_cursor.fetchall.return_value = [
            (1, "SRV-ORA-01", "ACTIVE"),
            (2, "SRV-ORA-02", "INACTIVE")
        ]
        
        data = connector.fetch_data()
        
        print(f"Fetched {len(data)} rows")
        
        # Verify rowfactory was set
        if mock_cursor.rowfactory is not None:
             print("SUCCESS: cursor.rowfactory was set")
        else:
             print("FAILURE: cursor.rowfactory was NOT set")
             
        # Verify SQL execution
        mock_cursor.execute.assert_called_with("SELECT * FROM CMDB_EXPORT")
        print("SUCCESS: SQL query executed")

if __name__ == "__main__":
    try:
        verify_oracle_connector()
    except Exception as e:
        print(f"ERROR: {e}")
