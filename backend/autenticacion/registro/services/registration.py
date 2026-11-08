from autenticacion.recuperacion.services.verification import send_email_verification
from usuarios.models import CustomUser


def create_registered_user(*, email: str, password: str) -> CustomUser:
    user = CustomUser.objects.create_user(
        email=email,
        password=password,
        email_verified=False,
    )
    send_email_verification(user=user)
    return user
