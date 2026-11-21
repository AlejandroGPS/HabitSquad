import pytest
from django.urls import reverse

from .conftest import CURRENT_PASSWORD

NEW_PASSWORD = "N3w!Secure-Password-88"


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
