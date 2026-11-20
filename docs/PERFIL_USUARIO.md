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
| Auth                         | JWT (`Authorization: Bearer <access>`) en todos los endpoints protegidos → `401` si falta o no es válido                                  |
| Confirmación de correo nuevo | Pública (sin JWT), con `uid` + `token` como en la verificación de email del registro                                                      |
| Consulta                     | `GET /api/perfil/`                                                                                                                        |
| Respuesta GET                | `id`, `email`, `nickname`, `foto_url` (URL firmada/temporal o `null`), `email_pendiente` (`null` si no hay cambio en curso), `hora_aviso` |
| Foto                         | `POST /api/perfil/foto/` multipart, campo `foto`, MIME `image/jpeg`, `image/png` o `image/webp`, máximo 5 MB                              |
| Foto OK                      | `200` al crear o reemplazar, cuerpo con al menos `foto_url` firmada/temporal                                                              |
| Almacenamiento foto          | Cloudinary (misma idea que la prueba diaria), en BD solo la referencia                                                                    |
| Actualización parcial        | `PATCH /api/perfil/` con uno o ambos de: `nickname`, `hora_aviso`                                                                         |
| Nickname                     | Tras `strip` no vacío, único ignorando mayúsculas/minúsculas; si está en uso → `400` y se conserva el actual                              |
| Hora aviso                   | Formato `HH:MM` (24 h); por defecto `20:00` si el usuario no la ha cambiado; inválida → `400` y se conserva la anterior                   |
| Solicitar correo nuevo       | `POST /api/perfil/email/` body `{ "email": "..." }`; normalización strip + minúsculas                                                     |
| Correo ocupado               | `400`; se conserva el correo de login actual                                                                                              |
| Correo libre                 | Se guarda como pendiente, se envía enlace a la nueva dirección; el login sigue con el correo actual hasta confirmar                       |
| Confirmar correo             | `POST /api/perfil/email/confirm/` body `{ "uid", "token" }`; solo entonces el nuevo email sustituye al actual                             |
| Contraseña                   | `POST /api/perfil/password/` body `password_actual`, `password`, `password_confirm`                                                       |
| Reglas contraseña            | Nueva no vacía; `password` === `password_confirm`; mismas reglas que `validate_password` en el registro; no se hace `trim`                |
| Tras cambiar contraseña      | Solo vale la nueva; la anterior deja de autenticar                                                                                        |
| Errores habituales           | `400` validación / conflicto de nickname o email; `401` sin JWT en rutas protegidas                                                       |

### Endpoints

| Método y ruta | Auth | Uso |
| --- | --- | --- |
| `GET /api/perfil/` | JWT | Consultar perfil |
| `PATCH /api/perfil/` | JWT | Cambiar nickname y/o hora_aviso |
| `POST /api/perfil/foto/` | JWT | Añadir o actualizar foto de perfil |
| `POST /api/perfil/email/` | JWT | Solicitar cambio de correo |
| `POST /api/perfil/email/confirm/` | Pública | Confirmar correo nuevo (uid + token) |
| `POST /api/perfil/password/` | JWT | Cambiar contraseña |

El detalle de cuerpos, ejemplos de respuesta y mensajes de error por endpoint
se completa en este mismo documento en el siguiente paso de documentación.
