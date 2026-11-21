import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_protected_perfil_endpoint_requires_auth(api_client):
    response = api_client.get(reverse("perfil:detalle"))

    assert response.status_code == 401
