
import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from app.core.import_engine import BaramundiConnector

class TestBaramundiConnector(unittest.TestCase):
    def setUp(self):
        self.config = {
            "api_url": "https://baramundi.test/bConnect/v1",
            "username": "testuser",
            "password": "testpassword",
            "verify_ssl": False
        }
        self.connector = BaramundiConnector(self.config)

    @patch('app.core.import_engine.requests.get')
    def test_fetch_data_success(self, mock_get):
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "id": "123",
                "name": "TEST-PC-01",
                "os": "Windows 10",
                "ip": "192.168.1.100"
            },
            {
                "id": "124",
                "name": "TEST-PC-02",
                "os": "Windows 11",
                "ip": "192.168.1.101"
            }
        ]
        mock_get.return_value = mock_response

        # Execute
        data_generator = self.connector.fetch_data()
        results = list(data_generator)

        # Verify
        self.assertEqual(len(results), 1) # One batch
        self.assertEqual(len(results[0]), 2) # Two items
        self.assertEqual(results[0][0]['name'], "TEST-PC-01")
        
        # Verify URL construction
        mock_get.assert_called_with(
            "https://baramundi.test/bConnect/v1/endpoints",
            auth=("testuser", "testpassword"),
            verify=False,
            headers={'Accept': 'application/json'},
            timeout=30
        )
        print("Test Fetch Data: SUCCESS")

    @patch('app.core.import_engine.requests.get')
    def test_test_connection_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        result = self.connector.test_connection()
        self.assertTrue(result)
        print("Test Connection: SUCCESS")

    @patch('app.core.import_engine.requests.get')
    def test_get_schema(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{"field1": "val", "field2": "val"}]
        mock_get.return_value = mock_response

        schema = self.connector.get_schema()
        self.assertEqual(schema, ["field1", "field2"])
        print("Test Get Schema: SUCCESS")

if __name__ == '__main__':
    unittest.main()
