from rest_framework import serializers

from escuadrones.models import Escuadron, Membresia
from habitos.api.serializers import HabitoDiarioSerializer


class MembresiaDetalleSerializer(serializers.ModelSerializer):
    usuario_id = serializers.IntegerField(read_only=True)
    habito = HabitoDiarioSerializer(
        source="habito_diario",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Membresia
        fields = ("usuario_id", "es_administrador", "habito")
        read_only_fields = fields


class EscuadronDetalleSerializer(serializers.ModelSerializer):
    creador_id = serializers.IntegerField(read_only=True)
    miembros = MembresiaDetalleSerializer(
        source="membresias",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Escuadron
        fields = (
            "id",
            "nombre",
            "codigo_invitacion",
            "creador_id",
            "miembros",
        )
        read_only_fields = fields
