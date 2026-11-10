# Recuperación de contraseña y verificación de email

HabitSquad verifica que el usuario controle el email registrado antes de
permitirle iniciar sesión. La recuperación permite establecer una nueva
contraseña sin iniciar sesión. Ambos flujos utilizan el
`PasswordResetTokenGenerator` nativo de Django y no almacenan tokens en texto
plano ni crean una entidad adicional.

## Registro y verificación del email

`POST /api/auth/register/`

El registro crea la cuenta con `email_verified=false` y envía un enlace de
verificación al email indicado. Hasta confirmar el enlace, la cuenta no puede
iniciar sesión ni recibir tokens JWT.

El frontend debe abrir el enlace recibido y enviar sus parámetros a:

`POST /api/auth/email-verification/confirm/`

```json
{
  "uid": "MQ",
  "token": "token-generado-por-django"
}
```

Una respuesta correcta es:

```json
{
  "detail": "El email se ha verificado correctamente."
}
```

El enlace es temporal, de un solo uso y se rechaza si el usuario ya estaba
verificado. Los tokens inválidos, manipulados o expirados devuelven `400`.

Si el correo no llegó, puede solicitarse otro enlace mediante:

`POST /api/auth/email-verification/`

```json
{
  "email": "person@example.com"
}
```

La respuesta es neutra para no revelar si existe una cuenta pendiente:

```json
{
  "detail": "Si existe una cuenta pendiente de verificación, recibirás un nuevo enlace por email."
}
```

Las solicitudes de verificación y reenvío no requieren autenticación y están
limitadas por IP.

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
- En desarrollo, el enlace abre `http://localhost:5173/reset-password`.
  En Docker Compose abre `https://<SITE_ADDRESS>/reset-password`.
  Define `PASSWORD_RESET_FRONTEND_URL` para usar otra URL.
- La URL de verificación se configura con
  `EMAIL_VERIFICATION_FRONTEND_URL`. En desarrollo apunta a
  `http://localhost:5173/verify-email`. Docker Compose usa
  `https://<SITE_ADDRESS>/verify-email` si no se indica otra URL.
- En desarrollo se usa el backend de correo de consola.
- En producción se debe configurar `EMAIL_BACKEND`, `EMAIL_HOST`,
  `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` y
  `DEFAULT_FROM_EMAIL`.

El correo contiene un enlace con `uid` y `token` como parámetros de consulta:

```text
http://localhost:5173/reset-password?uid=...&token=...
```

El correo de verificación utiliza la URL configurada en
`EMAIL_VERIFICATION_FRONTEND_URL`:

```text
http://localhost:5173/verify-email?uid=...&token=...
```

No se incluyen contraseñas en correos, respuestas HTTP ni mensajes de error.
