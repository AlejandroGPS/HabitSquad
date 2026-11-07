from usuarios.models import CustomUser


def create_registered_user(*, email: str, password: str) -> CustomUser:
    return CustomUser.objects.create_user(
        email=email,
        password=password,
        email_verified=False,
    )
