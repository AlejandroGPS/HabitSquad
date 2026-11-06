from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from usuarios.models import CustomUser


def send_password_reset_email(*, user: CustomUser) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    query = urlencode({"uid": uid, "token": token})
    reset_url = f"{settings.PASSWORD_RESET_FRONTEND_URL}?{query}"

    send_mail(
        subject="Recuperación de contraseña de HabitSquad",
        message=(
            "Para establecer una nueva contraseña, accede al siguiente enlace:\n\n"
            f"{reset_url}\n\n"
            "Si no has solicitado este cambio, puedes ignorar este mensaje."
        ),
        from_email=None,
        recipient_list=[user.email],
        fail_silently=False,
    )
