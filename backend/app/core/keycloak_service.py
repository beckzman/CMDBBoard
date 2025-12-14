from keycloak import KeycloakOpenID
from app.core.config import settings

class KeycloakService:
    def __init__(self):
        self.enabled = bool(settings.KEYCLOAK_URL and settings.KEYCLOAK_REALM and settings.KEYCLOAK_CLIENT_ID) 
        if self.enabled:
            self.keycloak_openid = KeycloakOpenID(
                server_url=settings.KEYCLOAK_URL,
                client_id=settings.KEYCLOAK_CLIENT_ID,
                realm_name=settings.KEYCLOAK_REALM,
                client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
                verify=True
            )

    def get_auth_url(self, redirect_uri: str) -> str:
        """Get the URL to redirect the user to for authentication."""
        if not self.enabled:
            return ""
        return self.keycloak_openid.auth_url(redirect_uri=redirect_uri)

    def get_token(self, code: str, redirect_uri: str):
        """Exchange the authorization code for an access token."""
        if not self.enabled:
            return None
        return self.keycloak_openid.token(code=code, redirect_uri=redirect_uri, grant_type="authorization_code")

    def get_user_info(self, token: str):
        """Get user information using the access token."""
        if not self.enabled:
            return None
        return self.keycloak_openid.userinfo(token)

keycloak_service = KeycloakService()
