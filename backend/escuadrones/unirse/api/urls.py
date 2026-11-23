from django.urls import path

from .views import EscuadronJoinView, PublicSquadJoinView

urlpatterns = [
    path("escuadrones/unirse/", EscuadronJoinView.as_view(), name="unirse-escuadron"),
    path(
        "escuadrones/<int:escuadron_id>/unirse/",
        PublicSquadJoinView.as_view(),
        name="unirse-escuadron-publico",
    ),
]
