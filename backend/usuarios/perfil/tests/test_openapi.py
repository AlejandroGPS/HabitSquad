from django.urls import reverse
from rest_framework.test import APIClient


def test_perfil_endpoints_are_included_in_openapi_schema():
    response = APIClient().get(reverse("schema"))

    assert response.status_code == 200
    paths = response.data["paths"]
    assert "/api/perfil/" in paths
    assert "get" in paths["/api/perfil/"]
    assert "patch" in paths["/api/perfil/"]
    assert "/api/perfil/foto/" in paths
    assert "/api/perfil/email/" in paths
    assert "/api/perfil/email/confirm/" in paths
    assert "/api/perfil/password/" in paths
    assert "docs/PERFIL_USUARIO.md" in paths["/api/perfil/"]["get"]["description"]
