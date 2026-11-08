from __future__ import annotations

from datetime import date

from django.utils import timezone

from habitos.models import RegistroDiario, VotoValidacion

from .voting import contar_votantes_elegibles, mayoria_alcanzada


def cerrar_pruebas_pendientes(*, fecha: date | None = None) -> int:
    """
    Cierra los registros pendientes de la fecha indicada (Europe/Madrid).

    Por defecto usa el día calendario local actual. Para cada registro
    pendiente: si hay mayoría de «sí» → cumplido; si no → no_cumplido.

    Devuelve el número de registros actualizados.
    """
    dia = fecha if fecha is not None else timezone.localdate()
    pendientes = (
        RegistroDiario.objects.filter(
            fecha=dia,
            estado=RegistroDiario.Estado.PENDIENTE,
        )
        .select_related("habito__membresia")
        .prefetch_related("votos")
    )

    cerrados = 0
    for registro in pendientes:
        votos_si = sum(
            1 for v in registro.votos.all() if v.voto == VotoValidacion.Valor.SI
        )
        elegibles = contar_votantes_elegibles(registro)
        if mayoria_alcanzada(votos_si=votos_si, votantes_elegibles=elegibles):
            registro.estado = RegistroDiario.Estado.CUMPLIDO
        else:
            registro.estado = RegistroDiario.Estado.NO_CUMPLIDO
        registro.save(update_fields=["estado", "actualizado_en"])
        cerrados += 1
    return cerrados
