from datetime import time
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import CustomUser

SIGNED_URL = "https://res.cloudinary.com/demo/image/private/s--x--/v1/perfiles/mock.jpg"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="perfil@example.com",
        password="S0mething!Secure-497",
        nickname="PerfilUser",
    )


@pytest.fixture
def auth_client(api_client, user):
    token = RefreshToken.for_user(user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
def test_get_perfil_returns_public_fields_with_defaults(auth_client, user):
    response = auth_client.get(reverse("perfil:detalle"))

    assert response.status_code == 200
    assert response.data == {
        "id": user.pk,
        "email": "perfil@example.com",
        "nickname": "PerfilUser",
        "foto_url": None,
        "email_pendiente": None,
        "hora_aviso": "20:00",
    }


@pytest.mark.django_db
def test_get_perfil_includes_signed_foto_url_and_pending_email(auth_client, user):
    user.foto_perfil_public_id = "perfiles/mock"
    user.email_pendiente = "nuevo@example.com"
    user.hora_aviso = time(21, 30)
    user.save(update_fields=["foto_perfil_public_id", "email_pendiente", "hora_aviso"])

    with patch(
        "usuarios.perfil.services.profile.build_signed_foto_url",
        return_value=SIGNED_URL,
    ) as build_url:
        response = auth_client.get(reverse("perfil:detalle"))

    assert response.status_code == 200
    assert response.data["foto_url"] == SIGNED_URL
    assert response.data["email_pendiente"] == "nuevo@example.com"
    assert response.data["hora_aviso"] == "21:30"
    build_url.assert_called_once_with("perfiles/mock")
