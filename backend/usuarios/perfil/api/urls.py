from django.urls import path

from .views import (
    PerfilDetailView,
    PerfilEmailChangeView,
    PerfilEmailConfirmView,
    PerfilFotoUploadView,
    PerfilPasswordChangeView,
)

app_name = "perfil"

urlpatterns = [
    path("perfil/", PerfilDetailView.as_view(), name="detalle"),
    path("perfil/foto/", PerfilFotoUploadView.as_view(), name="foto"),
    path("perfil/email/", PerfilEmailChangeView.as_view(), name="email"),
    path(
        "perfil/email/confirm/",
        PerfilEmailConfirmView.as_view(),
        name="email-confirm",
    ),
    path("perfil/password/", PerfilPasswordChangeView.as_view(), name="password"),
]
