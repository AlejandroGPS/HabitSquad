from django.urls import path

from .publicos import EscuadronesPublicosView
from .views import EscuadronSelectorView

urlpatterns = [
    path(
        "escuadrones/publicos/",
        EscuadronesPublicosView.as_view(),
        name="escuadrones-publicos",
    ),
    path("escuadrones/", EscuadronSelectorView.as_view(), name="selector-escuadrones"),
]
