from rest_framework import serializers

from escuadrones.models import Escuadron


class EscuadronConfiguracionSerializer(serializers.ModelSerializer):
    limite_miembros = serializers.IntegerField(min_value=2)
    miembros_actuales = serializers.SerializerMethodField()

    class Meta:
        model = Escuadron
        fields = (
            "id",
            "nombre",
            "es_publico",
            "limite_miembros",
            "miembros_actuales",
        )
        read_only_fields = ("id", "miembros_actuales")

    def get_miembros_actuales(self, obj) -> int:
        return obj.membresias.count()
