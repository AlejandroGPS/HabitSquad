from rest_framework import serializers

from escuadrones.crear.services.creation import create_escuadron
from escuadrones.models import Escuadron, Membresia


class MembresiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membresia
        fields = ("usuario_id", "es_administrador")
        read_only_fields = ("usuario_id", "es_administrador")


class EscuadronCreateSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(max_length=100, trim_whitespace=True)
    miembros = MembresiaSerializer(source="membresias", many=True, read_only=True)
    creador_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Escuadron
        fields = (
            "id",
            "nombre",
            "codigo_invitacion",
            "es_publico",
            "limite_miembros",
            "creador_id",
            "miembros",
        )
        read_only_fields = (
            "id",
            "codigo_invitacion",
            "es_publico",
            "limite_miembros",
            "creador_id",
            "miembros",
        )

    def create(self, validated_data):
        return create_escuadron(
            nombre=validated_data["nombre"],
            creador=self.context["request"].user,
        )
