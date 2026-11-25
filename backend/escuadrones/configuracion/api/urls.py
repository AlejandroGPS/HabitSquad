from django.urls import path

from .views import EscuadronConfiguracionView

urlpatterns = [
    path(
        "escuadrones/<int:escuadron_id>/configuracion/",
        EscuadronConfiguracionView.as_view(),
        name="configuracion-escuadron",
    ),
]
