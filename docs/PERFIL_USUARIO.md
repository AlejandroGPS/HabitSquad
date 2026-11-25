# Perfil de usuario — contrato de API

Contrato acordado para consultar y actualizar el perfil del usuario
autenticado: foto de perfil, nickname, cambio de correo (con verificación),
cambio de contraseña y hora del aviso de falta de prueba del día. La
implementación y la documentación OpenAPI (`/api/docs/`) deben respetar este
documento.

Reutiliza el patrón de foto de [PRUEBA_FOTO.md](PRUEBA_FOTO.md), las reglas de
nickname y contraseña de [REGISTRO.md](REGISTRO.md), el flujo de verificación
por enlace de [RECUPERACION_CONTRASENA.md](RECUPERACION_CONTRASENA.md) y la
sesión JWT de [AUTENTICACION_JWT.md](AUTENTICACION_JWT.md).

## Decisiones de diseño

| Tema                         | Acuerdo                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Prefijo                      | `/api/perfil/`                                                                                                                            |
| Auth                         | JWT (`Authorization: Bearer <access>`) en endpoints protegidos → `401` si falta o no es válido                                            |
| Confirmación de correo nuevo | Pública (sin JWT), con `uid` + `token` como en la verificación de email del registro                                                      |
| Consulta                     | `GET /api/perfil/`                                                                                                                        |
| Respuesta GET                | `id`, `email`, `nickname`, `foto_url` (URL firmada/temporal o `null`), `email_pendiente` (`null` si no hay cambio en curso), `hora_aviso` |
| Foto                         | `POST /api/perfil/foto/` multipart, campo `foto`, MIME `image/jpeg`, `image/png` o `image/webp`; máximo 5 MB                              |
| Foto OK                      | `200` al crear o reemplazar, cuerpo con al menos `foto_url` firmada/temporal                                                              |
| Almacenamiento foto          | Cloudinary (misma idea que la prueba diaria), en BD solo la referencia                                                                    |
| Actualización parcial        | `PATCH /api/perfil/` con uno o ambos de: `nickname`, `hora_aviso`                                                                         |
| Nickname                     | Tras `strip` no vacío; único ignorando mayúsculas/minúsculas; si está en uso → `400` y se conserva el actual                              |
| Hora aviso                   | Formato `HH:MM` (24 h); por defecto `20:00` si el usuario no la ha cambiado; inválida → `400` y se conserva la anterior                   |
| Solicitar correo nuevo       | `POST /api/perfil/email/` body `{ "email": "..." }`; normalización strip + minúsculas                                                     |
| Correo ocupado               | `400`; se conserva el correo de login actual                                                                                              |
| Correo libre                 | Se guarda como pendiente, se envía enlace a la nueva dirección; el login sigue con el correo actual hasta confirmar                       |
| Confirmar correo             | `POST /api/perfil/email/confirm/` body `{ "uid", "token" }`; solo entonces el nuevo email sustituye al actual                             |
| Contraseña                   | `POST /api/perfil/password/` body `password_actual`, `password`, `password_confirm`                                                       |
| Reglas contraseña            | Nueva no vacía; `password` === `password_confirm`; mismas reglas que `validate_password` en el registro; no se hace `trim`                |
| Tras cambiar contraseña      | Solo vale la nueva; la anterior deja de autenticar                                                                                        |
| Errores habituales           | `400` validación / conflicto de nickname o email; `401` sin JWT en rutas protegidas                                                       |

## Consultar el perfil

### Endpoint

`GET /api/perfil/`

Requiere autenticación JWT.

### Petición

```http
GET /api/perfil/
Authorization: Bearer <access>
```

No lleva cuerpo.

### Respuesta correcta

`200 OK`

```json
{
  "id": 1,
  "email": "persona@example.com",
  "nickname": "HabitHero",
  "foto_url": "https://res.cloudinary.com/ejemplo/image/upload/s--firma--/v1/perfiles/abc123.jpg",
  "email_pendiente": null,
  "hora_aviso": "20:00"
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | integer | Identificador del usuario. |
| `email` | string | Email actual de login (normalizado). |
| `nickname` | string | Nombre de usuario público. |
| `foto_url` | string (`uri`) o `null` | URL firmada o temporal de la foto de perfil. `null` si aún no hay foto. No es una URL pública permanente. |
| `email_pendiente` | string (email) o `null` | Nueva dirección solicitada y aún no confirmada. `null` si no hay cambio en curso. |
| `hora_aviso` | string | Hora del aviso de falta de prueba del día en formato `HH:MM` (24 h). Por defecto `20:00`. |

### Errores

| Código | Condición |
| --- | --- |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |

## Actualizar nickname y/o hora de aviso

### Endpoint

`PATCH /api/perfil/`

Requiere autenticación JWT. Se puede enviar solo `nickname`, solo `hora_aviso`
o ambos. Los campos omitidos no se modifican.

### Petición

```http
PATCH /api/perfil/
Authorization: Bearer <access>
Content-Type: application/json

{
  "nickname": "NuevoHero",
  "hora_aviso": "21:30"
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `nickname` | string | no | Si se envía: tras `strip` no vacío; único respecto a otros usuarios sin distinguir mayúsculas/minúsculas. Si coincide con el nickname actual del propio usuario (mismo valor tras normalizar comparación), se acepta sin error. |
| `hora_aviso` | string | no | Si se envía: formato `HH:MM` en 24 horas (p. ej. `09:05`, `20:00`). |

Debe enviarse al menos uno de los dos campos.

### Respuesta correcta

`200 OK`

El cuerpo tiene la misma forma que `GET /api/perfil/` (perfil actualizado).

### Efectos

1. Si viene `nickname`, se valida y, si está libre, se guarda; si está en uso

   por otro usuario, se rechaza y se conserva el nickname actual.
2. Si viene `hora_aviso`, se valida el formato y se persiste para los días

   siguientes; si es inválida, se rechaza y se conserva la hora anterior.
3. Los campos no enviados no cambian.

### Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Ningún campo enviable; `nickname` vacío tras strip; nickname en uso; `hora_aviso` con formato inválido. |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |

Ejemplo de nickname duplicado (`400`):

```json
{
  "nickname": ["Ya existe una cuenta con este nickname."]
}
```

Ejemplo de hora inválida (`400`):

```json
{
  "hora_aviso": ["Indica la hora en formato HH:MM."]
}
```

## Subir o actualizar la foto de perfil

### Endpoint

`POST /api/perfil/foto/`

Requiere autenticación JWT.

### Petición

```http
POST /api/perfil/foto/
Authorization: Bearer <access>
Content-Type: multipart/form-data

foto: <archivo de imagen>
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `foto` | file | sí | Imagen con tipo MIME `image/jpeg`, `image/png` o `image/webp`. Tamaño máximo 5 MB. |

### Respuesta correcta

`200 OK`

```json
{
  "foto_url": "https://res.cloudinary.com/ejemplo/image/upload/s--firma--/v1/perfiles/abc123.jpg"
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `foto_url` | string (`uri`) | URL firmada o temporal de la foto guardada. |

La imagen se almacena fuera de la API (Cloudinary). En base de datos solo se
persiste la referencia necesaria para generar esa URL. Una nueva subida
reemplaza la foto anterior del mismo usuario.

### Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Falta `foto`, el tipo MIME no está permitido o el fichero supera 5 MB. |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |

Ejemplo de validación (`400`):

```json
{
  "foto": ["No se ha enviado ninguna imagen."]
}
```

## Solicitar cambio de correo

### Endpoint

`POST /api/perfil/email/`

Requiere autenticación JWT.

### Petición

```http
POST /api/perfil/email/
Authorization: Bearer <access>
Content-Type: application/json

{
  "email": "nuevo@example.com"
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `email` | string (email) | sí | Tras normalizar (strip + minúsculas), formato válido y no usado como email de login de otra cuenta. No debe ser igual al email actual del usuario. |

### Respuesta correcta

`200 OK`

```json
{
  "detail": "Si la dirección es válida, recibirás un enlace de verificación en el nuevo correo.",
  "email_pendiente": "nuevo@example.com"
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `detail` | string | Mensaje informativo. |
| `email_pendiente` | string | Dirección solicitada, pendiente de confirmación. |

### Efectos

1. Se normaliza y valida el email.
2. Si ya está registrado en otra cuenta, se responde `400` y no cambia nada.
3. Si está libre, se guarda como correo pendiente y se envía un enlace de

   verificación a esa dirección.
4. El email de login (`email`) no cambia hasta confirmar el enlace.
5. Mientras tanto, `GET /api/perfil/` puede mostrar `email_pendiente` y el

   usuario sigue iniciando sesión con el correo anterior.

### Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Email ausente o inválido; ya registrado; igual al email actual. |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |

Ejemplo de email ya registrado (`400`):

```json
{
  "email": ["Ya existe una cuenta con este email."]
}
```

## Confirmar el correo nuevo

### Endpoint

`POST /api/perfil/email/confirm/`

No requiere autenticación. El frontend abre el enlace recibido en el correo
pendiente y envía sus parámetros a este endpoint.

### Petición

```http
POST /api/perfil/email/confirm/
Content-Type: application/json

{
  "uid": "MQ",
  "token": "token-generado-por-django"
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `uid` | string | sí | Identificador del usuario codificado en el enlace. |
| `token` | string | sí | Token de un solo uso asociado al cambio de correo pendiente. |

### Respuesta correcta

`200 OK`

```json
{
  "detail": "El correo se ha actualizado correctamente.",
  "email": "nuevo@example.com"
}
```

### Efectos

1. Se valida `uid` + `token` respecto al cambio pendiente.
2. El nuevo email pasa a ser el de login; `email_pendiente` queda vacío.
3. A partir de ese momento, `POST /api/auth/token/` debe usar el correo nuevo.
4. Tokens inválidos, expirados o sin cambio pendiente → `400`.

### Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | `uid`/`token` ausentes, inválidos, expirados o sin solicitud de cambio pendiente. |

Ejemplo (`400`):

```json
{
  "detail": "El enlace de verificación no es válido o ha caducado."
}
```

## Cambiar la contraseña

### Endpoint

`POST /api/perfil/password/`

Requiere autenticación JWT.

### Petición

```http
POST /api/perfil/password/
Authorization: Bearer <access>
Content-Type: application/json

{
  "password_actual": "S0mething!Secure-497",
  "password": "N3w!Secure-Password-88",
  "password_confirm": "N3w!Secure-Password-88"
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `password_actual` | string | sí | `write_only`. Debe coincidir con la contraseña vigente. No se hace `trim`. |
| `password` | string | sí | `write_only`. Nueva contraseña; no vacía; mismas reglas que `validate_password` en el registro. No se hace `trim`. |
| `password_confirm` | string | sí | `write_only`. Debe ser exactamente igual a `password`. |

### Respuesta correcta

`200 OK`

```json
{
  "detail": "La contraseña se ha actualizado correctamente."
}
```

### Efectos

1. Se comprueba `password_actual`.
2. Se comprueba que `password` y `password_confirm` coinciden.
3. Se aplica `validate_password` sobre `password`.
4. Se guarda la nueva contraseña; la anterior deja de ser válida para

   `POST /api/auth/token/`.

### Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Campos ausentes; contraseña actual incorrecta; nueva vacía; confirmación distinta; la nueva no cumple los requisitos. |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |

Ejemplo de contraseña actual incorrecta (`400`):

```json
{
  "password_actual": ["La contraseña actual no es correcta."]
}
```

Ejemplo de confirmación distinta (`400`):

```json
{
  "password_confirm": ["Las contraseñas no coinciden."]
}
```

## Notas

- `foto_url` es siempre firmada o temporal cuando hay foto; el cliente no debe
tratarla como enlace permanente ni cachearla a largo plazo.
- Hasta confirmar el correo nuevo, el login y el resto de la API siguen
asociados al email anterior.
- El enlace de confirmación de correo nuevo se construye con
  `PROFILE_EMAIL_CHANGE_FRONTEND_URL` (por defecto
  `http://localhost:5173/perfil/confirmar-email`; en Docker Compose
  `https://<SITE_ADDRESS>/perfil/confirmar-email`).
- La especificación OpenAPI está en `/api/schema/` y la UI en `/api/docs/`.
