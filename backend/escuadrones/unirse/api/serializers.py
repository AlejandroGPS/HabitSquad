from drf_spectacular.utils import extend_schema_field, extend_schema_serializer
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, NotFound

from escuadrones.crear.api.serializers import MembresiaSerializer
from escuadrones.crear.services.invitation_code import (
    INVITATION_CODE_ALPHABET,
    INVITATION_CODE_LENGTH,
)
from escuadrones.models import Escuadron
from escuadrones.unirse.services.join import (
    AlreadyMemberError,
    SquadronFullError,
    SquadronNotFoundError,
    normalize_invitation_code,
    unirse_escuadron,
)


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Ya perteneces a este escuadrón."
    default_code = "conflict"


class SquadronFull(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "El escuadrón ha alcanzado el límite de miembros."
    default_code = "squadron_full"


class PrivateSquad(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Solo puedes unirte sin código a escuadrones públicos."
    default_code = "private_squad"


@extend_schema_field(
    {
        "type": "string",
        "minLength": 6,
        "maxLength": 6,
        "pattern": "^[A-Za-z0-9]{6}$",
        "description": (
            "Código de invitación de 6 caracteres. Se aceptan minúsculas y "
            "se normalizan a mayúsculas."
        ),
        "example": "X8K9QL",
    }
)
class CodigoInvitacionField(serializers.CharField):
    pass


class EscuadronJoinSerializer(serializers.ModelSerializer):
    codigo_invitacion = CodigoInvitacionField()
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
            "nombre",
            "es_publico",
            "limite_miembros",
            "creador_id",
            "miembros",
        )

    def validate_codigo_invitacion(self, value):
        codigo = normalize_invitation_code(value)
        if len(codigo) != INVITATION_CODE_LENGTH:
            raise serializers.ValidationError(
                "El código de invitación debe tener 6 caracteres."
            )
        if any(character not in INVITATION_CODE_ALPHABET for character in codigo):
            raise serializers.ValidationError(
                "El código de invitación solo puede contener letras A-Z y dígitos."
            )
        return codigo

    def create(self, validated_data):
        try:
            return unirse_escuadron(
                codigo_invitacion=validated_data["codigo_invitacion"],
                usuario=self.context["request"].user,
            )
        except SquadronNotFoundError as error:
            raise NotFound(detail=str(error)) from error
        except AlreadyMemberError as error:
            raise Conflict(detail=str(error)) from error
        except SquadronFullError as error:
            raise SquadronFull(detail=str(error)) from error


@extend_schema_serializer(component_name="ErrorValidacionCodigoInvitacion")
class ErrorValidacionCodigoInvitacionSerializer(serializers.Serializer):
    codigo_invitacion = serializers.ListField(child=serializers.CharField())


@extend_schema_serializer(component_name="ErrorDetalleEscuadrones")
class ErrorDetalleSerializer(serializers.Serializer):
    detail = serializers.CharField()
