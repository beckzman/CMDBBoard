import requests

# Constants
API_URL = "http://localhost:8000/api"
USERNAME = "admin"
PASSWORD = "adminpassword"

def get_token():
    try:
        response = requests.post(f"{API_URL}/auth/login", data={"username": USERNAME, "password": PASSWORD})
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        print(f"Failed to login: {e}")
        return None

def verify_password_reset():
    token = get_token()
    if not token:
        print("Skipping verification due to login failure.")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # Get users
    res = requests.get(f"{API_URL}/users", headers=headers)
    users = res.json()
    
    # Find a non-admin user
    test_user = next((u for u in users if u['username'] != 'admin'), None)
    
    if not test_user:
        print("No test user found. Skipping password reset test.")
        return
    
    print(f"\n1. Resetting password for user '{test_user['username']}'")
    new_pass = "newpassword123"
    res_reset = requests.post(
        f"{API_URL}/users/{test_user['id']}/reset-password",
        params={"new_password": new_pass},
        headers=headers
    )
    
    if res_reset.status_code == 200:
        print("PASS: Password reset successful")
        
        # Try logging in with new password
        print(f"\n2. Testing login with new password")
        login_res = requests.post(
            f"{API_URL}/auth/login",
            data={"username": test_user['username'], "password": new_pass}
        )
        
        if login_res.status_code == 200:
            print("PASS: Login successful with new password")
        else:
            print(f"FAIL: Login failed with new password. {login_res.status_code}")
    else:
        print(f"FAIL: Password reset failed. {res_reset.status_code} {res_reset.text}")

    print("\n✅ Password reset verification complete")

if __name__ == "__main__":
    verify_password_reset()
