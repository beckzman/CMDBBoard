import sys
import os
import shutil
from fastapi.testclient import TestClient

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.main import app

def verify_upload():
    client = TestClient(app)
    
    # Create a dummy CSV content
    file_content = b"name,status\nTestUpload,Active"
    
    # Mock authentication override if needed, but for now let's try 
    # The endpoint requires Admin role. 
    # For simplicity in this script, we might hit 401 if we don't mock auth.
    # Let's bypass auth dependency for the test or mock it.
    
    from app.core.auth import get_current_user
    from app.db.models import User, UserRole
    
    # Mock Admin User
    mock_admin = User(id=1, username="admin", role=UserRole.ADMIN, is_active=True)
    
    # Dependency override
    app.dependency_overrides[get_current_user] = lambda: mock_admin
    
    print("Testing upload endpoint...")
    response = client.post(
        "/api/import/upload-source-file",
        files={"file": ("test_upload.csv", file_content, "text/csv")}
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print(f"Response: {data}")
        
        file_path = data.get("file_path")
        if file_path and os.path.exists(file_path):
            print("SUCCESS: File uploaded and exists on disk.")
            # Cleanup
            os.remove(file_path)
            print("Cleanup: Deleted test file.")
        else:
            print("FAILURE: File path returned but file not found.")
    else:
        print(f"FAILURE: Unexpected status code. Response: {response.text}")

if __name__ == "__main__":
    verify_upload()
