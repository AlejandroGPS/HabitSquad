from django.db import transaction

from escuadrones.models import Escuadron, Membresia
from escuadrones.tiempo_real.events import programar_actualizacion_panel
from habitos.models import VotoValidacion


class EscuadronNoEncontradoError(Exception):
    """No existe el escuadrón indicado."""


class MiembroNoEncontradoError(Exception):
    """El usuario objetivo no pertenece al escuadrón."""


class SolicitanteNoAdministradorError(Exception):
    """El usuario solicitante no es administrador del escuadrón."""


class AdministradorNoExpulsableError(Exception):
    """No se puede expulsar a un administrador ni al creador del escuadrón."""


def expulsar_miembro(*, escuadron_id: int, usuario_id: int, solicitante) -> None:
    try:
        with transaction.atomic():
            escuadron = Escuadron.objects.select_for_update().get(pk=escuadron_id)

            if not Membresia.objects.filter(
                escuadron=escuadron,
                usuario=solicitante,
                es_administrador=True,
            ).exists():
                raise SolicitanteNoAdministradorError(
                    "Solo un administrador puede expulsar miembros."
                )

            membresia = (
                Membresia.objects.select_for_update()
                .filter(escuadron=escuadron, usuario_id=usuario_id)
                .first()
            )
            if membresia is None:
                raise MiembroNoEncontradoError(
                    "El usuario no pertenece a este escuadrón."
                )

            if (
                membresia.es_administrador
                or membresia.usuario_id == escuadron.creador_id
            ):
                raise AdministradorNoExpulsableError(
                    "No se puede expulsar al administrador o creador del escuadrón."
                )

            VotoValidacion.objects.filter(
                usuario_id=usuario_id,
                registro__habito__membresia__escuadron=escuadron,
            ).delete()
            membresia.delete()
            programar_actualizacion_panel(
                escuadron_id=escuadron.pk,
                motivo="miembro_expulsado",
            )
    except Escuadron.DoesNotExist as error:
        raise EscuadronNoEncontradoError("No se ha encontrado el escuadrón.") from error
