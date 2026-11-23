from django.contrib import admin

from .models import SuscripcionPush


@admin.register(SuscripcionPush)
class SuscripcionPushAdmin(admin.ModelAdmin):
    list_display = ("id", "usuario", "endpoint", "creado_en", "actualizado_en")
    search_fields = ("endpoint", "usuario__email", "usuario__nickname")
    readonly_fields = ("creado_en", "actualizado_en")
