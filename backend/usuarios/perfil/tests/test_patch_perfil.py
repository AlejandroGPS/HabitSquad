import pytest
from django.urls import reverse

from usuarios.models import CustomUser

from .conftest import CURRENT_PASSWORD


@pytest.mark.django_db
def test_patch_perfil_requires_auth(api_client):
    response = api_client.patch(
        reverse("perfil:detalle"),
        {"nickname": "NuevoHero"},
        format="json",
    )

    assert response.status_code == 401


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
def test_patch_perfil_updates_only_hora_aviso(auth_client, user):
    response = auth_client.patch(
        reverse("perfil:detalle"),
        {"hora_aviso": "09:05"},
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert response.data["nickname"] == "PerfilUser"
    assert response.data["hora_aviso"] == "09:05"
    assert user.nickname == "PerfilUser"
    assert user.hora_aviso.strftime("%H:%M") == "09:05"


@pytest.mark.django_db
def test_patch_perfil_rejects_duplicate_nickname_and_keeps_current(auth_client, user):
    CustomUser.objects.create_user(
        email="otro@example.com",
        password=CURRENT_PASSWORD,
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
    assert "nickname y/o hora_aviso" in str(response.data).lower()


@pytest.mark.django_db
def test_patch_perfil_rejects_blank_nickname(auth_client, user):
    response = auth_client.patch(
        reverse("perfil:detalle"),
        {"nickname": "   "},
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 400
    assert response.data["nickname"] == ["Este campo no puede estar en blanco."]
    assert user.nickname == "PerfilUser"
