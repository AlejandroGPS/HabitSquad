from datetime import timedelta

import pytest
from django.utils import timezone

from escuadrones.detalle.services import ResumenEscuadron, lunes_de
from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
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
    RegistroDiario.objects.create(
        habito=membresia.habito_diario,
        fecha=dia,
        estado=estado,
        cloudinary_public_id=f"pruebas/{membresia.pk}-{dia}",
    )


def resumen(escuadron):
    return ResumenEscuadron(escuadron, escuadron.membresias.all(), hoy=HOY)


@pytest.mark.django_db
def test_racha_cuenta_los_dias_seguidos_en_que_cumplen_todos(escuadron):
    ana = unir(escuadron, "ana@example.com")
    luis = unir(escuadron, "luis@example.com")
    for dias in (1, 2, 3):
        prueba(ana, hace(dias))
        prueba(luis, hace(dias))
    prueba(ana, hace(4))

    assert resumen(escuadron).racha == 3


@pytest.mark.parametrize(
    ("estados_hoy", "racha"),
    [
        ((CUMPLIDO, CUMPLIDO), 2),
        ((CUMPLIDO, PENDIENTE), 1),
        ((CUMPLIDO, None), 1),
        ((CUMPLIDO, NO_CUMPLIDO), 0),
    ],
)
@pytest.mark.django_db
def test_hoy_suma_si_esta_cumplido_y_solo_rompe_con_no_cumplido(
    escuadron, estados_hoy, racha
):
    miembros = [unir(escuadron, "ana@example.com"), unir(escuadron, "luis@example.com")]
    for membresia, estado in zip(miembros, estados_hoy, strict=True):
        prueba(membresia, hace(1))
        if estado:
            prueba(membresia, HOY, estado)

    assert resumen(escuadron).racha == racha


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
    assert resumen(escuadron).racha == 3


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

    assert resumen(escuadron).racha == 2


@pytest.mark.django_db
def test_semana_da_el_estado_de_cada_dia_de_lunes_a_domingo(escuadron):
    ana = unir(escuadron, "ana@example.com")
    lunes = lunes_de(HOY)
    prueba(ana, lunes - timedelta(days=1))
    prueba(ana, HOY, PENDIENTE)
    if lunes < HOY:
        prueba(ana, lunes, NO_CUMPLIDO)

    semana = resumen(escuadron).semana(ana)

    assert [dia["fecha"] for dia in semana] == [
        lunes + timedelta(days=indice) for indice in range(7)
    ]
    estados = {dia["fecha"]: dia["estado"] for dia in semana}
    assert estados[HOY] == PENDIENTE
    if lunes < HOY:
        assert estados[lunes] == NO_CUMPLIDO
    assert all(
        estado is None for fecha, estado in estados.items() if fecha not in (HOY, lunes)
    )
