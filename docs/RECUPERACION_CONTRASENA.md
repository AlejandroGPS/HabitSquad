# Recuperación de contraseña

La recuperación permite que un usuario establezca una nueva contraseña sin
iniciar sesión. El flujo utiliza el `PasswordResetTokenGenerator` nativo de
Django y no almacena tokens en texto plano ni crea una entidad adicional.

## Solicitar recuperación

`POST /api/auth/password-reset/`

No requiere autenticación.

```json
{
  "email": "person@example.com"
}
```

La respuesta correcta siempre tiene el mismo contenido, exista o no una
cuenta activa con ese email:

```json
{
  "detail": "Si existe una cuenta asociada a ese email, recibirás instrucciones para recuperar la contraseña."
}
```

El endpoint no envía correo a cuentas inexistentes o inactivas. Las solicitudes
anónimas están limitadas por IP.

## Confirmar recuperación

`POST /api/auth/password-reset/confirm/`

No requiere autenticación.

```json
{
  "uid": "MQ",
  "token": "token-generado-por-django",
  "new_password": "N3w!Secure-Password-497",
  "new_password_confirm": "N3w!Secure-Password-497"
}
```

Una respuesta correcta es:

```json
{
  "detail": "La contraseña se ha actualizado correctamente."
}
```

El endpoint rechaza tokens inválidos, manipulados, expirados o ya utilizados.
También rechaza contraseñas que no coincidan o incumplan los validadores
configurados en `AUTH_PASSWORD_VALIDATORS`.

## Seguridad y configuración

- Los enlaces expiran en una hora mediante `PASSWORD_RESET_TIMEOUT=3600`.
- El token queda invalidado cuando se actualiza la contraseña, porque el
  generador nativo incorpora el estado de la contraseña del usuario.
- La URL del formulario frontend se configura con
  `PASSWORD_RESET_FRONTEND_URL`; por defecto es
  `http://localhost:5173/reset-password`.
- En desarrollo se usa el backend de correo de consola.
- En producción se debe configurar `EMAIL_BACKEND`, `EMAIL_HOST`,
  `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` y
  `DEFAULT_FROM_EMAIL`.

El correo contiene un enlace con `uid` y `token` como parámetros de consulta:

```text
http://localhost:5173/reset-password?uid=...&token=...
```

No se incluyen contraseñas en correos, respuestas HTTP ni mensajes de error.
