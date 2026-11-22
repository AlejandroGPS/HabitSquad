from django.db import IntegrityError, transaction

from escuadrones.models import Escuadron, Membresia
from escuadrones.tiempo_real.events import programar_actualizacion_panel


class SquadronNotFoundError(Exception):
    """No existe un escuadrón con el código de invitación indicado"""


class AlreadyMemberError(Exception):
    """El usuario ya es miembro del escuadrón"""


def normalize_invitation_code(codigo_invitacion: str) -> str:
    return codigo_invitacion.strip().upper()


def unirse_escuadron(*, codigo_invitacion: str, usuario) -> Escuadron:
    codigo = normalize_invitation_code(codigo_invitacion)
    try:
        escuadron = Escuadron.objects.get(codigo_invitacion=codigo)
    except Escuadron.DoesNotExist as error:
        raise SquadronNotFoundError(
            "No se ha encontrado un escuadrón con ese código"
        ) from error

    if Membresia.objects.filter(escuadron=escuadron, usuario=usuario).exists():
        raise AlreadyMemberError("Ya perteneces a este escuadrón")

    try:
        with transaction.atomic():
            Membresia.objects.create(
                escuadron=escuadron,
                usuario=usuario,
                es_administrador=False,
            )
            programar_actualizacion_panel(
                escuadron_id=escuadron.pk,
                motivo="miembro_se_unio",
            )
    except IntegrityError as error:
        raise AlreadyMemberError("Ya perteneces a este escuadrón") from error

    return escuadron
