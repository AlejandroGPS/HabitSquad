import pytest
from django.core.cache import cache
from django.urls import reverse
from django.utils.dateparse import parse_datetime
from rest_framework.test import APIClient

from usuarios.models import CustomUser


def _registration_payload(**overrides):
    payload = {
        "email": "Person@Example.com",
        "password": "S0mething!Secure-497",
        "password_confirm": "S0mething!Secure-497",
        "nickname": "HabitHero",
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_register_creates_user_and_returns_public_fields(api_client):
    response = api_client.post(
        reverse("autenticacion:register"),
        _registration_payload(),
        format="json",
    )

    user = CustomUser.objects.get(email="person@example.com")
    assert response.status_code == 201
    assert set(response.data) == {"id", "email", "nickname", "date_joined"}
    assert response.data["id"] == user.pk
    assert response.data["email"] == "person@example.com"
    assert response.data["nickname"] == "HabitHero"
    assert parse_datetime(response.data["date_joined"]) == user.date_joined
    assert user.nickname == "HabitHero"
    assert user.email_verified is False
    assert user.check_password("S0mething!Secure-497")
    assert "password" not in response.data
    assert "password_confirm" not in response.data


@pytest.mark.django_db
def test_register_rejects_duplicate_email_case_insensitively(api_client):
    CustomUser.objects.create_user(
        email="person@example.com",
        password="S0mething!Secure-497",
        nickname="ExistingUser",
    )

    response = api_client.post(
        reverse("autenticacion:register"),
        _registration_payload(
            email="PERSON@EXAMPLE.COM",
            password="Another!Secure-Password-51",
            password_confirm="Another!Secure-Password-51",
            nickname="NewHero",
        ),
        format="json",
    )

    assert response.status_code == 400
    assert "email" in response.data
    assert CustomUser.objects.count() == 1


@pytest.mark.parametrize(
    "duplicate_nickname",
    ["HabitHero", "habithero"],
)
@pytest.mark.django_db
def test_register_rejects_duplicate_nickname_case_insensitively(
    api_client,
    duplicate_nickname,
):
    CustomUser.objects.create_user(
        email="owner@example.com",
        password="S0mething!Secure-497",
        nickname="HabitHero",
    )

    response = api_client.post(
        reverse("autenticacion:register"),
        _registration_payload(
            email="otro@example.com",
            nickname=duplicate_nickname,
        ),
        format="json",
    )

    assert response.status_code == 400
    assert response.data["nickname"] == ["Ya existe una cuenta con este nickname."]
    assert CustomUser.objects.count() == 1
    assert not CustomUser.objects.filter(email="otro@example.com").exists()


@pytest.mark.parametrize(
    ("email", "password"),
    [
        ("not-an-email", "S0mething!Secure-497"),
        ([], "S0mething!Secure-497"),
        ("person@example.com", "password"),
        ("person@example.com", "1234567890123456"),
        ("person@example.com", ""),
    ],
)
@pytest.mark.django_db
def test_register_rejects_invalid_input(api_client, email, password):
    response = api_client.post(
        reverse("autenticacion:register"),
        _registration_payload(
            email=email,
            password=password,
            password_confirm=password,
            nickname="ValidNick",
        ),
        format="json",
    )

    assert response.status_code == 400
    assert CustomUser.objects.count() == 0


@pytest.mark.django_db
def test_register_rejects_missing_fields(api_client):
    response = api_client.post(
        reverse("autenticacion:register"),
        {},
        format="json",
    )

    assert response.status_code == 400
    assert set(response.data) == {
        "email",
        "password",
        "password_confirm",
        "nickname",
    }


@pytest.mark.django_db
def test_register_is_limited_to_five_requests_per_hour(api_client):
    url = reverse("autenticacion:register")

    responses = [
        api_client.post(
            url,
            _registration_payload(
                email=f"person{index}@example.com",
                nickname=f"HabitHero{index}",
            ),
            format="json",
            REMOTE_ADDR="192.0.2.10",
        )
        for index in range(6)
    ]

    assert [response.status_code for response in responses] == [
        201,
        201,
        201,
        201,
        201,
        429,
    ]


def test_registration_is_included_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    assert "/api/auth/register/" in response.data["paths"]
    operation = response.data["paths"]["/api/auth/register/"]["post"]
    assert "nickname" in operation["description"]
    assert "contraseña" in operation["description"].lower()
    assert "docs/REGISTRO.md" in operation["description"]
    assert "content" in operation["responses"]["201"]
    assert set(operation["responses"]) == {"201", "400", "429"}

    request_schema = operation["requestBody"]["content"]["application/json"]["schema"]
    # Spectacular may inline or $ref the request component
    if "$ref" in request_schema:
        ref_name = request_schema["$ref"].rsplit("/", 1)[-1]
        props = response.data["components"]["schemas"][ref_name]["properties"]
    else:
        props = request_schema["properties"]
    assert {"email", "password", "password_confirm", "nickname"} <= set(props)

    response_201 = operation["responses"]["201"]["content"]["application/json"][
        "schema"
    ]
    if "$ref" in response_201:
        ref_name = response_201["$ref"].rsplit("/", 1)[-1]
        resp_props = response.data["components"]["schemas"][ref_name]["properties"]
    else:
        resp_props = response_201["properties"]
    assert {"id", "email", "nickname", "date_joined"} <= set(resp_props)
