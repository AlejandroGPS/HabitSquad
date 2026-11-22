# Alertas inteligentes — contrato de API

Contrato acordado para las alertas de falta de prueba del día mediante
Web Push: suscripción del usuario autenticado, uso de la hora de aviso del
perfil y envío programado solo si ese día aún no hay prueba. La
implementación y la documentación OpenAPI (`/api/docs/`) deben respetar este
documento.

La hora de aviso se gestiona en el perfil
([PERFIL_USUARIO.md](PERFIL_USUARIO.md)). El worker Django Q2 de producción
es el mismo que el cierre diario
([SINCRONIZACION_TIEMPO_REAL.md](SINCRONIZACION_TIEMPO_REAL.md),
[DESPLIEGUE.md](DESPLIEGUE.md)). La sesión JWT sigue
[AUTENTICACION_JWT.md](AUTENTICACION_JWT.md). La prueba diaria está en
[PRUEBA_FOTO.md](PRUEBA_FOTO.md).

## Decisiones de diseño

| Tema | Acuerdo |
| --- | --- |
| Prefijo | `/api/alertas/` |
| Auth | JWT (`Authorization: Bearer <access>`) en endpoints protegidos → `401` si falta o no es válido |
| Clave pública VAPID | `GET /api/alertas/vapid-public-key/` (pública; el cliente la necesita para suscribirse) |
| Alta de suscripción | `POST /api/alertas/suscripcion/` con body Web Push (`endpoint`, `keys.p256dh`, `keys.auth`) |
| Baja de suscripción | `DELETE /api/alertas/suscripcion/` con el `endpoint` de la suscripción a eliminar |
| Hora de aviso | No se duplica: se consulta y cambia en `GET`/`PATCH /api/perfil/` (`hora_aviso`, default `20:00`, formato `HH:MM`, zona de la app `Europe/Madrid`) |
| Cuándo enviar | A la `hora_aviso` del usuario, si ese día (calendario `Europe/Madrid`) **no** tiene prueba subida |
| Cuándo no enviar | Si ya existe al menos un registro de prueba del usuario con fecha de hoy; o no hay suscripción; o el usuario no tiene hábito en ningún escuadrón |
| Envío programado | No hay endpoint HTTP para «disparar» la alerta; lo ejecuta el worker Django Q2 (mismo proceso/infra que el cierre diario) |
| VAPID | Claves en variables de entorno; solo la pública se expone por API; nunca secretos en el repositorio |
| Fuera de este contrato HTTP | UI, permisos del navegador, service worker / PWA (frontend) |

## Rutas

| Método | Ruta | Auth | Función |
| --- | --- | --- | --- |
| `GET` | `/api/alertas/vapid-public-key/` | Pública | Devuelve la clave pública VAPID para el cliente |
| `POST` | `/api/alertas/suscripcion/` | JWT | Registra o actualiza la suscripción Web Push del usuario |
| `DELETE` | `/api/alertas/suscripcion/` | JWT | Elimina la suscripción Web Push del usuario |

## Obtener la clave pública VAPID

### Endpoint

`GET /api/alertas/vapid-public-key/`

Pública: no requiere JWT. El frontend la usa al suscribirse a Web Push en el
navegador.

### Petición

```http
GET /api/alertas/vapid-public-key/
```

No lleva cuerpo.

### Respuesta correcta

`200 OK`

```json
{
  "public_key": "BNcRdsa...ejemplo..."
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `public_key` | string | Clave pública VAPID en el formato que espera el cliente Web Push (p. ej. URL-safe base64). |

### Errores

| Código | Condición |
| --- | --- |
| `503 Service Unavailable` | La clave pública no está configurada en el servidor. |

## Registrar o actualizar la suscripción Web Push

### Endpoint

`POST /api/alertas/suscripcion/`

Requiere autenticación JWT. Asocia la suscripción del navegador al usuario
autenticado. Si ya existía la misma `endpoint` para ese usuario, se actualizan
las claves.

### Petición

```http
POST /api/alertas/suscripcion/
Authorization: Bearer <access>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcR...",
    "auth": "tBHI..."
  }
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `endpoint` | string (`uri`) | sí | URL del servicio push; tras `strip` no vacía. |
| `keys` | object | sí | Objeto con las claves de la suscripción. |
| `keys.p256dh` | string | sí | Clave pública del cliente; tras `strip` no vacía. |
| `keys.auth` | string | sí | Secreto de autenticación; tras `strip` no vacío. |

### Respuesta correcta

`201 Created` si es una suscripción nueva para ese `endpoint` y usuario.

`200 OK` si se actualiza una suscripción ya existente con el mismo `endpoint`.

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "creado": true
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `endpoint` | string (`uri`) | Endpoint registrado. |
| `creado` | boolean | `true` si se creó; `false` si se actualizó. |

### Efectos

1. Se valida el cuerpo; si falta algún campo o está vacío → `400`.
2. Se guarda o actualiza la suscripción ligada al usuario del JWT.
3. No cambia `hora_aviso` ni dispara un envío inmediato.

### Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Body incompleto o campos vacíos / inválidos. |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |

Ejemplo de validación (`400`):

```json
{
  "endpoint": ["Este campo es obligatorio."]
}
```

## Eliminar la suscripción Web Push

### Endpoint

`DELETE /api/alertas/suscripcion/`

Requiere autenticación JWT. Elimina la suscripción del usuario autenticado
identificada por `endpoint`.

### Petición

```http
DELETE /api/alertas/suscripcion/
Authorization: Bearer <access>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `endpoint` | string (`uri`) | sí | Debe coincidir con una suscripción del usuario autenticado. |

### Respuesta correcta

`204 No Content`

Sin cuerpo.

### Efectos

1. Si la suscripción existe y pertenece al usuario, se elimina.
2. Si no existe para ese usuario, la operación es idempotente: también `204`
   (no se revela si el endpoint existía).

### Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Falta `endpoint` o está vacío. |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |

## Hora de aviso (perfil)

La hora a la que el sistema intenta enviar el recordatorio es `hora_aviso` del
usuario. No hay endpoints bajo `/api/alertas/` para leerla o cambiarla.

- Consulta: `GET /api/perfil/` → campo `hora_aviso` (default `20:00`).
- Cambio: `PATCH /api/perfil/` con `{ "hora_aviso": "21:30" }`.

Contrato detallado: [PERFIL_USUARIO.md](PERFIL_USUARIO.md). Tras un cambio
válido, los avisos posteriores usan la nueva hora (calendario
`Europe/Madrid`).

## Comportamiento del envío programado (no es un endpoint HTTP)

El worker Django Q2 (mismo servicio Compose/`qcluster` que el cierre diario)
evalúa, en la zona `Europe/Madrid`, qué usuarios deben recibir el aviso a su
`hora_aviso`.

### Condiciones para enviar

Se envía una notificación Web Push al usuario si se cumplen todas:

1. Tiene al menos una suscripción registrada.
2. Tiene al menos un hábito diario asignado en algún escuadrón.
3. En la fecha local de hoy (`Europe/Madrid`) **no** existe ningún
   `RegistroDiario` (prueba) asociado a sus hábitos.
4. La hora local actual corresponde a su `hora_aviso` (según la
   planificación acordada en la implementación; p. ej. ventana del minuto
   configurado).

### Condiciones para no enviar

No se envía si:

- Ya hay al menos una prueba del usuario con fecha de hoy, o
- No hay suscripción, o
- No tiene hábito en ningún escuadrón, o
- Las claves VAPID no permiten el envío (error de configuración; no se
  inventan endpoints de diagnóstico en este contrato).

El contenido textual de la notificación (título/cuerpo) lo fija la
implementación; este contrato solo fija cuándo se intenta el envío.

## Variables de entorno (VAPID)

Nombres previstos (solo placeholders en `.env.example`; valores reales solo
en el entorno de despliegue):

| Variable | Uso |
| --- | --- |
| `VAPID_PUBLIC_KEY` | Clave pública expuesta por `GET /api/alertas/vapid-public-key/` |
| `VAPID_PRIVATE_KEY` | Clave privada solo en servidor; nunca en el cliente ni en el repo |
| `VAPID_ADMIN_EMAIL` | Contacto VAPID exigido por la especificación (mailto o URL) |

Si falta la clave pública, `GET /api/alertas/vapid-public-key/` responde
`503`.

## Notas

1. Un usuario puede tener varias suscripciones (varios dispositivos); cada
   una se identifica por `endpoint`.
2. Cambiar `hora_aviso` en el perfil no requiere volver a suscribirse.
3. El frontend gestiona permisos del navegador y el service worker; este
   documento solo cubre la API y el criterio de envío.
4. El worker Q2 de alertas reutiliza la infra documentada en
   [SINCRONIZACION_TIEMPO_REAL.md](SINCRONIZACION_TIEMPO_REAL.md) y
   [DESPLIEGUE.md](DESPLIEGUE.md); no exige Channels ni WebSockets.
