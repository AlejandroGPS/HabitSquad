from typing import ClassVar

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Escuadron(models.Model):
    nombre = models.CharField(max_length=100)
    creador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="escuadrones_creados",
    )
    codigo_invitacion = models.CharField(max_length=6, unique=True)
    es_publico = models.BooleanField(default=False)
    limite_miembros = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(2)],
    )
    miembros = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="Membresia",
        related_name="escuadrones",
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints: ClassVar[list] = [
            models.CheckConstraint(
                condition=Q(limite_miembros__gte=2),
                name="escuadron_limite_miembros_minimo_2",
            ),
        ]
        verbose_name = "escuadrón"
        verbose_name_plural = "escuadrones"

    def __str__(self):
        return self.nombre


class Membresia(models.Model):
    escuadron = models.ForeignKey(
        Escuadron,
        on_delete=models.CASCADE,
        related_name="membresias",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="membresias",
    )
    es_administrador = models.BooleanField(default=False)
    unido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "membresía"
        verbose_name_plural = "membresías"
        constraints: ClassVar[list] = [
            models.UniqueConstraint(
                fields=("escuadron", "usuario"),
                name="unique_membresia_escuadron_usuario",
            ),
        ]

    def __str__(self):
        rol = "administrador" if self.es_administrador else "miembro"
        return f"{self.usuario} ({rol}) en {self.escuadron}"
