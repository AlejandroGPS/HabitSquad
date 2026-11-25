from datetime import datetime

from django.utils import timezone

from alertas.models import SuscripcionPush
from habitos.models import HabitoDiario, RegistroDiario


def corresponde_hora_aviso(usuario, *, ahora: datetime | None = None) -> bool:
    """True si la hora local (Europe/Madrid) cae en el minuto de hora_aviso."""
    momento = timezone.localtime(ahora) if ahora is not None else timezone.localtime()
    aviso = usuario.hora_aviso
    return momento.hour == aviso.hour and momento.minute == aviso.minute


def usuario_debe_recibir_aviso(
    usuario,
    *,
    ahora: datetime | None = None,
) -> bool:
    """Criterio de envío del contrato: suscripción, hábito, sin prueba hoy, hora."""
    if not SuscripcionPush.objects.filter(usuario=usuario).exists():
        return False

    habitos = HabitoDiario.objects.filter(membresia__usuario=usuario)
    if not habitos.exists():
        return False

    hoy = timezone.localdate(ahora) if ahora is not None else timezone.localdate()
    if RegistroDiario.objects.filter(habito__in=habitos, fecha=hoy).exists():
        return False

    return corresponde_hora_aviso(usuario, ahora=ahora)
