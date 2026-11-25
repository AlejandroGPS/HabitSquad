import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Escuadron, Membresia
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
    )
    return squad


def config_url(squad):
    return reverse(
        "escuadrones:configuracion-escuadron",
        kwargs={"escuadron_id": squad.pk},
    )


def authenticated_client(api_client, user):
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
def test_configuracion_requires_authentication(api_client, squad):
    response = api_client.get(config_url(squad))

    assert response.status_code == 401


@pytest.mark.django_db
def test_admin_can_consult_configuracion(api_client, creator, squad):
    response = authenticated_client(api_client, creator).get(config_url(squad))

    assert response.status_code == 200
    assert response.data == {
        "id": squad.pk,
        "nombre": "Madrugadores",
        "es_publico": False,
        "limite_miembros": 5,
        "miembros_actuales": 2,
    }


@pytest.mark.django_db
def test_only_admin_can_consult_or_update_configuracion(api_client, member, squad):
    client = authenticated_client(api_client, member)

    get_response = client.get(config_url(squad))
    patch_response = client.patch(
        config_url(squad),
        {"nombre": "Nuevo nombre"},
        format="json",
    )

    assert get_response.status_code == 403
    assert patch_response.status_code == 403
    squad.refresh_from_db()
    assert squad.nombre == "Madrugadores"


@pytest.mark.django_db
def test_configuracion_returns_404_for_missing_squad(api_client, creator):
    response = authenticated_client(api_client, creator).get(
        reverse("escuadrones:configuracion-escuadron", kwargs={"escuadron_id": 999})
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_admin_can_update_configuracion(api_client, creator, squad):
    response = authenticated_client(api_client, creator).patch(
        config_url(squad),
        {
            "nombre": "Lectores",
            "es_publico": True,
            "limite_miembros": 8,
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.data == {
        "id": squad.pk,
        "nombre": "Lectores",
        "es_publico": True,
        "limite_miembros": 8,
        "miembros_actuales": 2,
    }
    squad.refresh_from_db()
    assert squad.nombre == "Lectores"
    assert squad.es_publico is True
    assert squad.limite_miembros == 8


@pytest.mark.django_db
@pytest.mark.parametrize("limite", [0, 1])
def test_admin_cannot_set_limit_under_two(api_client, creator, squad, limite):
    response = authenticated_client(api_client, creator).patch(
        config_url(squad),
        {"limite_miembros": limite},
        format="json",
    )

    assert response.status_code == 400
    assert "limite_miembros" in response.data
    squad.refresh_from_db()
    assert squad.limite_miembros == 5


def test_configuracion_endpoints_are_in_openapi(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    paths = response.data["paths"]
    assert "/api/escuadrones/{escuadron_id}/configuracion/" in paths
    operations = paths["/api/escuadrones/{escuadron_id}/configuracion/"]
    assert operations["get"]["operationId"] == "consultarConfiguracionEscuadron"
    assert operations["patch"]["operationId"] == "actualizarConfiguracionEscuadron"
    assert set(operations["get"]["responses"]) == {"200", "401", "403", "404"}
    assert set(operations["patch"]["responses"]) == {
        "200",
        "400",
        "401",
        "403",
        "404",
    }
