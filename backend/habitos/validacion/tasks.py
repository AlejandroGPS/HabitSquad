from django.utils import timezone

from escuadrones.models import Escuadron
from escuadrones.tiempo_real.events import programar_actualizacion_panel
from habitos.models import RegistroDiario
from habitos.validacion.services.closing import cerrar_pruebas_pendientes


def cerrar_jornadas_pendientes() -> int:
    """Cierra pruebas pendientes anteriores a hoy, en Europe/Madrid."""
    hoy = timezone.localdate()
    fechas = list(
        RegistroDiario.objects.filter(
            fecha__lt=hoy,
            estado=RegistroDiario.Estado.PENDIENTE,
        )
        .order_by()
        .values_list("fecha", flat=True)
        .distinct()
    )
    cerrados = sum(
        cerrar_pruebas_pendientes(fecha=fecha, notificar=False) for fecha in fechas
    )
    for escuadron_id in Escuadron.objects.values_list("pk", flat=True):
        programar_actualizacion_panel(
            escuadron_id=escuadron_id,
            motivo="cierre_diario",
        )
    return cerrados
