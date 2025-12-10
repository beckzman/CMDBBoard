import requests

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

def test_create_user():
    token = get_admin_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n1. Attempting to create user 'testuser'...")
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "testpassword123"
    }
    
    res = requests.post(f"{API_URL}/auth/register", json=user_data, headers=headers)
    
    print(f"Status code: {res.status_code}")
    print(f"Response: {res.text}")
    
    if res.status_code == 201:
        print("✓ User created successfully")
        user = res.json()
        print(f"  - ID: {user['id']}")
        print(f"  - Username: {user['username']}")
        print(f"  - Role: {user['role']}")
        
        # Try to login
        print("\n2. Testing login with new user...")
        login_res = requests.post(
            f"{API_URL}/auth/login",
            data={"username": "testuser", "password": "testpassword123"}
        )
        
        if login_res.status_code == 200:
            print("✓ Login successful!")
        else:
            print(f"✗ Login failed: {login_res.status_code} - {login_res.text}")
    else:
        print(f"✗ User creation failed")

if __name__ == "__main__":
    test_create_user()
