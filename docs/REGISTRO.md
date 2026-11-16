# Registro de usuario — contrato de API

Contrato acordado para el alta de cuenta con **email**, **contraseña**,
**confirmación de contraseña** y **nickname** único. La implementación y la
documentación OpenAPI (`/api/docs/`) deben respetar este documento.

La sesión JWT no se entrega en el registro: tras verificar el email, el cliente
obtiene tokens con `POST /api/auth/token/`. Ver
[AUTENTICACION_JWT.md](AUTENTICACION_JWT.md) y
[RECUPERACION_CONTRASENA.md](RECUPERACION_CONTRASENA.md).

## Decisiones de diseño (congeladas)

| Tema | Acuerdo |
| --- | --- |
| Endpoint | `POST /api/auth/register/` |
| Auth | Pública (AllowAny); sin JWT |
| Body | email, password, password_confirm, nickname |
| Email | Obligatorio; se normaliza (strip + minúsculas); único (iexact) |
| Nickname | Obligatorio; tras strip no vacío; único ignorando mayúsculas/minúsculas |
| Contraseña | Mismas reglas que Django validate_password; no se recortan espacios |
| Confirmación | password_confirm debe ser idéntica a password |
| Respuesta 201 | id, email, nickname, date_joined (sin password ni tokens) |
| Tras el alta | email_verified=false; hay que verificar el correo antes del login |
| Límite | Sigue el throttle anónimo (p. ej. 5/hora) → 429 |

## Endpoint

`POST /api/auth/register/`

No requiere autenticación.

### Petición

```http
POST /api/auth/register/
Content-Type: application/json

{
  "email": "persona@example.com",
  "password": "S0mething!Secure-497",
  "password_confirm": "S0mething!Secure-497",
  "nickname": "HabitHero"
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `email` | string (email) | sí | Tras normalizar, formato email válido y no usado por otra cuenta. |
| `password` | string | sí | `write_only`. Debe superar los validadores de contraseña de Django. No se hace `trim` del valor. |
| `password_confirm` | string | sí | `write_only`. Debe ser exactamente igual a `password`. |
| `nickname` | string | sí | Tras recortar espacios extremos, no vacío. Único respecto a otros usuarios comparando sin distinguir mayúsculas/minúsculas. |

### Respuesta correcta

`201 Created`

```json
{
  "id": 1,
  "email": "persona@example.com",
  "nickname": "HabitHero",
  "date_joined": "2026-11-16T19:00:00.000000Z"
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | integer | Identificador del usuario creado. |
| `email` | string | Email normalizado de la cuenta. |
| `nickname` | string | Nombre de usuario público elegido en el alta. |
| `date_joined` | string (date-time) | Momento de creación de la cuenta. |

No se devuelven `password`, `password_confirm` ni tokens JWT.

### Efectos al registrarse

1. Se validan formato y unicidad de `email`.
2. Se valida `nickname` (no vacío tras `strip`, unicidad case-insensitive).
3. Se comprueba que `password` y `password_confirm` coinciden.
4. Se aplica `validate_password` sobre `password`.
5. Se crea el usuario con `email_verified=false` y se envía el enlace de
   verificación de email (flujo descrito en
   [RECUPERACION_CONTRASENA.md](RECUPERACION_CONTRASENA.md)).
6. Hasta verificar el email, no se pueden obtener tokens en
   `POST /api/auth/token/`.

### Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Campos ausentes o inválidos; email ya registrado; nickname ya en uso; `password` y `password_confirm` distintos; contraseña que no cumple los requisitos. |
| `429 Too Many Requests` | Se ha superado el límite de solicitudes anónimas de registro. |

Ejemplo de email duplicado (`400`):

```json
{
  "email": ["Ya existe una cuenta con este email."]
}
```

Ejemplo de nickname duplicado (`400`):

```json
{
  "nickname": ["Ya existe una cuenta con este nickname."]
}
```

Ejemplo de contraseñas que no coinciden (`400`):

```json
{
  "password_confirm": ["Las contraseñas no coinciden."]
}
```

Ejemplo de límite superado (`429`):

```json
{
  "detail": "Request was throttled. Expected available in N seconds."
}
```

(El texto exacto del `429` puede variar según DRF; el código HTTP es el
contrato.)

## Notas

- El cliente de la aplicación, tras el alta y la verificación de email, inicia
  sesión con JWT (`POST /api/auth/token/`) y redirige al menú principal.
- La especificación OpenAPI está en `/api/schema/` y la UI en `/api/docs/`.
