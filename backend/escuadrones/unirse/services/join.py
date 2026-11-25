from django.db import IntegrityError, transaction

from escuadrones.models import Escuadron, Membresia
from escuadrones.tiempo_real.events import programar_actualizacion_panel


class SquadronNotFoundError(Exception):
    """No existe un escuadrón con el código o identificador indicado."""


class AlreadyMemberError(Exception):
    """El usuario ya es miembro del escuadrón."""


class SquadronFullError(Exception):
    """El escuadrón ha alcanzado su límite de miembros."""


class PrivateSquadError(Exception):
    """El escuadrón es privado y requiere el código de invitación."""


def normalize_invitation_code(codigo_invitacion: str) -> str:
    return codigo_invitacion.strip().upper()


def _unirse_a_escuadron(*, escuadron_id: int, usuario, solo_publicos=False):
    try:
        with transaction.atomic():
            escuadron = Escuadron.objects.select_for_update().get(pk=escuadron_id)
            if solo_publicos and not escuadron.es_publico:
                raise PrivateSquadError(
                    "Solo puedes unirte sin código a escuadrones públicos"
                )

            if Membresia.objects.filter(
                escuadron=escuadron,
                usuario=usuario,
            ).exists():
                raise AlreadyMemberError("Ya perteneces a este escuadrón")

            if escuadron.membresias.count() >= escuadron.limite_miembros:
                raise SquadronFullError(
                    "El escuadrón ha alcanzado el límite de miembros"
                )

            Membresia.objects.create(
                escuadron=escuadron,
                usuario=usuario,
                es_administrador=False,
            )
            programar_actualizacion_panel(
                escuadron_id=escuadron.pk,
                motivo="miembro_se_unio",
            )
    except Escuadron.DoesNotExist as error:
        raise SquadronNotFoundError("No se ha encontrado el escuadrón") from error
    except IntegrityError as error:
        raise AlreadyMemberError("Ya perteneces a este escuadrón") from error

    return escuadron


def unirse_escuadron(*, codigo_invitacion: str, usuario) -> Escuadron:
    codigo = normalize_invitation_code(codigo_invitacion)
    escuadron = Escuadron.objects.filter(codigo_invitacion=codigo).first()
    if escuadron is None:
        raise SquadronNotFoundError("No se ha encontrado un escuadrón con ese código")
    return _unirse_a_escuadron(escuadron_id=escuadron.pk, usuario=usuario)


def unirse_escuadron_publico(*, escuadron_id: int, usuario) -> Escuadron:
    return _unirse_a_escuadron(
        escuadron_id=escuadron_id,
        usuario=usuario,
        solo_publicos=True,
    )
