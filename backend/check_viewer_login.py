import requests
import sys

# Constants
API_URL = "http://localhost:8000/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "adminpassword"

def get_admin_token():
    try:
        response = requests.post(f"{API_URL}/auth/login", data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        print(f"Failed to login as admin: {e}")
        return None

def check_viewer_user():
    # First, get admin token to check if user exists
    token = get_admin_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n1. Checking if 'viewer' user exists...")
    res = requests.get(f"{API_URL}/users", headers=headers)
    users = res.json()
    
    viewer_user = next((u for u in users if u['username'] == 'viewer'), None)
    
    if viewer_user:
        print(f"✓ User 'viewer' found:")
        print(f"  - ID: {viewer_user['id']}")
        print(f"  - Email: {viewer_user['email']}")
        print(f"  - Role: {viewer_user['role']}")
        print(f"  - Active: {viewer_user['is_active']}")
    else:
        print("✗ User 'viewer' not found in database")
        return
    
    # Try to login as viewer
    print("\n2. Attempting to login as 'viewer' with password 'viewerpassword'...")
    login_res = requests.post(
        f"{API_URL}/auth/login",
        data={"username": "viewer", "password": "viewerpassword"}
    )
    
    if login_res.status_code == 200:
        print("✓ Login successful!")
        token_data = login_res.json()
        print(f"  - Token received: {token_data['access_token'][:50]}...")
    else:
        print(f"✗ Login failed!")
        print(f"  - Status code: {login_res.status_code}")
        print(f"  - Response: {login_res.text}")
        
        # Check if user is active
        if not viewer_user['is_active']:
            print("\n⚠️  User is INACTIVE - this may be the issue")

if __name__ == "__main__":
    check_viewer_user()
