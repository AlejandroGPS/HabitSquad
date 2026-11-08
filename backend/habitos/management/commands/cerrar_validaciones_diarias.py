from datetime import date

from django.core.management.base import BaseCommand, CommandError

from habitos.validacion.services.closing import cerrar_pruebas_pendientes


class Command(BaseCommand):
    help = (
        "Cierra las pruebas de foto pendientes del día (Europe/Madrid): "
        "cumplido si hay mayoría de «sí»; si no, no_cumplido."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--fecha",
            type=str,
            default=None,
            help=(
                "Fecha a cerrar en formato YYYY-MM-DD. "
                "Por defecto, el día calendario actual en Europe/Madrid."
            ),
        )

    def handle(self, *args, **options):
        fecha_raw = options["fecha"]
        fecha = None
        if fecha_raw is not None:
            try:
                fecha = date.fromisoformat(fecha_raw)
            except ValueError as error:
                raise CommandError(
                    "La fecha debe tener el formato YYYY-MM-DD."
                ) from error

        cerrados = cerrar_pruebas_pendientes(fecha=fecha)
        dia = fecha if fecha is not None else "hoy (Europe/Madrid)"
        self.stdout.write(
            self.style.SUCCESS(
                f"Cierre diario completado para {dia}: {cerrados} registro(s) "
                "actualizado(s)."
            )
        )
