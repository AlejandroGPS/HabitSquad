from datetime import timedelta
from unittest.mock import patch

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from usuarios.models import CustomUser

SIGNED_FOTO_URL = (
    "https://res.cloudinary.com/demo/image/private/s--firma--/v1/perfiles/abc.jpg"
)

SQUAD_PANEL_KEYS = {
    "id",
    "nombre",
    "codigo_invitacion",
    "creador_id",
    "miembros",
    "racha",
}

MEMBER_PANEL_KEYS = {
    "usuario_id",
    "es_administrador",
    "es_usuario",
    "nickname",
    "foto_url",
    "habito",
    "prueba_hoy",
    "semana",
}


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def creator(db):
    return CustomUser.objects.create_user(
        email="creador@example.com",
        password="S0mething!Secure-497",
        nickname="CreadorHero",
    )


@pytest.fixture
def member(db):
    return CustomUser.objects.create_user(
        email="miembro@example.com",
        password="S0mething!Secure-497",
        nickname="MiembroPro",
    )


@pytest.fixture
def outsider(db):
    return CustomUser.objects.create_user(
        email="externo@example.com",
        password="S0mething!Secure-497",
        nickname="ExternoUser",
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


def members_by_usuario_id(payload):
    return {item["usuario_id"]: item for item in payload["miembros"]}


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
def test_squad_detail_panel_happy_path_includes_nicknames(
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
    today = timezone.localdate()
    RegistroDiario.objects.create(
        habito=habit,
        fecha=today - timedelta(days=1),
        cloudinary_public_id="pruebas/ayer",
    )
    proof = RegistroDiario.objects.create(
        habito=habit, fecha=today, cloudinary_public_id="pruebas/hoy"
    )

    response = authenticated_client(api_client, member).get(detail_url(squad))

    assert response.status_code == 200
    assert set(response.data) == SQUAD_PANEL_KEYS
    assert response.data["id"] == squad.pk
    assert response.data["nombre"] == "Madrugadores"
    assert response.data["codigo_invitacion"] == "X8K9QL"
    assert response.data["creador_id"] == creator.pk
    assert isinstance(response.data["racha"], int)

    by_id = members_by_usuario_id(response.data)
    assert set(by_id) == {creator.pk, member.pk}
    assert set(by_id[creator.pk]) == MEMBER_PANEL_KEYS
    assert set(by_id[member.pk]) == MEMBER_PANEL_KEYS
    assert "nombre" not in by_id[creator.pk]
    assert "nombre" not in by_id[member.pk]

    assert by_id[creator.pk]["nickname"] == "CreadorHero"
    assert by_id[member.pk]["nickname"] == "MiembroPro"
    assert by_id[creator.pk]["foto_url"] is None
    assert by_id[member.pk]["foto_url"] is None
    assert by_id[creator.pk]["es_administrador"] is True
    assert by_id[member.pk]["es_administrador"] is False
    assert by_id[creator.pk]["es_usuario"] is False
    assert by_id[member.pk]["es_usuario"] is True

    assert by_id[creator.pk]["habito"] is None
    assert by_id[member.pk]["habito"]["id"] == habit.pk
    assert by_id[member.pk]["habito"]["opcion"] == HabitoDiario.Opcion.OTRO
    assert by_id[member.pk]["habito"]["texto_personalizado"] == "Leer 20 páginas"
    assert by_id[creator.pk]["prueba_hoy"] is None
    assert by_id[member.pk]["prueba_hoy"] == {
        "id": proof.pk,
        "estado": "pendiente",
    }
    assert len(by_id[creator.pk]["semana"]) == 7
    assert len(by_id[member.pk]["semana"]) == 7
    assert by_id[member.pk]["semana"][today.weekday()] == {
        "fecha": today.isoformat(),
        "estado": "pendiente",
    }


@pytest.mark.django_db
def test_squad_detail_foto_url_null_or_signed(api_client, creator, member, squad):
    member.foto_perfil_public_id = "perfiles/mock"
    member.save(update_fields=["foto_perfil_public_id"])

    with patch(
        "escuadrones.detalle.api.serializers.build_signed_foto_url",
        return_value=SIGNED_FOTO_URL,
    ) as build_url:
        response = authenticated_client(api_client, creator).get(detail_url(squad))

    assert response.status_code == 200
    by_id = members_by_usuario_id(response.data)
    assert by_id[creator.pk]["foto_url"] is None
    assert by_id[member.pk]["foto_url"] == SIGNED_FOTO_URL
    assert "foto_perfil_public_id" not in by_id[member.pk]
    assert "perfiles/mock" not in str(response.data)
    build_url.assert_called_once_with("perfiles/mock")


@pytest.mark.django_db
def test_squad_detail_includes_streak_and_week(api_client, creator, member, squad):
    today = timezone.localdate()
    Escuadron.objects.filter(pk=squad.pk).update(
        creado_en=timezone.now() - timedelta(days=10)
    )
    Membresia.objects.filter(escuadron=squad).update(
        unido_en=timezone.now() - timedelta(days=10)
    )
    for user in (creator, member):
        habit = HabitoDiario.objects.create(
            membresia=Membresia.objects.get(escuadron=squad, usuario=user),
            opcion=HabitoDiario.Opcion.LEER,
        )
        for days in (0, 1):
            RegistroDiario.objects.create(
                habito=habit,
                fecha=today - timedelta(days=days),
                estado=RegistroDiario.Estado.CUMPLIDO,
                cloudinary_public_id=f"pruebas/{user.pk}-{days}",
            )

    response = authenticated_client(api_client, member).get(detail_url(squad))

    assert response.status_code == 200
    assert response.data["racha"] == 2
    week = response.data["miembros"][0]["semana"]
    assert len(week) == 7
    assert week[today.weekday()] == {"fecha": today.isoformat(), "estado": "cumplido"}
    assert all(day["estado"] is None for day in week[today.weekday() + 1 :])


def test_squad_detail_is_documented_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/escuadrones/{escuadron_id}/"]["get"]
    assert operation["operationId"] == "consultarDetalleEscuadron"
    assert operation["summary"] == "Consultar detalle de un escuadrón"
    assert operation["tags"] == ["Escuadrones"]
    assert set(operation["responses"]) == {"200", "401", "403", "404"}
    assert "docs/HABITOS.md" in operation["description"]
    assert "nickname" in operation["description"].lower()

    schemas = response.data["components"]["schemas"]
    member_schema = schemas.get("MembresiaConPrueba") or schemas.get(
        "MembresiaConPruebaSerializer"
    )
    assert member_schema is not None
    props = member_schema["properties"]
    assert "nickname" in props
    assert "foto_url" in props
    assert "nombre" not in props
