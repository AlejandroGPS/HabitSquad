from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from escuadrones.models import Escuadron, Membresia
from habitos.api.serializers import HabitoDiarioSerializer
from habitos.models import RegistroDiario


class ResumenPruebaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroDiario
        fields = ("id", "estado")
        read_only_fields = fields


class DiaSemanaSerializer(serializers.Serializer):
    fecha = serializers.DateField()
    estado = serializers.ChoiceField(
        choices=RegistroDiario.Estado.choices,
        allow_null=True,
    )


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


class MembresiaConPruebaSerializer(MembresiaDetalleSerializer):
    nombre = serializers.CharField(source="usuario.get_full_name", read_only=True)
    es_usuario = serializers.SerializerMethodField()
    prueba_hoy = serializers.SerializerMethodField()
    semana = serializers.SerializerMethodField()

    class Meta(MembresiaDetalleSerializer.Meta):
        fields = (
            *MembresiaDetalleSerializer.Meta.fields,
            "nombre",
            "es_usuario",
            "prueba_hoy",
            "semana",
        )
        read_only_fields = fields

    def get_es_usuario(self, obj) -> bool:
        return obj.usuario_id == self.context["request"].user.pk

    @extend_schema_field(ResumenPruebaSerializer(allow_null=True))
    def get_prueba_hoy(self, obj):
        habito = getattr(obj, "habito_diario", None)
        if habito and habito.pruebas_hoy:
            return ResumenPruebaSerializer(habito.pruebas_hoy[0]).data
        return None

    @extend_schema_field(DiaSemanaSerializer(many=True))
    def get_semana(self, obj):
        return DiaSemanaSerializer(self.context["resumen"].semana(obj), many=True).data


class EscuadronConMiembrosSerializer(serializers.ModelSerializer):
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


class EscuadronDetalleSerializer(EscuadronConMiembrosSerializer):
    miembros = MembresiaConPruebaSerializer(
        source="membresias",
        many=True,
        read_only=True,
    )
    racha = serializers.SerializerMethodField()

    class Meta(EscuadronConMiembrosSerializer.Meta):
        fields = (*EscuadronConMiembrosSerializer.Meta.fields, "racha")
        read_only_fields = fields

    def get_racha(self, obj) -> int:
        return self.context["resumen"].racha
