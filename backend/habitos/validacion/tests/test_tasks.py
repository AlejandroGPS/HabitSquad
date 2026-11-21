from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.utils import timezone
from django_q.models import Schedule

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from habitos.validacion.tasks import cerrar_jornadas_pendientes
from usuarios.models import CustomUser


@pytest.fixture
def registro_pendiente_ayer(db):
    usuario = CustomUser.objects.create_user(
        email="cierre-q2@example.com",
        password="S0mething!Secure-497",
    )
    escuadron = Escuadron.objects.create(
        nombre="Cierre Q2",
        creador=usuario,
        codigo_invitacion="Q2C9QL",
    )
    membresia = Membresia.objects.create(
        escuadron=escuadron,
        usuario=usuario,
        es_administrador=True,
    )
    habito = HabitoDiario.objects.create(
        membresia=membresia,
        opcion=HabitoDiario.Opcion.LEER,
    )
    return RegistroDiario.objects.create(
        habito=habito,
        fecha=timezone.localdate() - timedelta(days=1),
        cloudinary_public_id="pruebas/cierre-q2",
    )


@pytest.mark.django_db
def test_tarea_cierra_jornadas_anteriores_y_no_cierra_hoy(registro_pendiente_ayer):
    registro_pendiente_anteayer = RegistroDiario.objects.create(
        habito=registro_pendiente_ayer.habito,
        fecha=timezone.localdate() - timedelta(days=2),
        cloudinary_public_id="pruebas/anteayer-q2",
    )
    registro_hoy = RegistroDiario.objects.create(
        habito=registro_pendiente_ayer.habito,
        fecha=timezone.localdate(),
        cloudinary_public_id="pruebas/hoy-q2",
    )

    cerrados = cerrar_jornadas_pendientes()

    registro_pendiente_ayer.refresh_from_db()
    registro_hoy.refresh_from_db()
    assert cerrados == 2
    assert registro_pendiente_ayer.estado == RegistroDiario.Estado.NO_CUMPLIDO
    assert (
        RegistroDiario.objects.get(pk=registro_pendiente_anteayer.pk).estado
        == RegistroDiario.Estado.NO_CUMPLIDO
    )
    assert registro_hoy.estado == RegistroDiario.Estado.PENDIENTE


@pytest.mark.django_db
def test_tarea_no_reabre_registros_ya_cerrados(registro_pendiente_ayer):
    registro_pendiente_ayer.estado = RegistroDiario.Estado.CUMPLIDO
    registro_pendiente_ayer.save(update_fields=["estado"])

    assert cerrar_jornadas_pendientes() == 0


@pytest.mark.django_db(transaction=True)
def test_tarea_notifica_al_escuadron_aunque_no_haya_pruebas_pendientes(
    registro_pendiente_ayer,
):
    escuadron_id = registro_pendiente_ayer.habito.membresia.escuadron_id

    with patch("habitos.validacion.tasks.programar_actualizacion_panel") as publicar:
        cerrados = cerrar_jornadas_pendientes()

    assert cerrados == 1
    publicar.assert_called_once_with(
        escuadron_id=escuadron_id,
        motivo="cierre_diario",
    )


@pytest.mark.django_db
def test_programar_cierre_diario_es_idempotente():
    call_command("programar_cierre_diario")
    horario = Schedule.objects.get(name="cerrar_jornadas_pendientes_habitsquad")
    proxima_ejecucion = horario.next_run

    call_command("programar_cierre_diario")
    horario.refresh_from_db()

    assert horario.func == "habitos.validacion.tasks.cerrar_jornadas_pendientes"
    assert horario.schedule_type == Schedule.DAILY
    assert horario.cluster == "habitsquad"
    assert horario.next_run == proxima_ejecucion
    assert timezone.localtime(horario.next_run).hour == 0
    assert timezone.localtime(horario.next_run).minute == 0
