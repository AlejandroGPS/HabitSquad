import pytest
from django.core.cache import cache
from django.urls import reverse

from .conftest import CURRENT_PASSWORD

NEW_PASSWORD = "N3w!Secure-Password-88"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def _login(api_client, *, email="perfil@example.com", password):
    return api_client.post(
        reverse("autenticacion:token"),
        {"email": email, "password": password},
        format="json",
    )


@pytest.mark.django_db
def test_cambiar_password_permite_login_solo_con_la_nueva(
    auth_client, api_client, user
):
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

    login_nueva = _login(api_client, password=NEW_PASSWORD)
    login_anterior = _login(api_client, password=CURRENT_PASSWORD)

    assert login_nueva.status_code == 200
    assert {"access", "refresh"} <= set(login_nueva.data)
    assert login_anterior.status_code == 401


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
def test_cambiar_password_rechaza_nueva_vacia(auth_client, user):
    response = auth_client.post(
        reverse("perfil:password"),
        {
            "password_actual": CURRENT_PASSWORD,
            "password": "",
            "password_confirm": "",
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
