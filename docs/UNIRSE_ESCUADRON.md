# Unirse a un escuadrón — contrato de API

Contrato acordado para el endpoint de unión a un escuadrón mediante código de
invitación. La implementación y la documentación OpenAPI (`/api/docs/`) deben
respetar este documento.

## Endpoint

`POST /api/escuadrones/unirse/`

Requiere autenticación JWT: cabecera `Authorization: Bearer <access>`.

## Petición

```http
POST /api/escuadrones/unirse/
Authorization: Bearer <access>
Content-Type: application/json

{
  "codigo_invitacion": "X8K9QL"
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `codigo_invitacion` | string | sí | Tras recortar espacios y pasar a mayúsculas, exactamente 6 caracteres del alfabeto `A–Z` / `0–9`. El cliente puede enviar minúsculas; el servidor normaliza. |

## Respuesta correcta

`201 Created`

```json
{
  "id": 1,
  "nombre": "Madrugadores",
  "codigo_invitacion": "X8K9QL",
  "es_publico": false,
  "limite_miembros": 5,
  "creador_id": 42,
  "miembros": [
    {
      "usuario_id": 42,
      "es_administrador": true
    },
    {
      "usuario_id": 7,
      "es_administrador": false
    }
  ]
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | integer | Identificador del escuadrón al que se ha unido. |
| `nombre` | string | Nombre del escuadrón. |
| `codigo_invitacion` | string | Código de invitación del escuadrón (6 caracteres `A–Z` / `0–9`). |
| `es_publico` | boolean | Indica si el escuadrón es público. |
| `limite_miembros` | integer | Máximo configurado de miembros. |
| `creador_id` | integer | ID del usuario que creó el escuadrón. |
| `miembros` | array | Lista de membresías tras la unión, incluido el usuario que se acaba de unir. |
| `miembros[].usuario_id` | integer | ID del usuario miembro. |
| `miembros[].es_administrador` | boolean | `true` si el miembro es administrador del escuadrón. |

La forma de la respuesta coincide con la de
[creación de escuadrón](CREAR_ESCUADRON.md) para que el cliente reutilice el
mismo esquema.

## Efectos al unirse

1. Se localiza el escuadrón cuyo `codigo_invitacion` coincide con el código
   normalizado.
2. Se crea una `Membresia` del usuario autenticado en ese escuadrón con
   `es_administrador: false`.
3. El usuario queda incluido en `miembros` de la respuesta.

## Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Falta `codigo_invitacion`, está vacío tras recortar espacios, no tiene exactamente 6 caracteres tras normalizar, contiene caracteres fuera de `A–Z` / `0–9`, o el cuerpo no es JSON válido según el esquema. |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |
| `404 Not Found` | No existe ningún escuadrón con ese código de invitación. |
| `409 Conflict` | El usuario autenticado ya es miembro de ese escuadrón. |

Ejemplo de error de validación (`400`):

```json
{
  "codigo_invitacion": ["El código de invitación debe tener 6 caracteres."]
}
```

Ejemplo sin autenticación (`401`):

```json
{
  "detail": "Authentication credentials were not provided."
}
```

Ejemplo de código inexistente (`404`):

```json
{
  "detail": "No se ha encontrado un escuadrón con ese código."
}
```

Ejemplo de ya miembro (`409`):

```json
{
  "detail": "Ya perteneces a este escuadrón."
}
```

## Notas

- El alfabeto y la longitud del código coinciden con los de la creación y con
  la pantalla de unirse del frontend (6 caracteres `A–Z` / `0–9`).
- Este documento cubre únicamente la unión. Crear un escuadrón es el endpoint
  documentado en [CREAR_ESCUADRON.md](CREAR_ESCUADRON.md).
