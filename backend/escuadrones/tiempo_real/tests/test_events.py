from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from escuadrones.tiempo_real.events import (
    _publicar_actualizacion_panel,
    programar_actualizacion_panel,
)


@pytest.mark.django_db(transaction=True)
def test_programa_evento_de_invalidacion_con_id_de_registro():
    capa = SimpleNamespace(group_send=AsyncMock())

    with patch(
        "escuadrones.tiempo_real.events.get_channel_layer",
        return_value=capa,
    ):
        programar_actualizacion_panel(
            escuadron_id=8,
            motivo="prueba_actualizada",
            registro_id=21,
        )

    capa.group_send.assert_awaited_once_with(
        "escuadron_8",
        {
            "type": "panel.actualizado",
            "datos": {
                "tipo": "panel.actualizado",
                "escuadron_id": 8,
                "motivo": "prueba_actualizada",
                "registro_id": 21,
            },
        },
    )


@pytest.mark.django_db(transaction=True)
def test_programa_evento_sin_id_de_registro():
    capa = SimpleNamespace(group_send=AsyncMock())

    with patch(
        "escuadrones.tiempo_real.events.get_channel_layer",
        return_value=capa,
    ):
        programar_actualizacion_panel(
            escuadron_id=8,
            motivo="miembro_se_unio",
        )

    datos = capa.group_send.await_args.args[1]["datos"]
    assert datos == {
        "tipo": "panel.actualizado",
        "escuadron_id": 8,
        "motivo": "miembro_se_unio",
    }


@pytest.mark.django_db(transaction=True)
def test_publicar_sin_capa_de_canales_no_falla(caplog):
    with patch("escuadrones.tiempo_real.events.get_channel_layer", return_value=None):
        _publicar_actualizacion_panel(
            escuadron_id=8,
            datos={"tipo": "panel.actualizado"},
        )

    assert "No hay capa Channels" in caplog.text


@pytest.mark.django_db(transaction=True)
def test_error_al_publicar_no_falla_la_accion_de_dominio(caplog):
    capa = SimpleNamespace(group_send=AsyncMock(side_effect=RuntimeError))

    with patch(
        "escuadrones.tiempo_real.events.get_channel_layer",
        return_value=capa,
    ):
        programar_actualizacion_panel(escuadron_id=8, motivo="voto_emitido")

    assert "No se pudo publicar" in caplog.text
