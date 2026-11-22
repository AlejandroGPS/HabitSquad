"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.urls import path  # noqa: E402

from escuadrones.tiempo_real.consumers import (  # noqa: E402
    SincronizacionEscuadronConsumer,
)

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter(
            [
                path(
                    "ws/escuadrones/<int:escuadron_id>/",
                    SincronizacionEscuadronConsumer.as_asgi(),
                ),
            ]
        ),
    }
)
