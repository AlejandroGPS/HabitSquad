from django.urls import path

from .views import PruebaFotoDetailView, PruebaFotoUploadView

app_name = "prueba"

urlpatterns = [
    path(
        "escuadrones/<int:escuadron_id>/prueba/",
        PruebaFotoUploadView.as_view(),
        name="subir-prueba-foto",
    ),
    path(
        "escuadrones/<int:escuadron_id>/pruebas/<int:registro_id>/",
        PruebaFotoDetailView.as_view(),
        name="visualizar-prueba-foto",
    ),
]
