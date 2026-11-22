from django.urls import reverse
from rest_framework.test import APIClient


def test_alertas_endpoints_are_included_in_openapi_schema():
    response = APIClient().get(reverse("schema"))

    assert response.status_code == 200
    paths = response.data["paths"]

    assert "/api/alertas/vapid-public-key/" in paths
    assert "get" in paths["/api/alertas/vapid-public-key/"]
    assert "/api/alertas/suscripcion/" in paths
    assert "post" in paths["/api/alertas/suscripcion/"]
    assert "delete" in paths["/api/alertas/suscripcion/"]

    vapid = paths["/api/alertas/vapid-public-key/"]["get"]
    assert vapid["operationId"] == "obtenerClavePublicaVapid"
    assert vapid["tags"] == ["Alertas"]
    assert set(vapid["responses"]) >= {"200", "503"}
    assert "docs/ALERTAS.md" in vapid["description"]

    post = paths["/api/alertas/suscripcion/"]["post"]
    assert post["operationId"] == "registrarSuscripcionWebPush"
    assert set(post["responses"]) >= {"200", "201", "400", "401"}
    assert "docs/ALERTAS.md" in post["description"]

    delete = paths["/api/alertas/suscripcion/"]["delete"]
    assert delete["operationId"] == "eliminarSuscripcionWebPush"
    assert set(delete["responses"]) >= {"204", "400", "401"}
    assert "docs/ALERTAS.md" in delete["description"]
