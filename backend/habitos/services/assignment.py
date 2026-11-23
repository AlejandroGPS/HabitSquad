from escuadrones.models import Membresia
from escuadrones.tiempo_real.events import programar_actualizacion_panel
from habitos.models import HabitoDiario


class MembershipNotFoundError(Exception):
    """El usuario no pertenece al escuadrón indicado."""


def get_membership(*, escuadron_id: int, usuario) -> Membresia:
    try:
        return Membresia.objects.get(
            escuadron_id=escuadron_id,
            usuario=usuario,
        )
    except Membresia.DoesNotExist as error:
        raise MembershipNotFoundError from error


def get_habito_diario(membresia: Membresia) -> HabitoDiario | None:
    try:
        return HabitoDiario.objects.get(membresia=membresia)
    except HabitoDiario.DoesNotExist:
        return None


def save_habito_diario(
    *,
    membresia: Membresia,
    validated_data: dict,
) -> HabitoDiario:
    habit, _ = HabitoDiario.objects.update_or_create(
        membresia=membresia,
        defaults=validated_data,
    )
    programar_actualizacion_panel(
        escuadron_id=membresia.escuadron_id,
        motivo="habito_actualizado",
    )
    return habit
