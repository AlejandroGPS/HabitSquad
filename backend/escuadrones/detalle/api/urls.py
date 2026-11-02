from django.urls import path

from .views import EscuadronDetailView

urlpatterns = [
    path(
        "escuadrones/<int:escuadron_id>/",
        EscuadronDetailView.as_view(),
        name="detalle-escuadron",
    ),
]
