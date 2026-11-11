from datetime import date, timedelta

from django.utils import timezone

from habitos.models import RegistroDiario

CUMPLIDO = RegistroDiario.Estado.CUMPLIDO
NO_CUMPLIDO = RegistroDiario.Estado.NO_CUMPLIDO
PENDIENTE = RegistroDiario.Estado.PENDIENTE


def lunes_de(dia: date) -> date:
    return dia - timedelta(days=dia.weekday())


class ResumenEscuadron:
    """
    Racha del escuadrón y estado de cada miembro en la semana actual.

    Un día cuenta para la racha si todos los miembros que ya estaban en el
    escuadrón antes de ese día tienen su prueba cumplida. Quien se une un día
    empieza a contar al siguiente. Hoy sigue abierto hasta las 23:59: suma si
    ya está cumplido y solo rompe la racha si alguna prueba ya es no_cumplido.
    """

    def __init__(self, escuadron, membresias, hoy: date | None = None):
        self.membresias = list(membresias)
        self.hoy = hoy or timezone.localdate()
        self.lunes = lunes_de(self.hoy)
        desde = min(self.lunes, timezone.localdate(escuadron.creado_en))
        self.estados = {
            (membresia_id, fecha): estado
            for membresia_id, fecha, estado in RegistroDiario.objects.filter(
                habito__membresia__escuadron=escuadron,
                fecha__gte=desde,
                fecha__lte=self.hoy,
            ).values_list("habito__membresia_id", "fecha", "estado")
        }

    def estado_del_dia(self, dia: date) -> str | None:
        elegibles = [
            membresia
            for membresia in self.membresias
            if timezone.localdate(membresia.unido_en) < dia
        ]
        if not elegibles:
            return None
        estados = [self.estados.get((membresia.pk, dia)) for membresia in elegibles]
        if all(estado == CUMPLIDO for estado in estados):
            return CUMPLIDO
        if dia == self.hoy and NO_CUMPLIDO not in estados:
            return PENDIENTE
        return NO_CUMPLIDO

    @property
    def racha(self) -> int:
        estado_hoy = self.estado_del_dia(self.hoy)
        if estado_hoy == NO_CUMPLIDO:
            return 0
        racha = 1 if estado_hoy == CUMPLIDO else 0
        dia = self.hoy - timedelta(days=1)
        while self.estado_del_dia(dia) == CUMPLIDO:
            racha += 1
            dia -= timedelta(days=1)
        return racha

    def semana(self, membresia) -> list[dict]:
        dias = (self.lunes + timedelta(days=indice) for indice in range(7))
        return [
            {"fecha": dia, "estado": self.estados.get((membresia.pk, dia))}
            for dia in dias
        ]
