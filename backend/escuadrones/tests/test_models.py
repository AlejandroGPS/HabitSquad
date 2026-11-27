import pytest
from django.db import IntegrityError, transaction

from escuadrones.models import Escuadron, Membresia
from usuarios.models import CustomUser


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="miembro@example.com",
        password="S0mething!Secure-497",
    )


@pytest.mark.django_db
def test_escuadron_string_representation(user):
    escuadron = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=user,
        codigo_invitacion="X8K9QL",
    )

    assert str(escuadron) == "Madrugadores"
    assert escuadron.es_publico is False
    assert escuadron.limite_miembros == 5


@pytest.mark.django_db
def test_escuadron_limit_cannot_be_lower_than_two(user):
    with transaction.atomic(), pytest.raises(IntegrityError):
        Escuadron.objects.create(
            nombre="Madrugadores",
            creador=user,
            codigo_invitacion="X8K9QL",
            limite_miembros=1,
        )


@pytest.mark.django_db
def test_membresia_string_representation(user):
    escuadron = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=user,
        codigo_invitacion="X8K9QL",
    )
    admin = Membresia.objects.create(
        escuadron=escuadron,
        usuario=user,
        es_administrador=True,
    )
    other = CustomUser.objects.create_user(
        email="otro@example.com",
        password="S0mething!Secure-497",
    )
    miembro = Membresia.objects.create(
        escuadron=escuadron,
        usuario=other,
        es_administrador=False,
    )

    assert str(admin) == f"{user} (administrador) en {escuadron}"
    assert str(miembro) == f"{other} (miembro) en {escuadron}"
