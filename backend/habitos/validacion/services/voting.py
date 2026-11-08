from __future__ import annotations

from django.db import IntegrityError

from escuadrones.models import Membresia
from habitos.models import RegistroDiario, VotoValidacion


class AutovotoError(Exception):
    """El autor no puede votar su propia prueba."""


class PruebaCerradaError(Exception):
    """La prueba ya no admite votos (cumplido o no_cumplido)."""


class VotoDuplicadoError(Exception):
    """El usuario ya emitió un voto sobre esa prueba."""


class VotoInvalidoError(Exception):
    """El valor del voto no es «sí» ni «no»."""


def _autor_id(registro: RegistroDiario) -> int:
    return registro.habito.membresia.usuario_id


def _escuadron_id(registro: RegistroDiario) -> int:
    return registro.habito.membresia.escuadron_id


def contar_votantes_elegibles(registro: RegistroDiario) -> int:
    """Miembros del escuadrón excepto el autor de la prueba."""
    return (
        Membresia.objects.filter(escuadron_id=_escuadron_id(registro))
        .exclude(usuario_id=_autor_id(registro))
        .count()
    )


def mayoria_alcanzada(*, votos_si: int, votantes_elegibles: int) -> bool:
    return votos_si > votantes_elegibles / 2


def construir_estado_votacion(registro: RegistroDiario, usuario) -> dict:
    votos = list(registro.votos.order_by("creado_en", "id"))
    votos_si = sum(1 for v in votos if v.voto == VotoValidacion.Valor.SI)
    elegibles = contar_votantes_elegibles(registro)
    voto_propio = next(
        (v.voto for v in votos if v.usuario_id == usuario.pk),
        None,
    )
    return {
        "registro_id": registro.id,
        "estado": registro.estado,
        "votos_si": votos_si,
        "votantes_elegibles": elegibles,
        "votos_emitidos": len(votos),
        "mayoria_alcanzada": mayoria_alcanzada(
            votos_si=votos_si,
            votantes_elegibles=elegibles,
        ),
        "voto_propio": voto_propio,
        "votos": [{"usuario_id": v.usuario_id, "voto": v.voto} for v in votos],
    }


def obtener_estado_votacion(*, registro: RegistroDiario, usuario) -> dict:
    """Recuento y estado de votación sin emitir ni modificar votos."""
    return construir_estado_votacion(registro, usuario)


def emitir_voto(*, registro: RegistroDiario, usuario, voto: str) -> dict:
    """
    Persiste el voto del usuario y recalcula la mayoría.

    Si votos_si > votantes_elegibles / 2, el registro pasa a cumplido.
    """
    if voto not in VotoValidacion.Valor.values:
        raise VotoInvalidoError('Debe ser "sí" o "no".')

    if usuario.pk == _autor_id(registro):
        raise AutovotoError(
            "No puedes votar tu propia prueba de foto de hábito diario."
        )

    if registro.estado != RegistroDiario.Estado.PENDIENTE:
        raise PruebaCerradaError("Esta prueba ya está cerrada y no admite más votos.")

    if VotoValidacion.objects.filter(registro=registro, usuario=usuario).exists():
        raise VotoDuplicadoError("Ya has emitido un voto sobre esta prueba.")

    try:
        VotoValidacion.objects.create(
            registro=registro,
            usuario=usuario,
            voto=voto,
        )
    except IntegrityError as error:
        raise VotoDuplicadoError("Ya has emitido un voto sobre esta prueba.") from error

    votos_si = VotoValidacion.objects.filter(
        registro=registro,
        voto=VotoValidacion.Valor.SI,
    ).count()
    elegibles = contar_votantes_elegibles(registro)
    if mayoria_alcanzada(votos_si=votos_si, votantes_elegibles=elegibles):
        registro.estado = RegistroDiario.Estado.CUMPLIDO
        registro.save(update_fields=["estado", "actualizado_en"])

    registro.refresh_from_db()
    return construir_estado_votacion(registro, usuario)
