import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import CustomUser

CURRENT_PASSWORD = "S0mething!Secure-497"
SIGNED_FOTO_URL = (
    "https://res.cloudinary.com/demo/image/private/s--x--/v1/perfiles/mock.jpg"
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="perfil@example.com",
        password=CURRENT_PASSWORD,
        nickname="PerfilUser",
    )


@pytest.fixture
def auth_client(api_client, user):
    token = RefreshToken.for_user(user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client
