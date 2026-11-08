from django.urls import path

from .views import ValidacionVotoView

app_name = "validacion"

urlpatterns = [
    path(
        "escuadrones/<int:escuadron_id>/pruebas/<int:registro_id>/votos/",
        ValidacionVotoView.as_view(),
        name="votos-prueba",
    ),
]
