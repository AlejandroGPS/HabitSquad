from datetime import datetime, time
from io import StringIO
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from django_q.models import Schedule

from alertas.models import SuscripcionPush
from alertas.services import procesar_avisos_pendientes
from alertas.tasks import enviar_avisos_pendientes
from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from usuarios.models import CustomUser

ENDPOINT = "https://fcm.googleapis.com/fcm/send/q2"


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="q2-alertas@example.com",
        password="S0mething!Secure-497",
        nickname="Q2Alertas",
        hora_aviso=time(20, 0),
    )


@pytest.fixture
def habito(user):
    escuadron = Escuadron.objects.create(
        nombre="Q2 Avisos",
        creador=user,
        codigo_invitacion="Q2ALRT",
    )
    membresia = Membresia.objects.create(escuadron=escuadron, usuario=user)
    return HabitoDiario.objects.create(
        membresia=membresia,
        opcion=HabitoDiario.Opcion.LEER,
    )


@pytest.fixture
def suscripcion(user):
    return SuscripcionPush.objects.create(
        usuario=user,
        endpoint=ENDPOINT,
        p256dh="p",
        auth="a",
    )


def _ahora_a_las(hora: int, minuto: int):
    return timezone.make_aware(datetime(2026, 11, 22, hora, minuto, 30))


def test_tarea_delega_en_procesar_avisos_pendientes():
    with patch(
        "alertas.tasks.procesar_avisos_pendientes",
        return_value=3,
    ) as procesar:
        assert enviar_avisos_pendientes() == 3
    procesar.assert_called_once_with()


@pytest.mark.django_db
def test_programar_alertas_es_idempotente():
    call_command("programar_alertas")
    horario = Schedule.objects.get(name="enviar_avisos_pendientes_habitsquad")
    proxima_ejecucion = horario.next_run

    call_command("programar_alertas")
    horario.refresh_from_db()

    assert (
        Schedule.objects.filter(name="enviar_avisos_pendientes_habitsquad").count() == 1
    )
    assert horario.func == "alertas.tasks.enviar_avisos_pendientes"
    assert horario.schedule_type == Schedule.MINUTES
    assert horario.minutes == 1
    assert horario.cluster == "habitsquad"
    assert horario.repeats == -1
    assert horario.next_run == proxima_ejecucion


@pytest.mark.django_db
def test_programar_alertas_escribe_mensaje_de_exito():
    salida = StringIO()
    call_command("programar_alertas", stdout=salida)

    texto = salida.getvalue()
    assert "Avisos Web Push programados cada minuto" in texto
    assert "habitsquad" in texto


@override_settings(
    VAPID_PUBLIC_KEY="publica",
    VAPID_PRIVATE_KEY="privada",
    VAPID_ADMIN_EMAIL="ops@habitsquad.local",
)
@pytest.mark.django_db
def test_tarea_envia_si_candidato_en_minuto(user, habito, suscripcion):
    sender = MagicMock()
    ahora = _ahora_a_las(20, 0)

    def _procesar(*args, **kwargs):
        return procesar_avisos_pendientes(ahora=ahora, webpush_fn=sender)

    with patch("alertas.tasks.procesar_avisos_pendientes", side_effect=_procesar):
        assert enviar_avisos_pendientes() == 1

    sender.assert_called_once()


@override_settings(
    VAPID_PUBLIC_KEY="publica",
    VAPID_PRIVATE_KEY="privada",
    VAPID_ADMIN_EMAIL="ops@habitsquad.local",
)
@pytest.mark.django_db
def test_tarea_no_envia_si_ya_hay_prueba(user, habito, suscripcion):
    RegistroDiario.objects.create(
        habito=habito,
        cloudinary_public_id="foto/q2",
        fecha=timezone.localdate(_ahora_a_las(20, 0)),
        estado=RegistroDiario.Estado.PENDIENTE,
    )
    sender = MagicMock()
    ahora = _ahora_a_las(20, 0)

    def _procesar(*args, **kwargs):
        return procesar_avisos_pendientes(ahora=ahora, webpush_fn=sender)

    with patch("alertas.tasks.procesar_avisos_pendientes", side_effect=_procesar):
        assert enviar_avisos_pendientes() == 0

    sender.assert_not_called()


@override_settings(
    VAPID_PUBLIC_KEY="publica",
    VAPID_PRIVATE_KEY="privada",
    VAPID_ADMIN_EMAIL="ops@habitsquad.local",
)
@pytest.mark.django_db
def test_tarea_no_envia_fuera_del_minuto(user, habito, suscripcion):
    sender = MagicMock()
    ahora = _ahora_a_las(12, 0)

    def _procesar(*args, **kwargs):
        return procesar_avisos_pendientes(ahora=ahora, webpush_fn=sender)

    with patch("alertas.tasks.procesar_avisos_pendientes", side_effect=_procesar):
        assert enviar_avisos_pendientes() == 0

    sender.assert_not_called()
