from datetime import datetime, time
from unittest.mock import MagicMock

import pytest
from django.test import override_settings
from django.utils import timezone
from pywebpush import WebPushException

from alertas.models import SuscripcionPush
from alertas.services import (
    enviar_aviso_a_usuario,
    procesar_avisos_pendientes,
    usuario_debe_recibir_aviso,
)
from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from usuarios.models import CustomUser

ENDPOINT = "https://fcm.googleapis.com/fcm/send/aviso"


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="aviso@example.com",
        password="S0mething!Secure-497",
        nickname="AvisoUser",
        hora_aviso=time(20, 0),
    )


@pytest.fixture
def membership(user):
    escuadron = Escuadron.objects.create(
        nombre="Avisos",
        creador=user,
        codigo_invitacion="AVISO1",
    )
    return Membresia.objects.create(escuadron=escuadron, usuario=user)


@pytest.fixture
def habito(membership):
    return HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.LEER,
    )


@pytest.fixture
def suscripcion(user):
    return SuscripcionPush.objects.create(
        usuario=user,
        endpoint=ENDPOINT,
        p256dh="p256dh",
        auth="auth",
    )


def _ahora_a_las(hora: int, minuto: int):
    return timezone.make_aware(datetime(2026, 11, 22, hora, minuto, 30))


@pytest.mark.django_db
def test_no_aviso_sin_suscripcion(user, habito):
    assert usuario_debe_recibir_aviso(user, ahora=_ahora_a_las(20, 0)) is False


@pytest.mark.django_db
def test_no_aviso_sin_habito(user, suscripcion):
    assert usuario_debe_recibir_aviso(user, ahora=_ahora_a_las(20, 0)) is False


@pytest.mark.django_db
def test_no_aviso_si_ya_hay_prueba_hoy(user, habito, suscripcion):
    RegistroDiario.objects.create(
        habito=habito,
        cloudinary_public_id="foto/hoy",
        fecha=timezone.localdate(_ahora_a_las(20, 0)),
        estado=RegistroDiario.Estado.PENDIENTE,
    )

    assert usuario_debe_recibir_aviso(user, ahora=_ahora_a_las(20, 0)) is False


@pytest.mark.django_db
def test_no_aviso_fuera_de_hora(user, habito, suscripcion):
    assert usuario_debe_recibir_aviso(user, ahora=_ahora_a_las(19, 59)) is False


@pytest.mark.django_db
def test_si_debe_recibir_aviso(user, habito, suscripcion):
    assert usuario_debe_recibir_aviso(user, ahora=_ahora_a_las(20, 0)) is True


@override_settings(
    VAPID_PUBLIC_KEY="publica",
    VAPID_PRIVATE_KEY="privada",
    VAPID_ADMIN_EMAIL="ops@habitsquad.local",
)
@pytest.mark.django_db
def test_enviar_aviso_llama_webpush(user, habito, suscripcion):
    sender = MagicMock()

    enviados = enviar_aviso_a_usuario(
        user,
        ahora=_ahora_a_las(20, 0),
        webpush_fn=sender,
    )

    assert enviados == 1
    sender.assert_called_once()
    kwargs = sender.call_args.kwargs
    assert kwargs["subscription_info"]["endpoint"] == ENDPOINT
    assert kwargs["vapid_private_key"] == "privada"
    assert kwargs["vapid_claims"] == {"sub": "mailto:ops@habitsquad.local"}


@override_settings(
    VAPID_PUBLIC_KEY="",
    VAPID_PRIVATE_KEY="",
    VAPID_ADMIN_EMAIL="",
)
@pytest.mark.django_db
def test_enviar_aviso_sin_vapid_no_envia(user, habito, suscripcion):
    sender = MagicMock()

    enviados = enviar_aviso_a_usuario(
        user,
        ahora=_ahora_a_las(20, 0),
        webpush_fn=sender,
    )

    assert enviados == 0
    sender.assert_not_called()


@override_settings(
    VAPID_PUBLIC_KEY="publica",
    VAPID_PRIVATE_KEY="privada",
    VAPID_ADMIN_EMAIL="mailto:ops@habitsquad.local",
)
@pytest.mark.django_db
def test_enviar_aviso_ignora_fallo_webpush(user, habito, suscripcion):
    sender = MagicMock(side_effect=WebPushException("gone"))

    enviados = enviar_aviso_a_usuario(
        user,
        ahora=_ahora_a_las(20, 0),
        webpush_fn=sender,
    )

    assert enviados == 0
    sender.assert_called_once()


@override_settings(
    VAPID_PUBLIC_KEY="publica",
    VAPID_PRIVATE_KEY="privada",
    VAPID_ADMIN_EMAIL="ops@habitsquad.local",
)
@pytest.mark.django_db
def test_procesar_avisos_pendientes_smoke(user, habito, suscripcion):
    sender = MagicMock()

    total = procesar_avisos_pendientes(
        ahora=_ahora_a_las(20, 0),
        webpush_fn=sender,
    )

    assert total == 1
    sender.assert_called_once()
