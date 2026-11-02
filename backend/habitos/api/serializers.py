from rest_framework import serializers

from habitos.models import HabitoDiario


class HabitoDiarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = HabitoDiario
        fields = (
            "id",
            "opcion",
            "texto_personalizado",
            "creado_en",
            "actualizado_en",
        )
        read_only_fields = ("id", "creado_en", "actualizado_en")
