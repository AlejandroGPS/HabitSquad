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
def squad(creator):
    return Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creator,
        codigo_invitacion="X8K9QL",
    )


@pytest.fixture
def membership(squad, member):
    return Membresia.objects.create(
        escuadron=squad,
        usuario=member,
    )


@pytest.fixture
def authenticated_client(api_client, member):
    token = AccessToken.for_user(member)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


def habit_url(squad):
    return reverse("habitos:habito-diario", kwargs={"escuadron_id": squad.pk})


@pytest.mark.django_db
def test_habito_requires_authentication(api_client, squad):
    response = api_client.get(habit_url(squad))

    assert response.status_code == 401


@pytest.mark.django_db
def test_habito_rejects_non_member(authenticated_client, squad):
    response = authenticated_client.get(habit_url(squad))

    assert response.status_code == 403
    assert response.data["detail"] == "El usuario no pertenece a este escuadrón."


@pytest.mark.django_db
def test_habito_rejects_unknown_squad(authenticated_client):
    response = authenticated_client.get(
        reverse("habitos:habito-diario", kwargs={"escuadron_id": 999})
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_put_creates_habito_for_authenticated_member(
    authenticated_client,
    membership,
    squad,
):
    response = authenticated_client.put(
        habit_url(squad),
        {
            "opcion": "leer",
            "texto_personalizado": "",
        },
        format="json",
    )

    assert response.status_code == 200
    habit = HabitoDiario.objects.get(membresia=membership)
    assert response.data["id"] == habit.pk
    assert response.data["opcion"] == "leer"
    assert response.data["texto_personalizado"] == ""


@pytest.mark.django_db
def test_get_returns_existing_habito(authenticated_client, membership, squad):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.GIMNASIO,
    )

    response = authenticated_client.get(habit_url(squad))

    assert response.status_code == 200
    assert response.data["id"] == habit.pk
    assert response.data["opcion"] == "gimnasio"


@pytest.mark.django_db
def test_get_returns_not_found_when_member_has_no_habito(
    authenticated_client,
    membership,
    squad,
):
    response = authenticated_client.get(habit_url(squad))

    assert response.status_code == 404
    assert not HabitoDiario.objects.filter(membresia=membership).exists()


@pytest.mark.django_db
def test_put_updates_existing_habito(authenticated_client, membership, squad):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.GIMNASIO,
    )

    response = authenticated_client.put(
        habit_url(squad),
        {
            "opcion": "estudiar",
            "texto_personalizado": "",
        },
        format="json",
    )

    habit.refresh_from_db()
    assert response.status_code == 200
    assert habit.pk == response.data["id"]
    assert habit.opcion == "estudiar"
    assert HabitoDiario.objects.filter(membresia=membership).count() == 1


@pytest.mark.django_db
def test_put_accepts_custom_text_for_other_option(
    authenticated_client,
    membership,
    squad,
):
    response = authenticated_client.put(
        habit_url(squad),
        {
            "opcion": "otro",
            "texto_personalizado": "  Leer 20 páginas  ",
        },
        format="json",
    )

    assert response.status_code == 200
    habit = HabitoDiario.objects.get(membresia=membership)
    assert habit.texto_personalizado == "Leer 20 páginas"


@pytest.mark.django_db
@pytest.mark.parametrize("texto", ["", "   "])
def test_put_rejects_other_option_without_custom_text(
    authenticated_client,
    membership,
    squad,
    texto,
):
    response = authenticated_client.put(
        habit_url(squad),
        {
            "opcion": "otro",
            "texto_personalizado": texto,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "texto_personalizado" in response.data
    assert not HabitoDiario.objects.filter(membresia=membership).exists()


@pytest.mark.django_db
def test_put_rejects_unknown_option(authenticated_client, membership, squad):
    response = authenticated_client.put(
        habit_url(squad),
        {
            "opcion": "descansar",
            "texto_personalizado": "",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "opcion" in response.data
    assert not HabitoDiario.objects.filter(membresia=membership).exists()


@pytest.mark.django_db
def test_put_rejects_custom_text_longer_than_255_characters(
    authenticated_client,
    membership,
    squad,
):
    response = authenticated_client.put(
        habit_url(squad),
        {
            "opcion": "otro",
            "texto_personalizado": "a" * 256,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "texto_personalizado" in response.data
    assert not HabitoDiario.objects.filter(membresia=membership).exists()


@pytest.mark.django_db
def test_put_does_not_replace_existing_habito_when_validation_fails(
    authenticated_client,
    membership,
    squad,
):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.LEER,
    )

    response = authenticated_client.put(
        habit_url(squad),
        {
            "opcion": "otro",
            "texto_personalizado": " ",
        },
        format="json",
    )

    habit.refresh_from_db()
    assert response.status_code == 400
    assert habit.opcion == HabitoDiario.Opcion.LEER
    assert habit.texto_personalizado == ""


def test_habito_endpoints_are_documented_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    paths = response.data["paths"]
    path = "/api/escuadrones/{escuadron_id}/habito/"
    assert path in paths

    get_operation = paths[path]["get"]
    put_operation = paths[path]["put"]
    assert get_operation["operationId"] == "consultarHabitoDiario"
    assert get_operation["summary"] == "Consultar hábito diario"
    assert get_operation["tags"] == ["Hábitos"]
    assert set(get_operation["responses"]) == {"200", "401", "403", "404"}

    assert put_operation["operationId"] == "asignarHabitoDiario"
    assert put_operation["summary"] == "Asignar hábito diario"
    assert put_operation["tags"] == ["Hábitos"]
    assert set(put_operation["responses"]) == {"200", "400", "401", "403", "404"}

    request_schema = put_operation["requestBody"]["content"]["application/json"][
        "schema"
    ]
    component_name = request_schema["$ref"].rsplit("/", maxsplit=1)[-1]
    habit_schema = response.data["components"]["schemas"][component_name]
    assert set(habit_schema["properties"]) == {
        "id",
        "opcion",
        "texto_personalizado",
        "creado_en",
        "actualizado_en",
    }
    option_schema = habit_schema["properties"]["opcion"]
    option_component_name = option_schema["$ref"].rsplit("/", maxsplit=1)[-1]
    assert response.data["components"]["schemas"][option_component_name]["enum"] == [
        "gimnasio",
        "leer",
        "estudiar",
        "otro",
    ]
    assert habit_schema["properties"]["texto_personalizado"]["maxLength"] == 255
    assert "Opción predefinida" in {
        example["summary"]
        for example in put_operation["requestBody"]["content"]["application/json"][
            "examples"
        ].values()
    }
