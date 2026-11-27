# Crear escuadrón — contrato de API

Contrato acordado para el endpoint de creación de escuadrones. La
implementación y la documentación OpenAPI (`/api/docs/`) deben respetar este
documento.

## Endpoint

`POST /api/escuadrones/`

Requiere autenticación JWT: cabecera `Authorization: Bearer <access>`.

## Petición

```http
POST /api/escuadrones/
Authorization: Bearer <access>
Content-Type: application/json

{
  "nombre": "Madrugadores"
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `nombre` | string | sí | Tras recortar espacios, no vacío; longitud máxima 100 caracteres. |

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
    }
  ]
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | integer | Identificador del escuadrón. |
| `nombre` | string | Nombre persistido (espacios extremos recortados). |
| `codigo_invitacion` | string | Código único de 6 caracteres alfanuméricos en mayúsculas (`A–Z`, `0–9`). |
| `es_publico` | boolean | Visibilidad del escuadrón. Se crea como privado (`false`). |
| `limite_miembros` | integer | Máximo de miembros. Se crea con valor `5`; el mínimo permitido es `2`. |
| `creador_id` | integer | ID del usuario autenticado que creó el escuadrón. |
| `miembros` | array | Lista de membresías. En la creación incluye al creador como administrador. |
| `miembros[].usuario_id` | integer | ID del usuario miembro. |
| `miembros[].es_administrador` | boolean | `true` si el miembro es administrador del escuadrón. |

## Efectos al crear

1. Se crea el escuadrón con el `nombre` indicado y el usuario autenticado como
   `creador`.
2. Se genera un `codigo_invitacion` de 6 caracteres que no colisione con ningún
   escuadrón existente.
3. El creador queda registrado como miembro con `es_administrador: true`.
4. La configuración inicial es privada y permite hasta 5 miembros.

## Errores

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Falta `nombre`, está vacío tras recortar espacios, supera 100 caracteres o el cuerpo no es JSON válido según el esquema. |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |

Ejemplo de error de validación (`400`):

```json
{
  "nombre": ["Este campo no puede estar en blanco."]
}
```

Ejemplo sin autenticación (`401`):

```json
{
  "detail": "Authentication credentials were not provided."
}
```

## Notas

- El código de invitación es de solo lectura en la respuesta; el cliente no lo
  envía en la petición.
- El alfabeto del código coincide con el esperado por la pantalla de unirse
  (6 caracteres `A–Z` / `0–9`).
- Este documento cubre únicamente la creación. Unirse a un escuadrón con el
  código está documentado en [UNIRSE_ESCUADRON.md](UNIRSE_ESCUADRON.md).
