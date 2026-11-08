from datetime import date
from unittest.mock import patch

import pytest
from django.db import IntegrityError

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from habitos.validacion.services import (
    AutovotoError,
    PruebaCerradaError,
    VotoDuplicadoError,
    VotoInvalidoError,
    emitir_voto,
    obtener_estado_votacion,
)
from habitos.validacion.services.voting import mayoria_alcanzada
from usuarios.models import CustomUser


@pytest.fixture
def author(db):
    return CustomUser.objects.create_user(
        email="autor-svc@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def voters(db):
    return [
        CustomUser.objects.create_user(
            email=f"votante-svc-{i}@example.com",
            password="S0mething!Secure-497",
        )
        for i in range(3)
    ]


@pytest.fixture
def registro(author, voters):
    """Escuadrón de 4 miembros → 3 elegibles; mayoría con 2 «sí»."""
    squad = Escuadron.objects.create(
        nombre="Servicio Votos",
        creador=author,
        codigo_invitacion="SV0T01",
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=author,
        es_administrador=True,
    )
    for voter in voters:
        Membresia.objects.create(
            escuadron=squad,
            usuario=voter,
            es_administrador=False,
        )
    habit = HabitoDiario.objects.create(
        membresia=Membresia.objects.get(escuadron=squad, usuario=author),
        opcion=HabitoDiario.Opcion.LEER,
    )
    return RegistroDiario.objects.select_related("habito__membresia").get(
        pk=RegistroDiario.objects.create(
            habito=habit,
            cloudinary_public_id="pruebas/voto-svc",
            fecha=date(2026, 11, 8),
            estado=RegistroDiario.Estado.PENDIENTE,
        ).pk
    )


@pytest.mark.django_db
def test_obtener_estado_votacion_sin_votos(registro, voters):
    estado = obtener_estado_votacion(registro=registro, usuario=voters[0])

    assert estado["registro_id"] == registro.pk
    assert estado["estado"] == RegistroDiario.Estado.PENDIENTE
    assert estado["votos_si"] == 0
    assert estado["votantes_elegibles"] == 3
    assert estado["votos_emitidos"] == 0
    assert estado["mayoria_alcanzada"] is False
    assert estado["voto_propio"] is None
    assert estado["votos"] == []


@pytest.mark.django_db
def test_emitir_voto_si_actualiza_recuento(registro, voters):
    estado = emitir_voto(registro=registro, usuario=voters[0], voto="sí")

    assert estado["votos_si"] == 1
    assert estado["votos_emitidos"] == 1
    assert estado["votantes_elegibles"] == 3
    assert estado["mayoria_alcanzada"] is False
    assert estado["voto_propio"] == "sí"
    assert estado["estado"] == RegistroDiario.Estado.PENDIENTE
    assert estado["votos"] == [{"usuario_id": voters[0].pk, "voto": "sí"}]


@pytest.mark.django_db
def test_emitir_voto_no_no_cuenta_como_si(registro, voters):
    estado = emitir_voto(registro=registro, usuario=voters[0], voto="no")

    assert estado["votos_si"] == 0
    assert estado["votos_emitidos"] == 1
    assert estado["voto_propio"] == "no"
    assert estado["mayoria_alcanzada"] is False
    assert estado["estado"] == RegistroDiario.Estado.PENDIENTE


@pytest.mark.django_db
def test_emitir_voto_mayoria_pasa_a_cumplido(registro, voters):
    emitir_voto(registro=registro, usuario=voters[0], voto="sí")
    estado = emitir_voto(registro=registro, usuario=voters[1], voto="sí")

    assert estado["votos_si"] == 2
    assert estado["votantes_elegibles"] == 3
    assert estado["mayoria_alcanzada"] is True
    assert estado["estado"] == RegistroDiario.Estado.CUMPLIDO
    registro.refresh_from_db()
    assert registro.estado == RegistroDiario.Estado.CUMPLIDO


def test_mayoria_alcanzada_umbral_simple():
    assert mayoria_alcanzada(votos_si=2, votantes_elegibles=3) is True
    assert mayoria_alcanzada(votos_si=1, votantes_elegibles=3) is False


@pytest.mark.django_db
def test_emitir_voto_rechaza_autovoto(registro, author):
    with pytest.raises(AutovotoError, match="propia prueba"):
        emitir_voto(registro=registro, usuario=author, voto="sí")


@pytest.mark.django_db
def test_emitir_voto_rechaza_duplicado(registro, voters):
    emitir_voto(registro=registro, usuario=voters[0], voto="sí")

    with pytest.raises(VotoDuplicadoError, match="Ya has emitido"):
        emitir_voto(registro=registro, usuario=voters[0], voto="no")


@pytest.mark.django_db
def test_emitir_voto_rechaza_invalido(registro, voters):
    with pytest.raises(VotoInvalidoError, match="sí"):
        emitir_voto(registro=registro, usuario=voters[0], voto="maybe")


@pytest.mark.django_db
def test_emitir_voto_rechaza_prueba_cerrada(registro, voters):
    registro.estado = RegistroDiario.Estado.CUMPLIDO
    registro.save(update_fields=["estado", "actualizado_en"])

    with pytest.raises(PruebaCerradaError, match="cerrada"):
        emitir_voto(registro=registro, usuario=voters[0], voto="sí")


@pytest.mark.django_db
def test_emitir_voto_integrity_error_se_mapea_a_duplicado(registro, voters):
    with (
        patch(
            "habitos.validacion.services.voting.VotoValidacion.objects.create",
            side_effect=IntegrityError("duplicate"),
        ),
        pytest.raises(VotoDuplicadoError, match="Ya has emitido"),
    ):
        emitir_voto(registro=registro, usuario=voters[0], voto="sí")


@pytest.mark.django_db
def test_obtener_estado_votacion_con_voto_propio(registro, voters):
    emitir_voto(registro=registro, usuario=voters[0], voto="no")
    estado = obtener_estado_votacion(registro=registro, usuario=voters[0])

    assert estado["voto_propio"] == "no"
    assert estado["votos_emitidos"] == 1
