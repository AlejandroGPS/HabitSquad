from django.urls import include, path

from .views import HabitoDiarioDetailView

app_name = "habitos"

urlpatterns = [
    path(
        "escuadrones/<int:escuadron_id>/habito/",
        HabitoDiarioDetailView.as_view(),
        name="habito-diario",
    ),
    path("", include("habitos.prueba.api.urls")),
    path("", include("habitos.validacion.api.urls")),
]
