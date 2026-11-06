import pytest
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils.http import urlsafe_base64_decode
from rest_framework.test import APIClient

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


def password_reset_url():
    return reverse("autenticacion:password-reset-request")


@pytest.mark.django_db
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_RESET_FRONTEND_URL="http://frontend.test/reset-password",
)
def test_password_reset_request_sends_email_with_uid_and_token(api_client, user):
    response = api_client.post(
        password_reset_url(),
        {"email": "PERSON@EXAMPLE.COM"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data == {
        "detail": (
            "Si existe una cuenta asociada a ese email, "
            "recibirás instrucciones para recuperar la contraseña."
        )
    }
    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.to == [user.email]
    assert message.subject == "Recuperación de contraseña de HabitSquad"
    assert "http://frontend.test/reset-password?uid=" in message.body
    assert "&token=" in message.body
    assert str(user.pk) in str(
        urlsafe_base64_decode(
            message.body.split("uid=", maxsplit=1)[1].split("&", maxsplit=1)[0]
        ),
        "utf-8",
    )


@pytest.mark.django_db
def test_password_reset_request_has_same_response_for_unknown_email(api_client):
    response = api_client.post(
        password_reset_url(),
        {"email": "unknown@example.com"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["detail"].startswith("Si existe una cuenta")
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_password_reset_request_does_not_send_email_for_inactive_user(
    api_client,
    user,
):
    user.is_active = False
    user.save(update_fields=["is_active"])

    response = api_client.post(
        password_reset_url(),
        {"email": user.email},
        format="json",
    )

    assert response.status_code == 200
    assert len(mail.outbox) == 0


@pytest.mark.parametrize("email", ["not-an-email", ""])
@pytest.mark.django_db
def test_password_reset_request_rejects_invalid_email(api_client, email):
    response = api_client.post(
        password_reset_url(),
        {"email": email},
        format="json",
    )

    assert response.status_code == 400
    assert "email" in response.data


@pytest.mark.django_db
def test_password_reset_request_is_limited_to_five_requests_per_hour(api_client):
    url = password_reset_url()
    responses = [
        api_client.post(
            url,
            {"email": f"person{index}@example.com"},
            format="json",
            REMOTE_ADDR="192.0.2.30",
        )
        for index in range(6)
    ]

    assert [response.status_code for response in responses] == [
        200,
        200,
        200,
        200,
        200,
        429,
    ]


def test_password_reset_request_is_documented_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/auth/password-reset/"]["post"]
    assert set(operation["responses"]) == {"200", "400", "429"}
    assert operation["requestBody"]["required"] is True
