from django.urls import path

from .views import EscuadronSelectorView

urlpatterns = [
    path("escuadrones/", EscuadronSelectorView.as_view(), name="selector-escuadrones"),
]
