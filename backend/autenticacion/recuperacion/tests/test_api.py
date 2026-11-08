import pytest
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
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


def password_reset_confirm_url():
    return reverse("autenticacion:password-reset-confirm")


def email_verification_url():
    return reverse("autenticacion:email-verification-request")


def email_verification_confirm_url():
    return reverse("autenticacion:email-verification-confirm")


def reset_credentials(user):
    return {
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "token": default_token_generator.make_token(user),
    }


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


@pytest.mark.django_db
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_VERIFICATION_FRONTEND_URL="http://frontend.test/verify-email",
)
def test_email_verification_request_sends_email_for_unverified_user(api_client):
    user = CustomUser.objects.create_user(
        email="pending@example.com",
        password="S0mething!Secure-497",
        email_verified=False,
    )

    response = api_client.post(
        email_verification_url(),
        {"email": user.email},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["detail"].startswith("Si existe una cuenta")
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [user.email]
    assert "http://frontend.test/verify-email?uid=" in mail.outbox[0].body
    assert "&token=" in mail.outbox[0].body


@pytest.mark.django_db
def test_email_verification_request_has_neutral_response_for_unknown_or_verified(
    api_client,
    user,
):
    user.email_verified = True
    user.save(update_fields=["email_verified"])

    verified_response = api_client.post(
        email_verification_url(),
        {"email": user.email},
        format="json",
    )
    unknown_response = api_client.post(
        email_verification_url(),
        {"email": "unknown@example.com"},
        format="json",
    )

    assert verified_response.status_code == 200
    assert unknown_response.status_code == 200
    assert verified_response.data == unknown_response.data
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_email_verification_confirm_activates_user_and_rejects_reuse(
    api_client,
):
    user = CustomUser.objects.create_user(
        email="pending@example.com",
        password="S0mething!Secure-497",
        email_verified=False,
    )
    credentials = reset_credentials(user)

    response = api_client.post(
        email_verification_confirm_url(),
        credentials,
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert user.email_verified is True
    reused_response = api_client.post(
        email_verification_confirm_url(),
        credentials,
        format="json",
    )
    assert reused_response.status_code == 400
    assert "token" in reused_response.data


@pytest.mark.parametrize("email", ["not-an-email", ""])
@pytest.mark.django_db
def test_email_verification_request_rejects_invalid_email(api_client, email):
    response = api_client.post(
        email_verification_url(),
        {"email": email},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_email_verification_confirm_rejects_invalid_token(api_client):
    response = api_client.post(
        email_verification_confirm_url(),
        {"uid": "invalid", "token": "invalid"},
        format="json",
    )

    assert response.status_code == 400
    assert "token" in response.data


def test_email_verification_endpoints_are_documented_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    assert set(
        response.data["paths"]["/api/auth/email-verification/"]["post"]["responses"]
    ) == {
        "200",
        "400",
        "429",
    }
    assert set(
        response.data["paths"]["/api/auth/email-verification/confirm/"]["post"][
            "responses"
        ]
    ) == {"200", "400", "429"}


@pytest.mark.django_db
def test_password_reset_confirm_updates_password_and_invalidates_token(
    api_client,
    user,
):
    credentials = reset_credentials(user)
    payload = {
        **credentials,
        "new_password": "N3w!Secure-Password-497",
        "new_password_confirm": "N3w!Secure-Password-497",
    }

    response = api_client.post(
        password_reset_confirm_url(),
        payload,
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert response.data == {"detail": "La contraseña se ha actualizado correctamente."}
    assert user.check_password("N3w!Secure-Password-497")
    assert not user.check_password("S0mething!Secure-497")

    reused_response = api_client.post(
        password_reset_confirm_url(),
        payload,
        format="json",
    )
    assert reused_response.status_code == 400
    assert "token" in reused_response.data


@pytest.mark.parametrize(
    ("new_password", "new_password_confirm"),
    [
        ("N3w!Secure-Password-497", "Different!Secure-Password-497"),
        ("", ""),
        ("password", "password"),
    ],
)
@pytest.mark.django_db
def test_password_reset_confirm_rejects_invalid_passwords(
    api_client,
    user,
    new_password,
    new_password_confirm,
):
    response = api_client.post(
        password_reset_confirm_url(),
        {
            **reset_credentials(user),
            "new_password": new_password,
            "new_password_confirm": new_password_confirm,
        },
        format="json",
    )

    assert response.status_code == 400
    user.refresh_from_db()
    assert user.check_password("S0mething!Secure-497")


@pytest.mark.parametrize(
    ("uid", "token"),
    [
        ("invalid", "invalid"),
        ("999999", "invalid"),
    ],
)
@pytest.mark.django_db
def test_password_reset_confirm_rejects_invalid_token(api_client, user, uid, token):
    response = api_client.post(
        password_reset_confirm_url(),
        {
            "uid": uid,
            "token": token,
            "new_password": "N3w!Secure-Password-497",
            "new_password_confirm": "N3w!Secure-Password-497",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_password_reset_confirm_rejects_expired_token(
    api_client,
    user,
    monkeypatch,
):
    monkeypatch.setattr(
        "autenticacion.recuperacion.services.reset.default_token_generator.check_token",
        lambda user, token: False,
    )

    response = api_client.post(
        password_reset_confirm_url(),
        {
            **reset_credentials(user),
            "new_password": "N3w!Secure-Password-497",
            "new_password_confirm": "N3w!Secure-Password-497",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "token" in response.data


def test_password_reset_confirm_is_documented_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/auth/password-reset/confirm/"]["post"]
    assert set(operation["responses"]) == {"200", "400", "429"}
    assert operation["requestBody"]["required"] is True


def test_password_reset_request_is_documented_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/auth/password-reset/"]["post"]
    assert set(operation["responses"]) == {"200", "400", "429"}
    assert operation["requestBody"]["required"] is True
