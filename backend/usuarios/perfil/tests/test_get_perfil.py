from datetime import time
from unittest.mock import patch

import pytest
from django.urls import reverse

from .conftest import SIGNED_FOTO_URL


@pytest.mark.django_db
def test_get_perfil_requires_auth(api_client):
    response = api_client.get(reverse("perfil:detalle"))

    assert response.status_code == 401


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
        return_value=SIGNED_FOTO_URL,
    ) as build_url:
        response = auth_client.get(reverse("perfil:detalle"))

    assert response.status_code == 200
    assert response.data["foto_url"] == SIGNED_FOTO_URL
    assert response.data["email_pendiente"] == "nuevo@example.com"
    assert response.data["hora_aviso"] == "21:30"
    build_url.assert_called_once_with("perfiles/mock")
