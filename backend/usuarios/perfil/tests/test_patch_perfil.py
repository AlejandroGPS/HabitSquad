import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import CustomUser


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
def test_patch_perfil_updates_nickname_and_hora_aviso(auth_client, user):
    response = auth_client.patch(
        reverse("perfil:detalle"),
        {"nickname": "NuevoHero", "hora_aviso": "21:30"},
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert response.data["nickname"] == "NuevoHero"
    assert response.data["hora_aviso"] == "21:30"
    assert user.nickname == "NuevoHero"
    assert user.hora_aviso.strftime("%H:%M") == "21:30"


@pytest.mark.django_db
def test_patch_perfil_rejects_duplicate_nickname_and_keeps_current(auth_client, user):
    CustomUser.objects.create_user(
        email="otro@example.com",
        password="S0mething!Secure-497",
        nickname="HabitHero",
    )

    response = auth_client.patch(
        reverse("perfil:detalle"),
        {"nickname": "habithero"},
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 400
    assert response.data["nickname"] == ["Ya existe una cuenta con este nickname."]
    assert user.nickname == "PerfilUser"


@pytest.mark.django_db
def test_patch_perfil_allows_same_nickname_different_casing(auth_client, user):
    response = auth_client.patch(
        reverse("perfil:detalle"),
        {"nickname": "perfiluser"},
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert user.nickname == "perfiluser"


@pytest.mark.django_db
def test_patch_perfil_rejects_invalid_hora_aviso_and_keeps_current(auth_client, user):
    response = auth_client.patch(
        reverse("perfil:detalle"),
        {"hora_aviso": "25:99"},
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 400
    assert response.data["hora_aviso"] == ["Indica la hora en formato HH:MM."]
    assert user.hora_aviso.strftime("%H:%M") == "20:00"


@pytest.mark.django_db
def test_patch_perfil_rejects_empty_body(auth_client):
    response = auth_client.patch(reverse("perfil:detalle"), {}, format="json")

    assert response.status_code == 400


@pytest.mark.django_db
def test_patch_perfil_rejects_blank_nickname(auth_client, user):
    response = auth_client.patch(
        reverse("perfil:detalle"),
        {"nickname": "   "},
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 400
    assert "nickname" in response.data
    assert user.nickname == "PerfilUser"
