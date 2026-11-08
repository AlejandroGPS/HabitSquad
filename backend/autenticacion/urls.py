from django.urls import include, path

app_name = "autenticacion"

urlpatterns = [
    path("", include("autenticacion.logout.api.urls")),
    path("", include("autenticacion.login.api.urls")),
    path("", include("autenticacion.refresh.api.urls")),
    path("", include("autenticacion.registro.api.urls")),
    path("", include("autenticacion.recuperacion.api.urls")),
]
