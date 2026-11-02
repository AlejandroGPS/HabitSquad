from django.urls import include, path

app_name = "escuadrones"

urlpatterns = [
    path("", include("escuadrones.unirse.api.urls")),
    path("", include("escuadrones.crear.api.urls")),
    path("", include("escuadrones.detalle.api.urls")),
]
