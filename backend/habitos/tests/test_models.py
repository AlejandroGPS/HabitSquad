from datetime import date

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from usuarios.models import CustomUser


@pytest.fixture
def creator(db):
    return CustomUser.objects.create_user(
        email="creador@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def member(db):
    return CustomUser.objects.create_user(
        email="miembro@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def escuadron(creator):
    return Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creator,
        codigo_invitacion="X8K9QL",
    )


@pytest.fixture
def membership(escuadron, member):
    return Membresia.objects.create(
        escuadron=escuadron,
        usuario=member,
        es_administrador=False,
    )


@pytest.mark.django_db
def test_habito_diario_persists_option_and_custom_text(membership):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.OTRO,
        texto_personalizado="Leer 20 páginas",
    )

    assert habit.membresia == membership
    assert habit.opcion == "otro"
    assert habit.texto_personalizado == "Leer 20 páginas"
    assert habit.creado_en is not None
    assert habit.actualizado_en is not None


@pytest.mark.django_db
def test_habito_diario_allows_empty_custom_text_for_predefined_option(membership):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.LEER,
    )

    assert habit.texto_personalizado == ""


@pytest.mark.django_db
def test_habito_diario_requires_custom_text_for_other_option(membership):
    habit = HabitoDiario(
        membresia=membership,
        opcion=HabitoDiario.Opcion.OTRO,
        texto_personalizado="  ",
    )

    with pytest.raises(ValidationError, match="obligatorio"):
        habit.full_clean()


@pytest.mark.django_db
def test_habito_diario_is_unique_per_membership(membership):
    HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.LEER,
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        HabitoDiario.objects.create(
            membresia=membership,
            opcion=HabitoDiario.Opcion.ESTUDIAR,
        )


@pytest.mark.django_db
def test_user_can_have_different_habits_in_different_squadrons(
    creator,
    member,
):
    first_squad = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creator,
        codigo_invitacion="X8K9QL",
    )
    second_squad = Escuadron.objects.create(
        nombre="Lectores",
        creador=creator,
        codigo_invitacion="A1B2C3",
    )
    first_membership = Membresia.objects.create(
        escuadron=first_squad,
        usuario=member,
    )
    second_membership = Membresia.objects.create(
        escuadron=second_squad,
        usuario=member,
    )

    HabitoDiario.objects.create(
        membresia=first_membership,
        opcion=HabitoDiario.Opcion.GIMNASIO,
    )
    HabitoDiario.objects.create(
        membresia=second_membership,
        opcion=HabitoDiario.Opcion.OTRO,
        texto_personalizado="Leer 20 páginas",
    )

    assert HabitoDiario.objects.filter(membresia__usuario=member).count() == 2


@pytest.mark.django_db
def test_deleting_membership_deletes_its_habit(membership):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.LEER,
    )

    membership.delete()

    assert not HabitoDiario.objects.filter(pk=habit.pk).exists()


@pytest.mark.django_db
def test_habito_diario_string_representation(membership):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.LEER,
    )

    assert str(habit) == "miembro@example.com - Madrugadores"


@pytest.mark.django_db
def test_registro_diario_is_unique_per_habit_and_date(membership):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.LEER,
    )
    RegistroDiario.objects.create(
        habito=habit,
        cloudinary_public_id="pruebas/uno",
        fecha=date(2026, 11, 7),
        estado=RegistroDiario.Estado.PENDIENTE,
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        RegistroDiario.objects.create(
            habito=habit,
            cloudinary_public_id="pruebas/dos",
            fecha=date(2026, 11, 7),
            estado=RegistroDiario.Estado.PENDIENTE,
        )
