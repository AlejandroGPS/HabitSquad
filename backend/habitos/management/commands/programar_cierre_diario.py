from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django_q.models import Schedule

from habitos.validacion.tasks import cerrar_jornadas_pendientes

NOMBRE_TAREA = "cerrar_jornadas_pendientes_habitsquad"


class Command(BaseCommand):
    help = "Registra el cierre diario de pruebas pendientes a medianoche local."

    def handle(self, *args, **options):
        manana = timezone.localdate() + timedelta(days=1)
        zona = timezone.get_current_timezone()
        siguiente_ejecucion = timezone.make_aware(
            datetime.combine(manana, time.min),
            timezone=zona,
        )
        Schedule.objects.get_or_create(
            name=NOMBRE_TAREA,
            defaults={
                "func": "habitos.validacion.tasks.cerrar_jornadas_pendientes",
                "schedule_type": Schedule.DAILY,
                "next_run": siguiente_ejecucion,
                "repeats": -1,
                "cluster": "habitsquad",
            },
        )
        cerrados = cerrar_jornadas_pendientes()
        self.stdout.write(
            self.style.SUCCESS(
                "Cierre diario programado a las 00:00 (Europe/Madrid); "
                f"se cerraron {cerrados} registro(s) pendiente(s) anteriores."
            )
        )
