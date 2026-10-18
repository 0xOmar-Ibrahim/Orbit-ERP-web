import os

from authlib.integrations.django_client import OAuth

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.environ.get("SSO_CLIENT_ID"),
    client_secret=os.environ.get("SSO_CLIENT_SECRET"),
    server_metadata_url=(
        "https://accounts.google.com/.well-known/openid-configuration"
    ),
    client_kwargs={
        "scope": "openid profile email",
        "prompt": "select_account",
    },
)