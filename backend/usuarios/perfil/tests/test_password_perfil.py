import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import CustomUser

CURRENT_PASSWORD = "S0mething!Secure-497"
NEW_PASSWORD = "N3w!Secure-Password-88"


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


@pytest.mark.django_db
def test_cambiar_password_actualiza_y_deja_invalida_la_anterior(auth_client, user):
    response = auth_client.post(
        reverse("perfil:password"),
        {
            "password_actual": CURRENT_PASSWORD,
            "password": NEW_PASSWORD,
            "password_confirm": NEW_PASSWORD,
        },
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert response.data == {"detail": "La contraseña se ha actualizado correctamente."}
    assert user.check_password(NEW_PASSWORD)
    assert not user.check_password(CURRENT_PASSWORD)


@pytest.mark.django_db
def test_cambiar_password_rechaza_actual_incorrecta(auth_client, user):
    response = auth_client.post(
        reverse("perfil:password"),
        {
            "password_actual": "Wrong!Password-00",
            "password": NEW_PASSWORD,
            "password_confirm": NEW_PASSWORD,
        },
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 400
    assert response.data["password_actual"] == ["La contraseña actual no es correcta."]
    assert user.check_password(CURRENT_PASSWORD)


@pytest.mark.django_db
def test_cambiar_password_rechaza_confirmacion_distinta(auth_client, user):
    response = auth_client.post(
        reverse("perfil:password"),
        {
            "password_actual": CURRENT_PASSWORD,
            "password": NEW_PASSWORD,
            "password_confirm": "Otra!Secure-Password-99",
        },
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 400
    assert response.data["password_confirm"] == ["Las contraseñas no coinciden."]
    assert user.check_password(CURRENT_PASSWORD)


@pytest.mark.django_db
def test_cambiar_password_rechaza_nueva_invalida(auth_client, user):
    response = auth_client.post(
        reverse("perfil:password"),
        {
            "password_actual": CURRENT_PASSWORD,
            "password": "123",
            "password_confirm": "123",
        },
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 400
    assert "password" in response.data
    assert user.check_password(CURRENT_PASSWORD)


@pytest.mark.django_db
def test_cambiar_password_requiere_auth(api_client):
    response = api_client.post(
        reverse("perfil:password"),
        {
            "password_actual": CURRENT_PASSWORD,
            "password": NEW_PASSWORD,
            "password_confirm": NEW_PASSWORD,
        },
        format="json",
    )

    assert response.status_code == 401
