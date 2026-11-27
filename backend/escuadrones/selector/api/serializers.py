from rest_framework import serializers

from escuadrones.detalle.api.serializers import EscuadronConMiembrosSerializer
from escuadrones.models import Escuadron


class EscuadronSelectorSerializer(EscuadronConMiembrosSerializer):
    pass


class EscuadronPublicoSerializer(serializers.ModelSerializer):
    miembros_actuales = serializers.IntegerField(read_only=True)
    racha = serializers.IntegerField(read_only=True)

    class Meta:
        model = Escuadron
        fields = (
            "id",
            "nombre",
            "es_publico",
            "limite_miembros",
            "miembros_actuales",
            "racha",
        )
        read_only_fields = fields
