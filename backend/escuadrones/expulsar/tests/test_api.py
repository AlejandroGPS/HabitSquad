import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario, VotoValidacion
from usuarios.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def creator(db):
    return CustomUser.objects.create_user(
        email="creador-expulsion@example.com",
        password="S0mething!Secure-497",
        nickname="CreadorExpulsion",
    )


@pytest.fixture
def member(db):
    return CustomUser.objects.create_user(
        email="miembro-expulsion@example.com",
        password="S0mething!Secure-497",
        nickname="MiembroExpulsion",
    )


@pytest.fixture
def member2(db):
    return CustomUser.objects.create_user(
        email="miembro2-expulsion@example.com",
        password="S0mething!Secure-497",
        nickname="MiembroExpulsion2",
    )


@pytest.fixture
def outsider(db):
    return CustomUser.objects.create_user(
        email="externo-expulsion@example.com",
        password="S0mething!Secure-497",
        nickname="ExternoExpulsion",
    )


@pytest.fixture
def squad(creator, member, member2):
    squad = Escuadron.objects.create(
        nombre="Escuadron de prueba",
        creador=creator,
        codigo_invitacion="EXPU15",
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=creator,
        es_administrador=True,
    )
    Membresia.objects.create(escuadron=squad, usuario=member)
    Membresia.objects.create(escuadron=squad, usuario=member2)
    return squad


def expulsion_url(squad, usuario):
    return reverse(
        "escuadrones:expulsar-miembro",
        kwargs={"escuadron_id": squad.pk, "usuario_id": usuario.pk},
    )


def panel_url(squad):
    return reverse("escuadrones:detalle-escuadron", args=(squad.pk,))


def authenticated_client(api_client, usuario):
    token = AccessToken.for_user(usuario)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
def test_expulsar_miembro_elimina_membresia_y_datos_y_revoca_acceso(
    api_client,
    creator,
    member,
    member2,
    outsider,
    squad,
):
    membresia_expulsada = Membresia.objects.get(escuadron=squad, usuario=member)
    habito_expulsado = HabitoDiario.objects.create(
        membresia=membresia_expulsada,
        opcion=HabitoDiario.Opcion.LEER,
    )
    registro_expulsado = RegistroDiario.objects.create(
        habito=habito_expulsado,
        fecha=timezone.localdate(),
        cloudinary_public_id="pruebas/miembro-expulsado",
    )
    membresia_creador = Membresia.objects.get(escuadron=squad, usuario=creator)
    habito_creador = HabitoDiario.objects.create(
        membresia=membresia_creador,
        opcion=HabitoDiario.Opcion.ESTUDIAR,
    )
    registro_creador = RegistroDiario.objects.create(
        habito=habito_creador,
        fecha=timezone.localdate(),
        cloudinary_public_id="pruebas/creador",
    )
    voto_recibido = VotoValidacion.objects.create(
        registro=registro_expulsado,
        usuario=creator,
        voto=VotoValidacion.Valor.SI,
    )
    voto_emitido = VotoValidacion.objects.create(
        registro=registro_creador,
        usuario=member,
        voto=VotoValidacion.Valor.NO,
    )

    otro_escuadron = Escuadron.objects.create(
        nombre="Otro escuadron",
        creador=outsider,
        codigo_invitacion="OTR015",
    )
    membresia_otro_creador = Membresia.objects.create(
        escuadron=otro_escuadron,
        usuario=outsider,
        es_administrador=True,
    )
    Membresia.objects.create(escuadron=otro_escuadron, usuario=member)
    otro_habito = HabitoDiario.objects.create(
        membresia=membresia_otro_creador,
        opcion=HabitoDiario.Opcion.LEER,
    )
    otro_registro = RegistroDiario.objects.create(
        habito=otro_habito,
        fecha=timezone.localdate(),
        cloudinary_public_id="pruebas/otro-escuadron",
    )
    voto_otro_escuadron = VotoValidacion.objects.create(
        registro=otro_registro,
        usuario=member,
        voto=VotoValidacion.Valor.SI,
    )

    response = authenticated_client(api_client, creator).delete(
        expulsion_url(squad, member)
    )

    assert response.status_code == 204
    assert not Membresia.objects.filter(pk=membresia_expulsada.pk).exists()
    assert not HabitoDiario.objects.filter(pk=habito_expulsado.pk).exists()
    assert not RegistroDiario.objects.filter(pk=registro_expulsado.pk).exists()
    assert not VotoValidacion.objects.filter(pk=voto_recibido.pk).exists()
    assert not VotoValidacion.objects.filter(pk=voto_emitido.pk).exists()
    assert VotoValidacion.objects.filter(pk=voto_otro_escuadron.pk).exists()

    response_expulsado = authenticated_client(APIClient(), member).get(panel_url(squad))
    assert response_expulsado.status_code == 403

    response_admin = authenticated_client(api_client, creator).get(panel_url(squad))
    assert response_admin.status_code == 200
    assert {item["usuario_id"] for item in response_admin.data["miembros"]} == {
        creator.pk,
        member2.pk,
    }


@pytest.mark.django_db
def test_expulsar_miembro_requiere_autenticacion(api_client, member, squad):
    response = api_client.delete(expulsion_url(squad, member))

    assert response.status_code == 401
    assert Membresia.objects.filter(escuadron=squad, usuario=member).exists()


@pytest.mark.django_db
def test_expulsar_miembro_requiere_administrador(
    api_client,
    member,
    member2,
    squad,
):
    response = authenticated_client(api_client, member).delete(
        expulsion_url(squad, member2)
    )

    assert response.status_code == 403
    assert Membresia.objects.filter(escuadron=squad, usuario=member2).exists()


@pytest.mark.django_db
def test_expulsar_no_permite_eliminar_otros_administradores(
    api_client,
    creator,
    member,
    member2,
    squad,
):
    Membresia.objects.filter(escuadron=squad, usuario=member2).update(
        es_administrador=True
    )

    response = authenticated_client(api_client, creator).delete(
        expulsion_url(squad, member2)
    )

    assert response.status_code == 403
    assert Membresia.objects.filter(escuadron=squad, usuario=member2).exists()

    Membresia.objects.filter(escuadron=squad, usuario=creator).update(
        es_administrador=False
    )
    Membresia.objects.filter(escuadron=squad, usuario=member).update(
        es_administrador=True
    )
    response = authenticated_client(api_client, member).delete(
        expulsion_url(squad, creator)
    )

    assert response.status_code == 403
    assert Membresia.objects.filter(escuadron=squad, usuario=creator).exists()


@pytest.mark.django_db
def test_expulsar_devuelve_404_si_el_escuadron_no_existe(
    api_client,
    creator,
    member,
):
    url = reverse(
        "escuadrones:expulsar-miembro",
        kwargs={"escuadron_id": 999999, "usuario_id": member.pk},
    )

    response = authenticated_client(api_client, creator).delete(url)

    assert response.status_code == 404


@pytest.mark.django_db
def test_expulsar_devuelve_404_si_el_usuario_no_pertenece_al_escuadron(
    api_client,
    creator,
    outsider,
    squad,
):
    response = authenticated_client(api_client, creator).delete(
        expulsion_url(squad, outsider)
    )

    assert response.status_code == 404
