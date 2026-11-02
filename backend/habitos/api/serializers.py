from rest_framework import serializers

from habitos.models import HabitoDiario


class HabitoDiarioSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if attrs.get("opcion") == HabitoDiario.Opcion.OTRO:
            texto = attrs.get("texto_personalizado", "")
            if not texto.strip():
                raise serializers.ValidationError(
                    {
                        "texto_personalizado": (
                            "Este campo es obligatorio para la opción «Otro»."
                        )
                    }
                )
            attrs["texto_personalizado"] = texto.strip()
        return attrs

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
