from datetime import date

import pytest
from django.db import IntegrityError, transaction

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario, VotoValidacion
from usuarios.models import CustomUser


@pytest.fixture
def author(db):
    return CustomUser.objects.create_user(
        email="autor-voto@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def voter(db):
    return CustomUser.objects.create_user(
        email="votante@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def registro(author, voter):
    squad = Escuadron.objects.create(
        nombre="Validadores",
        creador=author,
        codigo_invitacion="VT0MD1",
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=author,
        es_administrador=True,
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=voter,
        es_administrador=False,
    )
    habit = HabitoDiario.objects.create(
        membresia=Membresia.objects.get(escuadron=squad, usuario=author),
        opcion=HabitoDiario.Opcion.LEER,
    )
    return RegistroDiario.objects.create(
        habito=habit,
        cloudinary_public_id="pruebas/voto-modelo",
        fecha=date(2026, 11, 8),
        estado=RegistroDiario.Estado.PENDIENTE,
    )


@pytest.mark.django_db
def test_voto_validacion_is_unique_per_registro_and_usuario(registro, voter):
    VotoValidacion.objects.create(
        registro=registro,
        usuario=voter,
        voto=VotoValidacion.Valor.SI,
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        VotoValidacion.objects.create(
            registro=registro,
            usuario=voter,
            voto=VotoValidacion.Valor.NO,
        )


@pytest.mark.django_db
def test_voto_validacion_string_representation(registro, voter):
    voto = VotoValidacion.objects.create(
        registro=registro,
        usuario=voter,
        voto=VotoValidacion.Valor.SI,
    )

    assert str(voto) == f"{voter.pk} → {registro.pk}: sí"
