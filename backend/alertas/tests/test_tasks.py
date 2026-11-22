from unittest.mock import patch

import pytest
from django.core.management import call_command
from django_q.models import Schedule

from alertas.tasks import enviar_avisos_pendientes


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

    assert horario.func == "alertas.tasks.enviar_avisos_pendientes"
    assert horario.schedule_type == Schedule.MINUTES
    assert horario.minutes == 1
    assert horario.cluster == "habitsquad"
    assert horario.repeats == -1
    assert horario.next_run == proxima_ejecucion
