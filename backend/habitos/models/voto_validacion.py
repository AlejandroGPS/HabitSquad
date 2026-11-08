from typing import ClassVar

from django.conf import settings
from django.db import models

from .registro_diario import RegistroDiario


class VotoValidacion(models.Model):
    class Valor(models.TextChoices):
        SI = "sí", "Sí"
        NO = "no", "No"

    registro = models.ForeignKey(
        RegistroDiario,
        on_delete=models.CASCADE,
        related_name="votos",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="votos_validacion",
    )
    voto = models.CharField(max_length=2, choices=Valor.choices)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "voto de validación"
        verbose_name_plural = "votos de validación"
        constraints: ClassVar[list] = [
            models.UniqueConstraint(
                fields=("registro", "usuario"),
                name="unique_voto_validacion_registro_usuario",
            ),
        ]

    def __str__(self):
        return f"{self.usuario_id} → {self.registro_id}: {self.voto}"
