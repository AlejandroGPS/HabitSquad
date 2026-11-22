import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from usuarios.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="alertas@example.com",
        password="S0mething!Secure-497",
        nickname="AlertasUser",
    )


@pytest.fixture
def auth_client(api_client, user):
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


def test_vapid_public_key_stub_returns_501(api_client):
    response = api_client.get(reverse("alertas:vapid-public-key"))

    assert response.status_code == 501


@pytest.mark.django_db
def test_suscripcion_requires_auth(api_client):
    response = api_client.post(reverse("alertas:suscripcion"), {}, format="json")

    assert response.status_code == 401


@pytest.mark.django_db
def test_suscripcion_stub_returns_501_when_authenticated(auth_client):
    response = auth_client.post(
        reverse("alertas:suscripcion"),
        {
            "endpoint": "https://fcm.googleapis.com/fcm/send/ejemplo",
            "keys": {"p256dh": "abc", "auth": "def"},
        },
        format="json",
    )

    assert response.status_code == 501


@pytest.mark.django_db
def test_eliminar_suscripcion_stub_returns_501_when_authenticated(auth_client):
    response = auth_client.delete(
        reverse("alertas:suscripcion"),
        {"endpoint": "https://fcm.googleapis.com/fcm/send/ejemplo"},
        format="json",
    )

    assert response.status_code == 501
