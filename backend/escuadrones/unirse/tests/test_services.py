from unittest.mock import patch

import pytest
from django.db import IntegrityError

from escuadrones.models import Escuadron, Membresia
from escuadrones.unirse.services.join import (
    AlreadyMemberError,
    PrivateSquadError,
    SquadronFullError,
    SquadronNotFoundError,
    normalize_invitation_code,
    unirse_escuadron,
    unirse_escuadron_publico,
)
from usuarios.models import CustomUser


@pytest.fixture
def creator(db):
    return CustomUser.objects.create_user(
        email="creador@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def joiner(db):
    return CustomUser.objects.create_user(
        email="miembro@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def escuadron(creator):
    escuadron = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creator,
        codigo_invitacion="X8K9QL",
    )
    Membresia.objects.create(
        escuadron=escuadron,
        usuario=creator,
        es_administrador=True,
    )
    return escuadron


def test_normalize_invitation_code_strips_and_uppercases():
    assert normalize_invitation_code("  x8k9ql  ") == "X8K9QL"


@pytest.mark.django_db
def test_unirse_escuadron_adds_non_admin_member(escuadron, joiner):
    result = unirse_escuadron(codigo_invitacion="x8k9ql", usuario=joiner)

    assert result.pk == escuadron.pk
    membresia = Membresia.objects.get(escuadron=escuadron, usuario=joiner)
    assert membresia.es_administrador is False


@pytest.mark.django_db
def test_unirse_escuadron_raises_when_code_unknown(joiner):
    with pytest.raises(
        SquadronNotFoundError,
        match="No se ha encontrado un escuadrón con ese código",
    ):
        unirse_escuadron(codigo_invitacion="ZZZZZZ", usuario=joiner)

    assert Membresia.objects.filter(usuario=joiner).count() == 0


@pytest.mark.django_db
def test_unirse_escuadron_raises_when_already_member(escuadron, joiner):
    unirse_escuadron(codigo_invitacion="X8K9QL", usuario=joiner)

    with pytest.raises(AlreadyMemberError, match="Ya perteneces a este escuadrón"):
        unirse_escuadron(codigo_invitacion="X8K9QL", usuario=joiner)

    assert Membresia.objects.filter(escuadron=escuadron, usuario=joiner).count() == 1


@pytest.mark.django_db
def test_unirse_escuadron_maps_integrity_error_to_already_member(escuadron, joiner):
    with (
        patch(
            "escuadrones.unirse.services.join.Membresia.objects.create",
            side_effect=IntegrityError("duplicate"),
        ),
        pytest.raises(AlreadyMemberError, match="Ya perteneces a este escuadrón"),
    ):
        unirse_escuadron(codigo_invitacion="X8K9QL", usuario=joiner)

    assert not Membresia.objects.filter(escuadron=escuadron, usuario=joiner).exists()


@pytest.mark.django_db
def test_unirse_escuadron_rejects_join_when_limit_is_reached(escuadron, joiner):
    for index in range(4):
        user = CustomUser.objects.create_user(
            email=f"miembro{index}@example.com",
            password="S0mething!Secure-497",
        )
        Membresia.objects.create(escuadron=escuadron, usuario=user)

    with pytest.raises(SquadronFullError):
        unirse_escuadron(codigo_invitacion="X8K9QL", usuario=joiner)

    assert Membresia.objects.filter(escuadron=escuadron).count() == 5
    assert not Membresia.objects.filter(escuadron=escuadron, usuario=joiner).exists()


@pytest.mark.django_db
def test_lowering_limit_keeps_existing_members_and_blocks_new_ones(
    escuadron,
    joiner,
):
    current_member = CustomUser.objects.create_user(
        email="actual@example.com",
        password="S0mething!Secure-497",
    )
    Membresia.objects.create(escuadron=escuadron, usuario=current_member)
    escuadron.limite_miembros = 2
    escuadron.save(update_fields=["limite_miembros"])

    with pytest.raises(SquadronFullError):
        unirse_escuadron(codigo_invitacion="X8K9QL", usuario=joiner)

    assert Membresia.objects.filter(escuadron=escuadron).count() == 2
    assert Membresia.objects.filter(
        escuadron=escuadron,
        usuario=current_member,
    ).exists()
    assert not Membresia.objects.filter(escuadron=escuadron, usuario=joiner).exists()


@pytest.mark.django_db
def test_unirse_escuadron_publico_adds_member(escuadron, joiner):
    escuadron.es_publico = True
    escuadron.save(update_fields=["es_publico"])

    result = unirse_escuadron_publico(escuadron_id=escuadron.pk, usuario=joiner)

    assert result.pk == escuadron.pk
    assert Membresia.objects.filter(escuadron=escuadron, usuario=joiner).exists()


@pytest.mark.django_db
def test_unirse_escuadron_publico_rejects_private_squad(escuadron, joiner):
    with pytest.raises(PrivateSquadError):
        unirse_escuadron_publico(escuadron_id=escuadron.pk, usuario=joiner)

    assert Membresia.objects.filter(escuadron=escuadron).count() == 1


@pytest.mark.django_db
def test_unirse_escuadron_publico_raises_when_squad_is_missing(joiner):
    with pytest.raises(SquadronNotFoundError, match="No se ha encontrado"):
        unirse_escuadron_publico(escuadron_id=999, usuario=joiner)
