from datetime import date
from unittest.mock import patch

import pytest
from django.db import IntegrityError

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario, VotoValidacion
from habitos.validacion.services import (
    AutovotoError,
    PruebaCerradaError,
    VotoDuplicadoError,
    VotoInvalidoError,
    cerrar_pruebas_pendientes,
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
    """Escuadrón de 4 miembros → 3 elegibles; mayoría con 2 sí."""
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


def _habit_for(squad, usuario, opcion=HabitoDiario.Opcion.LEER):
    return HabitoDiario.objects.create(
        membresia=Membresia.objects.get(escuadron=squad, usuario=usuario),
        opcion=opcion,
        texto_personalizado="x" if opcion == HabitoDiario.Opcion.OTRO else "",
    )


@pytest.mark.django_db
def test_cerrar_pruebas_pendientes_sin_mayoria_pasa_a_no_cumplido(author, voters):
    squad = Escuadron.objects.create(
        nombre="Cierre Sin Mayoria",
        creador=author,
        codigo_invitacion="CL0SE1",
    )
    for usuario, admin in [
        (author, True),
        (voters[0], False),
        (voters[1], False),
        (voters[2], False),
    ]:
        Membresia.objects.create(
            escuadron=squad,
            usuario=usuario,
            es_administrador=admin,
        )
    dia = date(2026, 11, 8)
    r_sin = RegistroDiario.objects.create(
        habito=_habit_for(squad, author),
        cloudinary_public_id="pruebas/cierre-sin",
        fecha=dia,
        estado=RegistroDiario.Estado.PENDIENTE,
    )

    cerrados = cerrar_pruebas_pendientes(fecha=dia)

    r_sin.refresh_from_db()
    assert cerrados == 1
    assert r_sin.estado == RegistroDiario.Estado.NO_CUMPLIDO


@pytest.mark.django_db
def test_cerrar_pruebas_pendientes_con_mayoria_pasa_a_cumplido(author, voters):
    squad = Escuadron.objects.create(
        nombre="Cierre Con Mayoria",
        creador=author,
        codigo_invitacion="CL0SE2",
    )
    for usuario, admin in [
        (author, True),
        (voters[0], False),
        (voters[1], False),
        (voters[2], False),
    ]:
        Membresia.objects.create(
            escuadron=squad,
            usuario=usuario,
            es_administrador=admin,
        )
    dia = date(2026, 11, 8)
    # Autor de la prueba = voters[0]; elegibles = 3; 2 sí → mayoría
    r_may = RegistroDiario.objects.create(
        habito=_habit_for(squad, voters[0], HabitoDiario.Opcion.GIMNASIO),
        cloudinary_public_id="pruebas/cierre-may",
        fecha=dia,
        estado=RegistroDiario.Estado.PENDIENTE,
    )
    VotoValidacion.objects.create(
        registro=r_may,
        usuario=author,
        voto=VotoValidacion.Valor.SI,
    )
    VotoValidacion.objects.create(
        registro=r_may,
        usuario=voters[1],
        voto=VotoValidacion.Valor.SI,
    )

    cerrados = cerrar_pruebas_pendientes(fecha=dia)

    r_may.refresh_from_db()
    assert cerrados == 1
    assert r_may.estado == RegistroDiario.Estado.CUMPLIDO


@pytest.mark.django_db
def test_cerrar_pruebas_pendientes_no_toca_otra_fecha_ni_cerrados(author, voters):
    squad = Escuadron.objects.create(
        nombre="Cierre Selectivo",
        creador=author,
        codigo_invitacion="CL0SE3",
    )
    for usuario, admin in [
        (author, True),
        (voters[0], False),
        (voters[1], False),
        (voters[2], False),
    ]:
        Membresia.objects.create(
            escuadron=squad,
            usuario=usuario,
            es_administrador=admin,
        )
    dia = date(2026, 11, 8)
    otra = date(2026, 11, 7)
    r_dia = RegistroDiario.objects.create(
        habito=_habit_for(squad, author),
        cloudinary_public_id="pruebas/cierre-dia",
        fecha=dia,
        estado=RegistroDiario.Estado.PENDIENTE,
    )
    r_otra = RegistroDiario.objects.create(
        habito=_habit_for(squad, voters[0], HabitoDiario.Opcion.GIMNASIO),
        cloudinary_public_id="pruebas/cierre-otra",
        fecha=otra,
        estado=RegistroDiario.Estado.PENDIENTE,
    )
    r_cerr = RegistroDiario.objects.create(
        habito=_habit_for(squad, voters[1], HabitoDiario.Opcion.ESTUDIAR),
        cloudinary_public_id="pruebas/cierre-cerr",
        fecha=dia,
        estado=RegistroDiario.Estado.CUMPLIDO,
    )

    cerrados = cerrar_pruebas_pendientes(fecha=dia)

    r_dia.refresh_from_db()
    r_otra.refresh_from_db()
    r_cerr.refresh_from_db()
    assert cerrados == 1
    assert r_dia.estado == RegistroDiario.Estado.NO_CUMPLIDO
    assert r_otra.estado == RegistroDiario.Estado.PENDIENTE
    assert r_cerr.estado == RegistroDiario.Estado.CUMPLIDO


@pytest.mark.django_db
def test_cerrar_pruebas_pendientes_usa_localdate_si_no_hay_fecha(author, voters):
    squad = Escuadron.objects.create(
        nombre="Cierre Hoy",
        creador=author,
        codigo_invitacion="CL0SE4",
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=author,
        es_administrador=True,
    )
    hoy = date(2026, 12, 1)
    registro = RegistroDiario.objects.create(
        habito=_habit_for(squad, author),
        cloudinary_public_id="pruebas/cierre-hoy",
        fecha=hoy,
        estado=RegistroDiario.Estado.PENDIENTE,
    )

    with patch(
        "habitos.validacion.services.closing.timezone.localdate",
        return_value=hoy,
    ):
        cerrados = cerrar_pruebas_pendientes()

    registro.refresh_from_db()
    assert cerrados == 1
    assert registro.estado == RegistroDiario.Estado.NO_CUMPLIDO
