import pytest
from django.test import override_settings
from rest_framework import serializers

from alertas.api.serializers import _campo_no_vacio
from alertas.models import SuscripcionPush
from alertas.services import (
    VapidNoConfiguradoError,
    eliminar_suscripcion,
    obtener_clave_publica_vapid,
    registrar_suscripcion,
)
from usuarios.models import CustomUser

ENDPOINT = "https://fcm.googleapis.com/fcm/send/servicio"


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="servicio-alertas@example.com",
        password="S0mething!Secure-497",
        nickname="ServicioAlertas",
    )


def test_campo_no_vacio_rechaza_valores_vacios():
    with pytest.raises(serializers.ValidationError, match="no puede estar vacío"):
        _campo_no_vacio("   ", "Este campo no puede estar vacío.")
    with pytest.raises(serializers.ValidationError, match="no puede estar vacío"):
        _campo_no_vacio(None, "Este campo no puede estar vacío.")


def test_campo_no_vacio_acepta_texto_limpio():
    assert _campo_no_vacio("  valor  ", "x") == "valor"


@override_settings(VAPID_PUBLIC_KEY="")
def test_obtener_clave_publica_vapid_sin_configurar():
    with pytest.raises(VapidNoConfiguradoError):
        obtener_clave_publica_vapid()


@override_settings(VAPID_PUBLIC_KEY="clave-publica")
def test_obtener_clave_publica_vapid_ok():
    assert obtener_clave_publica_vapid() == "clave-publica"


@pytest.mark.django_db
def test_registrar_suscripcion_crea_y_actualiza(user):
    primera, creado = registrar_suscripcion(
        usuario=user,
        endpoint=ENDPOINT,
        p256dh="p1",
        auth="a1",
    )
    assert creado is True
    assert primera.p256dh == "p1"

    segunda, creado = registrar_suscripcion(
        usuario=user,
        endpoint=ENDPOINT,
        p256dh="p2",
        auth="a2",
    )
    assert creado is False
    assert segunda.pk == primera.pk
    assert segunda.p256dh == "p2"
    assert SuscripcionPush.objects.filter(endpoint=ENDPOINT).count() == 1


@pytest.mark.django_db
def test_eliminar_suscripcion_idempotente(user):
    registrar_suscripcion(
        usuario=user,
        endpoint=ENDPOINT,
        p256dh="p",
        auth="a",
    )
    eliminar_suscripcion(usuario=user, endpoint=ENDPOINT)
    eliminar_suscripcion(usuario=user, endpoint=ENDPOINT)
    assert not SuscripcionPush.objects.filter(endpoint=ENDPOINT).exists()
