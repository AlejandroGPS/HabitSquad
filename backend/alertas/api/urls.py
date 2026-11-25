from django.urls import path

from .views import SuscripcionView, VapidPublicKeyView

app_name = "alertas"

urlpatterns = [
    path(
        "alertas/vapid-public-key/",
        VapidPublicKeyView.as_view(),
        name="vapid-public-key",
    ),
    path(
        "alertas/suscripcion/",
        SuscripcionView.as_view(),
        name="suscripcion",
    ),
]
