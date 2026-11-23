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
def joiner(db):
    return CustomUser.objects.create_user(
        email="miembro@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def squad(creator):
    squad = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creator,
        codigo_invitacion="X8K9QL",
        es_publico=True,
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=creator,
        es_administrador=True,
    )
    return squad


def public_join_url(squad):
    return reverse(
        "escuadrones:unirse-escuadron-publico",
        kwargs={"escuadron_id": squad.pk},
    )


def authenticated_client(api_client, user):
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
def test_public_join_requires_authentication(api_client, squad):
    response = api_client.post(public_join_url(squad))

    assert response.status_code == 401
    assert Membresia.objects.filter(escuadron=squad).count() == 1


@pytest.mark.django_db
def test_user_joins_public_squad_without_code(
    api_client,
    creator,
    joiner,
    squad,
):
    response = authenticated_client(api_client, joiner).post(
        public_join_url(squad),
        format="json",
    )

    assert response.status_code == 201
    assert response.data["id"] == squad.pk
    assert response.data["es_publico"] is True
    assert response.data["limite_miembros"] == 5
    assert {"usuario_id": creator.pk, "es_administrador": True} in response.data[
        "miembros"
    ]
    assert {"usuario_id": joiner.pk, "es_administrador": False} in response.data[
        "miembros"
    ]


@pytest.mark.django_db
def test_public_join_rejects_private_squad(api_client, joiner, squad):
    squad.es_publico = False
    squad.save(update_fields=["es_publico"])

    response = authenticated_client(api_client, joiner).post(
        public_join_url(squad),
        format="json",
    )

    assert response.status_code == 403
    assert "públicos" in response.data["detail"]
    assert not Membresia.objects.filter(escuadron=squad, usuario=joiner).exists()


@pytest.mark.django_db
def test_public_join_returns_404_for_missing_squad(api_client, joiner):
    url = reverse("escuadrones:unirse-escuadron-publico", kwargs={"escuadron_id": 999})
    response = authenticated_client(api_client, joiner).post(url, format="json")

    assert response.status_code == 404


@pytest.mark.django_db
def test_public_join_rejects_existing_member(api_client, creator, squad):
    response = authenticated_client(api_client, creator).post(
        public_join_url(squad),
        format="json",
    )

    assert response.status_code == 409
    assert "Ya perteneces" in response.data["detail"]


@pytest.mark.django_db
def test_public_join_rejects_full_squad(api_client, joiner, squad):
    for index in range(squad.limite_miembros - 1):
        user = CustomUser.objects.create_user(
            email=f"miembro{index}@example.com",
            password="S0mething!Secure-497",
        )
        Membresia.objects.create(escuadron=squad, usuario=user)

    response = authenticated_client(api_client, joiner).post(
        public_join_url(squad),
        format="json",
    )

    assert response.status_code == 409
    assert "límite" in response.data["detail"]
    assert Membresia.objects.filter(escuadron=squad).count() == squad.limite_miembros
    assert not Membresia.objects.filter(escuadron=squad, usuario=joiner).exists()


@pytest.mark.django_db
def test_code_join_rejects_full_private_squad(api_client, joiner, squad):
    squad.es_publico = False
    squad.save(update_fields=["es_publico"])
    for index in range(squad.limite_miembros - 1):
        user = CustomUser.objects.create_user(
            email=f"miembro{index}@example.com",
            password="S0mething!Secure-497",
        )
        Membresia.objects.create(escuadron=squad, usuario=user)

    response = authenticated_client(api_client, joiner).post(
        reverse("escuadrones:unirse-escuadron"),
        {"codigo_invitacion": squad.codigo_invitacion},
        format="json",
    )

    assert response.status_code == 409
    assert "límite" in response.data["detail"]
    assert Membresia.objects.filter(escuadron=squad).count() == squad.limite_miembros


def test_public_join_is_documented_in_openapi(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/escuadrones/{escuadron_id}/unirse/"][
        "post"
    ]
    assert operation["operationId"] == "unirseAUnEscuadronPublico"
    assert "requestBody" not in operation
    assert set(operation["responses"]) == {"201", "401", "403", "404", "409"}
