from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from usuarios.models import CustomUser


def send_email_verification(*, user: CustomUser) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    query = urlencode({"uid": uid, "token": token})
    verification_url = f"{settings.EMAIL_VERIFICATION_FRONTEND_URL}?{query}"

    send_mail(
        subject="Verifica tu correo de HabitSquad",
        message=(
            "Para verificar tu correo electrónico, accede al siguiente enlace:\n\n"
            f"{verification_url}\n\n"
            "Si no has creado esta cuenta, puedes ignorar este mensaje."
        ),
        from_email=None,
        recipient_list=[user.email],
        fail_silently=False,
    )


def get_unverified_user(*, uid: str, token: str) -> CustomUser | None:
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

    if user.email_verified or not default_token_generator.check_token(user, token):
        return None
    return user


def verify_email(*, uid: str, token: str) -> CustomUser | None:
    user = get_unverified_user(uid=uid, token=token)
    if user is None:
        return None

    user.email_verified = True
    user.save(update_fields=("email_verified",))
    return user
