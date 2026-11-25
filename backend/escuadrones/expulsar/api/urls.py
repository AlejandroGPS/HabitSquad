from django.urls import path

from .views import ExpulsarMiembroView

urlpatterns = [
    path(
        "escuadrones/<int:escuadron_id>/miembros/<int:usuario_id>/",
        ExpulsarMiembroView.as_view(),
        name="expulsar-miembro",
    ),
]
