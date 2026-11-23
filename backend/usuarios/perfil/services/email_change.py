from __future__ import annotations

from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from usuarios.models import CustomUser


def solicitar_cambio_email(*, user: CustomUser, email: str) -> str:
    """Guarda el correo pendiente y envía el enlace a la nueva dirección."""
    normalized = CustomUser.objects.normalize_email(email)
    user.email_pendiente = normalized
    user.save(update_fields=["email_pendiente"])
    _send_email_change_verification(user=user)
    return normalized


def _send_email_change_verification(*, user: CustomUser) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    query = urlencode({"uid": uid, "token": token})
    confirmation_url = f"{settings.PROFILE_EMAIL_CHANGE_FRONTEND_URL}?{query}"

    send_mail(
        subject="Confirma tu nuevo correo de HabitSquad",
        message=(
            "Has solicitado cambiar el correo de tu cuenta. "
            "Para confirmar la nueva dirección, accede al siguiente enlace:\n\n"
            f"{confirmation_url}\n\n"
            "Si no has solicitado este cambio, puedes ignorar este mensaje."
        ),
        from_email=None,
        recipient_list=[user.email_pendiente],
        fail_silently=False,
    )


def confirmar_cambio_email(*, uid: str, token: str) -> CustomUser | None:
    """
    Aplica el email pendiente si el enlace es válido.

    Devuelve el usuario actualizado o None si el enlace no sirve.
    """
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = CustomUser.objects.get(pk=user_id, is_active=True)
    except (
        CustomUser.DoesNotExist,
        TypeError,
        ValueError,
        OverflowError,
    ):
        return None

    if not user.email_pendiente:
        return None
    if not default_token_generator.check_token(user, token):
        return None

    new_email = user.email_pendiente
    if CustomUser.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
        return None

    user.email = new_email
    user.email_pendiente = None
    user.save(update_fields=["email", "email_pendiente"])
    return user
