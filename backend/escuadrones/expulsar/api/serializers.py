from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers


@extend_schema_serializer(component_name="ErrorDetalleExpulsion")
class ErrorDetalleExpulsionSerializer(serializers.Serializer):
    detail = serializers.CharField()
