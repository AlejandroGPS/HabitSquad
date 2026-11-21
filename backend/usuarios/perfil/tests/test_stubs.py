import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client):
    user = CustomUser.objects.create_user(
        email="perfil@example.com",
        password="S0mething!Secure-497",
        nickname="PerfilUser",
    )
    token = RefreshToken.for_user(user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("method", "url_name"),
    [
        ("get", "perfil:detalle"),
        ("patch", "perfil:detalle"),
        ("post", "perfil:foto"),
        ("post", "perfil:email"),
        ("post", "perfil:password"),
    ],
)
def test_protected_perfil_stubs_return_501(auth_client, method, url_name):
    response = getattr(auth_client, method)(reverse(url_name), {}, format="json")

    assert response.status_code == 501
    assert "pendiente" in response.data["detail"].lower()


@pytest.mark.django_db
def test_email_confirm_stub_returns_501_without_auth(api_client):
    response = api_client.post(
        reverse("perfil:email-confirm"),
        {"uid": "MQ", "token": "token"},
        format="json",
    )

    assert response.status_code == 501
    assert "pendiente" in response.data["detail"].lower()


@pytest.mark.django_db
def test_protected_perfil_endpoint_requires_auth(api_client):
    response = api_client.get(reverse("perfil:detalle"))

    assert response.status_code == 401
