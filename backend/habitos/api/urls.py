from django.urls import path

from .views import HabitoDiarioDetailView

app_name = "habitos"

urlpatterns = [
    path(
        "escuadrones/<int:escuadron_id>/habito/",
        HabitoDiarioDetailView.as_view(),
        name="habito-diario",
    ),
]
