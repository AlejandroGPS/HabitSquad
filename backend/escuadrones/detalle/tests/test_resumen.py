from datetime import date, timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from escuadrones.detalle.services import ResumenEscuadron, lunes_de
from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario, VotoValidacion
from habitos.validacion.tasks import cerrar_jornadas_pendientes
from usuarios.models import CustomUser

CUMPLIDO = RegistroDiario.Estado.CUMPLIDO
NO_CUMPLIDO = RegistroDiario.Estado.NO_CUMPLIDO
PENDIENTE = RegistroDiario.Estado.PENDIENTE

HOY = timezone.localdate()


def hace(dias):
    return HOY - timedelta(days=dias)


@pytest.fixture
def escuadron(db):
    creador = CustomUser.objects.create_user(
        email="creador@example.com",
        password="S0mething!Secure-497",
    )
    escuadron = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creador,
        codigo_invitacion="X8K9QL",
    )
    Escuadron.objects.filter(pk=escuadron.pk).update(
        creado_en=timezone.now() - timedelta(days=30)
    )
    escuadron.refresh_from_db()
    return escuadron


def unir(escuadron, email, dias_atras=30):
    usuario = CustomUser.objects.create_user(
        email=email,
        password="S0mething!Secure-497",
    )
    membresia = Membresia.objects.create(escuadron=escuadron, usuario=usuario)
    Membresia.objects.filter(pk=membresia.pk).update(
        unido_en=timezone.now() - timedelta(days=dias_atras)
    )
    membresia.refresh_from_db()
    HabitoDiario.objects.create(membresia=membresia, opcion=HabitoDiario.Opcion.LEER)
    return membresia


def prueba(membresia, dia, estado=CUMPLIDO):
    return RegistroDiario.objects.create(
        habito=membresia.habito_diario,
        fecha=dia,
        estado=estado,
        cloudinary_public_id=f"pruebas/{membresia.pk}-{dia}",
    )


def resumen(escuadron):
    return ResumenEscuadron(escuadron, escuadron.membresias.all(), hoy=HOY)


def preparar_racha_y_cierre(escuadron, *, marcar_fallo=False):
    miembros = [
        unir(escuadron, "ana@example.com"),
        unir(escuadron, "luis@example.com"),
    ]
    for dias_atras in (2, 3, 4):
        for miembro in miembros:
            prueba(miembro, hace(dias_atras))

    registros_ayer = []
    for indice, miembro in enumerate(miembros):
        registro = prueba(miembro, hace(1), PENDIENTE)
        votante = miembros[1 - indice].usuario
        voto = (
            VotoValidacion.Valor.NO
            if marcar_fallo and indice == 1
            else VotoValidacion.Valor.SI
        )
        VotoValidacion.objects.create(registro=registro, usuario=votante, voto=voto)
        registros_ayer.append(registro)
    return miembros, registros_ayer


@pytest.mark.django_db
def test_racha_cuenta_los_dias_seguidos_en_que_cumplen_todos(escuadron):
    ana = unir(escuadron, "ana@example.com")
    luis = unir(escuadron, "luis@example.com")
    for dias in (1, 2, 3):
        prueba(ana, hace(dias))
        prueba(luis, hace(dias))
    prueba(ana, hace(4))

    assert resumen(escuadron).racha == 3


@pytest.mark.django_db
def test_cierre_de_ayer_incrementa_la_racha_de_n_a_n_mas_uno(escuadron):
    miembros, registros_ayer = preparar_racha_y_cierre(escuadron)
    ayer = hace(1)
    racha_antes_del_cierre = ResumenEscuadron(
        escuadron,
        escuadron.membresias.all(),
        hoy=ayer,
    ).racha

    with (
        patch("habitos.validacion.tasks.timezone.localdate", return_value=HOY),
        patch("habitos.validacion.tasks.programar_actualizacion_panel") as publicar,
    ):
        cerrados = cerrar_jornadas_pendientes()

    for registro in registros_ayer:
        registro.refresh_from_db()
    assert racha_antes_del_cierre == 3
    assert cerrados == len(miembros)
    assert all(
        registro.estado == RegistroDiario.Estado.CUMPLIDO for registro in registros_ayer
    )
    assert resumen(escuadron).racha == 4
    publicar.assert_called_once_with(
        escuadron_id=escuadron.pk,
        motivo="cierre_diario",
    )


@pytest.mark.django_db
def test_cierre_de_ayer_reinicia_la_racha_si_un_miembro_no_cumplio(escuadron):
    miembros, registros_ayer = preparar_racha_y_cierre(
        escuadron,
        marcar_fallo=True,
    )
    ayer = hace(1)
    racha_antes_del_cierre = ResumenEscuadron(
        escuadron,
        escuadron.membresias.all(),
        hoy=ayer,
    ).racha

    with (
        patch("habitos.validacion.tasks.timezone.localdate", return_value=HOY),
        patch("habitos.validacion.tasks.programar_actualizacion_panel"),
    ):
        cerrados = cerrar_jornadas_pendientes()

    for registro in registros_ayer:
        registro.refresh_from_db()
    assert racha_antes_del_cierre == 3
    assert cerrados == len(miembros)
    assert registros_ayer[0].estado == RegistroDiario.Estado.CUMPLIDO
    assert registros_ayer[1].estado == RegistroDiario.Estado.NO_CUMPLIDO
    assert resumen(escuadron).racha == 0


@pytest.mark.parametrize(
    "estados_hoy",
    [
        (CUMPLIDO, CUMPLIDO),
        (CUMPLIDO, PENDIENTE),
        (CUMPLIDO, None),
        (CUMPLIDO, NO_CUMPLIDO),
    ],
)
@pytest.mark.django_db
def test_racha_solo_cuenta_jornadas_anteriores_a_hoy(escuadron, estados_hoy):
    miembros = [unir(escuadron, "ana@example.com"), unir(escuadron, "luis@example.com")]
    for membresia, estado in zip(miembros, estados_hoy, strict=True):
        prueba(membresia, hace(1))
        if estado:
            prueba(membresia, HOY, estado)

    assert resumen(escuadron).racha == 1


@pytest.mark.parametrize("estado", [PENDIENTE, NO_CUMPLIDO, None])
@pytest.mark.django_db
def test_un_dia_pasado_sin_cumplir_corta_la_racha(escuadron, estado):
    ana = unir(escuadron, "ana@example.com")
    luis = unir(escuadron, "luis@example.com")
    prueba(ana, hace(1))
    prueba(luis, hace(1))
    prueba(ana, hace(2))
    if estado:
        prueba(luis, hace(2), estado)
    prueba(ana, hace(3))
    prueba(luis, hace(3))

    assert resumen(escuadron).racha == 1


@pytest.mark.django_db
def test_quien_se_une_un_dia_empieza_a_contar_al_siguiente(escuadron):
    ana = unir(escuadron, "ana@example.com")
    nuevo = unir(escuadron, "nuevo@example.com", dias_atras=1)
    prueba(ana, hace(2))
    prueba(ana, hace(1))
    prueba(ana, HOY)

    assert resumen(escuadron).estado_del_dia(hace(1)) == CUMPLIDO
    assert resumen(escuadron).estado_del_dia(HOY) == PENDIENTE
    assert resumen(escuadron).racha == 2

    prueba(nuevo, HOY)
    assert resumen(escuadron).racha == 2


@pytest.mark.django_db
def test_un_escuadron_recien_creado_empieza_con_racha_cero(escuadron):
    Escuadron.objects.filter(pk=escuadron.pk).update(creado_en=timezone.now())
    escuadron.refresh_from_db()
    ana = unir(escuadron, "ana@example.com", dias_atras=0)
    prueba(ana, HOY)

    assert resumen(escuadron).estado_del_dia(HOY) is None
    assert resumen(escuadron).racha == 0


@pytest.mark.django_db
def test_la_racha_no_cuenta_dias_en_que_aun_no_habia_miembros(escuadron):
    ana = unir(escuadron, "ana@example.com", dias_atras=2)
    for dias in range(5):
        prueba(ana, hace(dias))

    assert resumen(escuadron).racha == 1


@pytest.mark.django_db
@pytest.mark.parametrize(
    "hoy", [date(2026, 11, 23), date(2026, 11, 25)], ids=["lunes", "miercoles"]
)
def test_semana_da_el_estado_de_cada_dia_de_lunes_a_domingo(escuadron, hoy):
    ana = unir(escuadron, "ana@example.com")
    lunes = lunes_de(hoy)
    prueba(ana, lunes - timedelta(days=1))
    prueba(ana, hoy, PENDIENTE)
    if lunes < hoy:
        prueba(ana, lunes, NO_CUMPLIDO)

    semana = ResumenEscuadron(escuadron, [ana], hoy=hoy).semana(ana)

    assert [dia["fecha"] for dia in semana] == [
        lunes + timedelta(days=indice) for indice in range(7)
    ]
    estados = {dia["fecha"]: dia["estado"] for dia in semana}
    assert estados[hoy] == PENDIENTE
    if lunes < hoy:
        assert estados[lunes] == NO_CUMPLIDO
    assert all(
        estado is None for fecha, estado in estados.items() if fecha not in (hoy, lunes)
    )
