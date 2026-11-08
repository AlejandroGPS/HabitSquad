import binascii

from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from usuarios.models import CustomUser


def get_reset_user(*, uid: str, token: str) -> CustomUser | None:
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = CustomUser.objects.get(pk=user_id, is_active=True)
    except (
        CustomUser.DoesNotExist,
        TypeError,
        ValueError,
        OverflowError,
        UnicodeDecodeError,
        binascii.Error,
    ):
        return None

    if not default_token_generator.check_token(user, token):
        return None
    return user


def reset_password(
    *,
    uid: str,
    token: str,
    password: str,
    validate_only: bool = False,
) -> CustomUser | None:
    user = get_reset_user(uid=uid, token=token)
    if user is None:
        return None

    if not validate_only:
        user.set_password(password)
        user.save(update_fields=("password",))
    return user
