from __future__ import annotations

from usuarios.models import CustomUser


def cambiar_password(*, user: CustomUser, password: str) -> CustomUser:
    """Guarda la nueva contraseña; la anterior deja de ser válida."""
    user.set_password(password)
    user.save(update_fields=["password"])
    return user
