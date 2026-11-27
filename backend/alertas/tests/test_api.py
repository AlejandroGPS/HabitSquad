import pytest
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from alertas.models import SuscripcionPush
from usuarios.models import CustomUser

ENDPOINT = "https://fcm.googleapis.com/fcm/send/ejemplo"
PAYLOAD = {
    "endpoint": ENDPOINT,
    "keys": {"p256dh": "clave-p256dh", "auth": "clave-auth"},
}


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


@override_settings(VAPID_PUBLIC_KEY="")
def test_vapid_public_key_sin_configurar_devuelve_503(api_client):
    response = api_client.get(reverse("alertas:vapid-public-key"))

    assert response.status_code == 503
    assert response.data["detail"] == "La clave pública VAPID no está configurada."


@override_settings(VAPID_PUBLIC_KEY="  BNcRdsaClavePublicaDePrueba  ")
def test_vapid_public_key_configurada_devuelve_200(api_client):
    response = api_client.get(reverse("alertas:vapid-public-key"))

    assert response.status_code == 200
    assert response.data == {"public_key": "BNcRdsaClavePublicaDePrueba"}


@pytest.mark.django_db
def test_suscripcion_requires_auth(api_client):
    response = api_client.post(reverse("alertas:suscripcion"), {}, format="json")

    assert response.status_code == 401


@pytest.mark.django_db
def test_registrar_suscripcion_crea_201(auth_client, user):
    response = auth_client.post(
        reverse("alertas:suscripcion"),
        PAYLOAD,
        format="json",
    )

    assert response.status_code == 201
    assert response.data == {"endpoint": ENDPOINT, "creado": True}
    assert SuscripcionPush.objects.filter(usuario=user, endpoint=ENDPOINT).count() == 1


@pytest.mark.django_db
def test_registrar_suscripcion_actualiza_200(auth_client, user):
    SuscripcionPush.objects.create(
        usuario=user,
        endpoint=ENDPOINT,
        p256dh="antigua",
        auth="antigua",
    )

    response = auth_client.post(
        reverse("alertas:suscripcion"),
        PAYLOAD,
        format="json",
    )

    assert response.status_code == 200
    assert response.data == {"endpoint": ENDPOINT, "creado": False}
    suscripcion = SuscripcionPush.objects.get(endpoint=ENDPOINT)
    assert suscripcion.p256dh == "clave-p256dh"
    assert suscripcion.auth == "clave-auth"


@pytest.mark.django_db
def test_registrar_suscripcion_reasigna_endpoint_de_otro_usuario(auth_client, user):
    otro = CustomUser.objects.create_user(
        email="otro-push@example.com",
        password="S0mething!Secure-497",
        nickname="OtroPush",
    )
    SuscripcionPush.objects.create(
        usuario=otro,
        endpoint=ENDPOINT,
        p256dh="vieja",
        auth="vieja",
    )

    response = auth_client.post(
        reverse("alertas:suscripcion"),
        PAYLOAD,
        format="json",
    )

    assert response.status_code == 200
    assert response.data == {"endpoint": ENDPOINT, "creado": False}
    suscripcion = SuscripcionPush.objects.get(endpoint=ENDPOINT)
    assert suscripcion.usuario_id == user.pk
    assert suscripcion.p256dh == "clave-p256dh"


@pytest.mark.django_db
def test_registrar_suscripcion_body_incompleto_400(auth_client):
    response = auth_client.post(
        reverse("alertas:suscripcion"),
        {"endpoint": ENDPOINT},
        format="json",
    )

    assert response.status_code == 400
    assert "keys" in response.data


@pytest.mark.django_db
def test_registrar_suscripcion_sin_endpoint_400(auth_client):
    response = auth_client.post(
        reverse("alertas:suscripcion"),
        {"keys": {"p256dh": "abc", "auth": "def"}},
        format="json",
    )

    assert response.status_code == 400
    assert "endpoint" in response.data


@pytest.mark.django_db
def test_registrar_suscripcion_endpoint_invalido_400(auth_client):
    response = auth_client.post(
        reverse("alertas:suscripcion"),
        {
            "endpoint": "no-es-una-url",
            "keys": {"p256dh": "abc", "auth": "def"},
        },
        format="json",
    )

    assert response.status_code == 400
    assert "endpoint" in response.data


@pytest.mark.django_db
def test_registrar_suscripcion_keys_vacias_400(auth_client):
    response = auth_client.post(
        reverse("alertas:suscripcion"),
        {
            "endpoint": ENDPOINT,
            "keys": {"p256dh": "   ", "auth": "   "},
        },
        format="json",
    )

    assert response.status_code == 400
    assert "keys" in response.data


@pytest.mark.django_db
def test_registrar_suscripcion_falta_p256dh_400(auth_client):
    response = auth_client.post(
        reverse("alertas:suscripcion"),
        {
            "endpoint": ENDPOINT,
            "keys": {"auth": "clave-auth"},
        },
        format="json",
    )

    assert response.status_code == 400
    assert "keys" in response.data


@pytest.mark.django_db
def test_eliminar_suscripcion_requires_auth(api_client):
    response = api_client.delete(
        reverse("alertas:suscripcion"),
        {"endpoint": ENDPOINT},
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_eliminar_suscripcion_204(auth_client, user):
    SuscripcionPush.objects.create(
        usuario=user,
        endpoint=ENDPOINT,
        p256dh="a",
        auth="b",
    )

    response = auth_client.delete(
        reverse("alertas:suscripcion"),
        {"endpoint": ENDPOINT},
        format="json",
    )

    assert response.status_code == 204
    assert not SuscripcionPush.objects.filter(endpoint=ENDPOINT).exists()


@pytest.mark.django_db
def test_eliminar_suscripcion_idempotente_204(auth_client):
    response = auth_client.delete(
        reverse("alertas:suscripcion"),
        {"endpoint": ENDPOINT},
        format="json",
    )

    assert response.status_code == 204


@pytest.mark.django_db
def test_eliminar_suscripcion_sin_endpoint_400(auth_client):
    response = auth_client.delete(
        reverse("alertas:suscripcion"),
        {},
        format="json",
    )

    assert response.status_code == 400
    assert "endpoint" in response.data


@pytest.mark.django_db
def test_eliminar_suscripcion_endpoint_vacio_400(auth_client):
    response = auth_client.delete(
        reverse("alertas:suscripcion"),
        {"endpoint": "   "},
        format="json",
    )

    assert response.status_code == 400
    assert "endpoint" in response.data
