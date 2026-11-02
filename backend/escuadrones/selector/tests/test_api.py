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
def user(db):
    return CustomUser.objects.create_user(
        email="usuario@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def other_user(db):
    return CustomUser.objects.create_user(
        email="otro@example.com",
        password="S0mething!Secure-497",
    )


def selector_url():
    return reverse("escuadrones:selector-escuadrones")


def authenticated_client(api_client, user):
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


def create_squad(*, name, creator, code):
    squad = Escuadron.objects.create(
        nombre=name,
        creador=creator,
        codigo_invitacion=code,
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=creator,
        es_administrador=True,
    )
    return squad


@pytest.mark.django_db
def test_selector_requires_authentication(api_client):
    response = api_client.get(selector_url())

    assert response.status_code == 401


@pytest.mark.django_db
def test_selector_returns_empty_list_when_user_has_no_squads(api_client, user):
    response = authenticated_client(api_client, user).get(selector_url())

    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_selector_returns_only_user_squads_with_members_and_habits(
    api_client,
    user,
    other_user,
):
    first = create_squad(name="Madrugadores", creator=user, code="X8K9QL")
    second = create_squad(name="Lectores", creator=other_user, code="A1B2C3")
    membership = Membresia.objects.create(
        escuadron=second,
        usuario=user,
        es_administrador=False,
    )
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.OTRO,
        texto_personalizado="Leer 20 páginas",
    )

    response = authenticated_client(api_client, user).get(selector_url())

    assert response.status_code == 200
    assert [squad["id"] for squad in response.data] == [first.pk, second.pk]
    selected = response.data[1]
    assert selected["nombre"] == "Lectores"
    member = next(
        item for item in selected["miembros"] if item["usuario_id"] == user.pk
    )
    assert member["habito"]["id"] == habit.pk


@pytest.mark.django_db
def test_selector_excludes_squads_where_user_is_not_member(
    api_client,
    user,
    other_user,
):
    create_squad(name="Otros", creator=other_user, code="X8K9QL")

    response = authenticated_client(api_client, user).get(selector_url())

    assert response.status_code == 200
    assert response.data == []


def test_selector_is_documented_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/escuadrones/"]["get"]
    assert operation["operationId"] == "listarEscuadronesUsuario"
    assert operation["summary"] == "Listar escuadrones del usuario"
    assert operation["tags"] == ["Escuadrones"]
    assert set(operation["responses"]) == {"200", "401"}
