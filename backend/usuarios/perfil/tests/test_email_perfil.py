import pytest
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="perfil@example.com",
        password="S0mething!Secure-497",
        nickname="PerfilUser",
    )


@pytest.fixture
def auth_client(api_client, user):
    token = RefreshToken.for_user(user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


def _uid_token(user):
    return {
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "token": default_token_generator.make_token(user),
    }


@pytest.mark.django_db
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PROFILE_EMAIL_CHANGE_FRONTEND_URL="http://frontend.test/perfil/confirmar-email",
)
def test_solicitar_cambio_email_guarda_pendiente_y_envia_correo(auth_client, user):
    response = auth_client.post(
        reverse("perfil:email"),
        {"email": " Nuevo@Example.com "},
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert response.data == {
        "detail": (
            "Si la dirección es válida, recibirás un enlace de "
            "verificación en el nuevo correo."
        ),
        "email_pendiente": "nuevo@example.com",
    }
    assert user.email == "perfil@example.com"
    assert user.email_pendiente == "nuevo@example.com"
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["nuevo@example.com"]
    assert "http://frontend.test/perfil/confirmar-email?uid=" in mail.outbox[0].body
    assert "&token=" in mail.outbox[0].body


@pytest.mark.django_db
def test_solicitar_cambio_email_rechaza_igual_al_actual(auth_client):
    response = auth_client.post(
        reverse("perfil:email"),
        {"email": "perfil@example.com"},
        format="json",
    )

    assert response.status_code == 400
    assert response.data["email"] == ["El nuevo correo debe ser distinto al actual."]


@pytest.mark.django_db
def test_solicitar_cambio_email_rechaza_ya_registrado(auth_client):
    CustomUser.objects.create_user(
        email="ocupado@example.com",
        password="S0mething!Secure-497",
        nickname="OtroUser",
    )

    response = auth_client.post(
        reverse("perfil:email"),
        {"email": "ocupado@example.com"},
        format="json",
    )

    assert response.status_code == 400
    assert response.data["email"] == ["Ya existe una cuenta con este email."]


@pytest.mark.django_db
def test_solicitar_cambio_email_requiere_auth(api_client):
    response = api_client.post(
        reverse("perfil:email"),
        {"email": "nuevo@example.com"},
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
def test_confirmar_cambio_email_actualiza_login_y_limpia_pendiente(api_client, user):
    user.email_pendiente = "nuevo@example.com"
    user.save(update_fields=["email_pendiente"])
    credentials = _uid_token(user)

    response = api_client.post(
        reverse("perfil:email-confirm"),
        credentials,
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert response.data == {
        "detail": "El correo se ha actualizado correctamente.",
        "email": "nuevo@example.com",
    }
    assert user.email == "nuevo@example.com"
    assert user.email_pendiente is None

    reuse = api_client.post(
        reverse("perfil:email-confirm"),
        credentials,
        format="json",
    )
    assert reuse.status_code == 400
    assert reuse.data == {
        "detail": "El enlace de verificación no es válido o ha caducado."
    }


@pytest.mark.django_db
def test_confirmar_cambio_email_rechaza_token_invalido(api_client, user):
    user.email_pendiente = "nuevo@example.com"
    user.save(update_fields=["email_pendiente"])

    response = api_client.post(
        reverse("perfil:email-confirm"),
        {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": "token-invalido",
        },
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 400
    assert response.data == {
        "detail": "El enlace de verificación no es válido o ha caducado."
    }
    assert user.email == "perfil@example.com"
    assert user.email_pendiente == "nuevo@example.com"


@pytest.mark.django_db
def test_confirmar_cambio_email_sin_pendiente_devuelve_400(api_client, user):
    response = api_client.post(
        reverse("perfil:email-confirm"),
        _uid_token(user),
        format="json",
    )

    assert response.status_code == 400
    assert response.data == {
        "detail": "El enlace de verificación no es válido o ha caducado."
    }
