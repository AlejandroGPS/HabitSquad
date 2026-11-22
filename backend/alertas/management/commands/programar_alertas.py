from django.core.management.base import BaseCommand
from django.utils import timezone
from django_q.models import Schedule

NOMBRE_TAREA = "enviar_avisos_pendientes_habitsquad"


class Command(BaseCommand):
    help = (
        "Registra el envío de avisos Web Push cada minuto (hora_aviso, Europe/Madrid)."
    )

    def handle(self, *args, **options):
        Schedule.objects.get_or_create(
            name=NOMBRE_TAREA,
            defaults={
                "func": "alertas.tasks.enviar_avisos_pendientes",
                "schedule_type": Schedule.MINUTES,
                "minutes": 1,
                "next_run": timezone.now(),
                "repeats": -1,
                "cluster": "habitsquad",
            },
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Avisos Web Push programados cada minuto "
                "(Europe/Madrid, cluster habitsquad)."
            )
        )
