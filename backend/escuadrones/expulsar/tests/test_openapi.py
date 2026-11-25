import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_expulsion_openapi_documenta_ruta_parametros_y_respuestas():
    response = APIClient().get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"][
        "/api/escuadrones/{escuadron_id}/miembros/{usuario_id}/"
    ]["delete"]

    assert operation["operationId"] == "expulsarMiembroEscuadron"
    assert operation["summary"] == "Expulsar un miembro de un escuadrón"
    assert operation["tags"] == ["Escuadrones"]
    assert "miembro no administrador" in operation["description"]
    parameters = {parameter["name"]: parameter for parameter in operation["parameters"]}
    assert set(parameters) == {
        "escuadron_id",
        "usuario_id",
    }
    for parameter in parameters.values():
        assert parameter["in"] == "path"
        assert parameter["required"] is True
        assert parameter["schema"]["type"] == "integer"
    assert set(operation["responses"]) == {"204", "401", "403", "404"}
    assert "content" not in operation["responses"]["204"]
    assert operation["responses"]["204"]["description"].startswith(
        "Membresía eliminada"
    )
    assert (
        operation["responses"]["401"]["content"]["application/json"]["schema"]["$ref"]
        == "#/components/schemas/ErrorDetalleExpulsion"
    )
    assert (
        operation["responses"]["403"]["content"]["application/json"]["schema"]["$ref"]
        == "#/components/schemas/ErrorDetalleExpulsion"
    )
    assert (
        operation["responses"]["404"]["content"]["application/json"]["schema"]["$ref"]
        == "#/components/schemas/ErrorDetalleExpulsion"
    )


@pytest.mark.django_db
def test_documentacion_interactiva_openapi_esta_disponible():
    response = APIClient().get(reverse("swagger-ui"))

    assert response.status_code == 200
