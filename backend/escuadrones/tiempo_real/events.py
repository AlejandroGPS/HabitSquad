import logging
from functools import partial

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

logger = logging.getLogger(__name__)


def programar_actualizacion_panel(
    *,
    escuadron_id: int,
    motivo: str,
    registro_id: int | None = None,
) -> None:
    """Emite una invalidación después de confirmar los cambios en la BD."""
    datos = {
        "tipo": "panel.actualizado",
        "escuadron_id": escuadron_id,
        "motivo": motivo,
    }
    if registro_id is not None:
        datos["registro_id"] = registro_id

    transaction.on_commit(
        partial(_publicar_actualizacion_panel, escuadron_id=escuadron_id, datos=datos)
    )


def _publicar_actualizacion_panel(*, escuadron_id: int, datos: dict) -> None:
    capa = get_channel_layer()
    if capa is None:
        logger.warning("No hay capa Channels para el escuadrón %s", escuadron_id)
        return

    try:
        async_to_sync(capa.group_send)(
            f"escuadron_{escuadron_id}",
            {"type": "panel.actualizado", "datos": datos},
        )
    except Exception:
        logger.exception("No se pudo publicar la actualización del panel")
