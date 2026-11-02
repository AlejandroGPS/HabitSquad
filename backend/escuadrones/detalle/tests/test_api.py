import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario
from usuarios.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


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
def outsider(db):
    return CustomUser.objects.create_user(
        email="externo@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def squad(creator, member):
    squad = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creator,
        codigo_invitacion="X8K9QL",
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=creator,
        es_administrador=True,
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=member,
        es_administrador=False,
    )
    return squad


def detail_url(squad):
    return reverse("escuadrones:detalle-escuadron", kwargs={"escuadron_id": squad.pk})


def authenticated_client(api_client, user):
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
def test_squad_detail_requires_authentication(api_client, squad):
    response = api_client.get(detail_url(squad))

    assert response.status_code == 401


@pytest.mark.django_db
def test_squad_detail_rejects_non_member(api_client, outsider, squad):
    response = authenticated_client(api_client, outsider).get(detail_url(squad))

    assert response.status_code == 403
    assert response.data["detail"] == "El usuario no pertenece a este escuadrón."


@pytest.mark.django_db
def test_squad_detail_rejects_unknown_squad(api_client, member):
    response = authenticated_client(api_client, member).get(
        reverse("escuadrones:detalle-escuadron", kwargs={"escuadron_id": 999})
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_squad_detail_includes_each_members_habit_or_null(
    api_client,
    creator,
    member,
    squad,
):
    membership = Membresia.objects.get(escuadron=squad, usuario=member)
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.OTRO,
        texto_personalizado="Leer 20 páginas",
    )

    response = authenticated_client(api_client, creator).get(detail_url(squad))

    assert response.status_code == 200
    assert set(response.data) == {
        "id",
        "nombre",
        "codigo_invitacion",
        "creador_id",
        "miembros",
    }
    members_by_id = {item["usuario_id"]: item for item in response.data["miembros"]}
    assert members_by_id[member.pk]["habito"]["id"] == habit.pk
    assert members_by_id[member.pk]["habito"]["texto_personalizado"] == (
        "Leer 20 páginas"
    )
    assert members_by_id[creator.pk]["habito"] is None


def test_squad_detail_is_documented_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/escuadrones/{escuadron_id}/"]["get"]
    assert operation["operationId"] == "consultarDetalleEscuadron"
    assert operation["summary"] == "Consultar detalle de un escuadrón"
    assert operation["tags"] == ["Escuadrones"]
    assert set(operation["responses"]) == {"200", "401", "403", "404"}
