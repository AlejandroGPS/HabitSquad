import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from usuarios.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="person@example.com",
        password="S0mething!Secure-497",
    )


@pytest.mark.django_db
def test_login_returns_access_and_refresh_tokens_for_email_case_insensitively(
    api_client,
    user,
):
    response = api_client.post(
        reverse("autenticacion:token"),
        {
            "email": "PERSON@EXAMPLE.COM",
            "password": "S0mething!Secure-497",
        },
        format="json",
    )

    assert response.status_code == 200
    assert set(response.data) == {"access", "refresh"}

    access_token = AccessToken(response.data["access"])
    refresh_token = RefreshToken(response.data["refresh"])
    assert access_token["user_id"] == str(user.pk)
    assert refresh_token["user_id"] == str(user.pk)
    assert access_token["exp"] - access_token["iat"] == 300
    assert refresh_token["exp"] - refresh_token["iat"] == 86400


@pytest.mark.parametrize(
    ("email", "password"),
    [
        ("unknown@example.com", "S0mething!Secure-497"),
        ("person@example.com", "incorrect-password"),
    ],
)
@pytest.mark.django_db
def test_login_rejects_invalid_credentials_with_generic_error(
    api_client,
    user,
    email,
    password,
):
    response = api_client.post(
        reverse("autenticacion:token"),
        {"email": email, "password": password},
        format="json",
    )

    assert response.status_code == 401
    assert set(response.data) == {"detail"}
    assert response.data["detail"] == (
        "No active account found with the given credentials"
    )


@pytest.mark.django_db
def test_login_rejects_inactive_user_with_generic_error(api_client, user):
    user.is_active = False
    user.save(update_fields=["is_active"])

    response = api_client.post(
        reverse("autenticacion:token"),
        {
            "email": user.email,
            "password": "S0mething!Secure-497",
        },
        format="json",
    )

    assert response.status_code == 401
    assert set(response.data) == {"detail"}
    assert response.data["detail"] == (
        "No active account found with the given credentials"
    )


@pytest.mark.django_db
def test_login_rejects_user_with_unverified_email_with_generic_error(api_client):
    user = CustomUser.objects.create_user(
        email="pending@example.com",
        password="S0mething!Secure-497",
        email_verified=False,
    )

    response = api_client.post(
        reverse("autenticacion:token"),
        {
            "email": user.email,
            "password": "S0mething!Secure-497",
        },
        format="json",
    )

    assert response.status_code == 401
    assert set(response.data) == {"detail"}
    assert response.data["detail"] == (
        "No active account found with the given credentials"
    )


@pytest.mark.django_db
def test_login_is_limited_to_five_attempts_per_hour_and_ip(api_client):
    url = reverse("autenticacion:token")

    responses = [
        api_client.post(
            url,
            {
                "email": f"person{index}@example.com",
                "password": "incorrect-password",
            },
            format="json",
            REMOTE_ADDR="192.0.2.20",
        )
        for index in range(6)
    ]

    assert [response.status_code for response in responses] == [
        401,
        401,
        401,
        401,
        401,
        429,
    ]


def test_login_is_documented_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/auth/token/"]["post"]
    assert operation["description"] == (
        "Autentica con email y contraseña y devuelve access y refresh. "
        "El email debe estar verificado antes de establecer la sesión."
    )
    assert set(operation["responses"]) == {"200", "401", "429"}
    schema = response.data
    response_schema = operation["responses"]["200"]["content"]["application/json"][
        "schema"
    ]
    component_name = response_schema["$ref"].rsplit("/", maxsplit=1)[-1]
    assert set(schema["components"]["schemas"][component_name]["properties"]) == {
        "access",
        "refresh",
    }
    request_schema = operation["requestBody"]["content"]["application/json"]["schema"]
    request_component = request_schema["$ref"].rsplit("/", maxsplit=1)[-1]
    assert set(schema["components"]["schemas"][request_component]["properties"]) == {
        "email",
        "password",
    }
