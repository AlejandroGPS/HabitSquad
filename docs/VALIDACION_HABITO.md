# Validación de hábito por voto — contrato de API

Contrato acordado para la **emisión de votos** («Sí» / «No») sobre fotos de prueba de hábito ajenas y el **cómputo de resultados** (recuento, mayoría simple y cambio de `estado` del registro diario). La implementación y la documentación OpenAPI (`/api/docs/`) deben respetar este documento.

La carga y la visualización de la foto están en [PRUEBA_FOTO.md](PRUEBA_FOTO.md). El hábito diario por escuadrón está en [HABITOS.md](HABITOS.md). Este contrato cubre la validación por el escuadrón sobre un `RegistroDiario` ya existente.

## Decisiones de diseño

| Tema | Acuerdo |
| --- | --- |
| Emitir voto | `POST /api/escuadrones/{escuadron_id}/pruebas/{registro_id}/votos/` |
| Consultar votación | `GET` en la misma ruta (sin emitir voto) |
| Body del POST | `{ "voto": "sí" \| "no" }` (`application/json`) |
| Auth | JWT (`Authorization: Bearer <access>`) + pertenencia al escuadrón |
| Quién vota | Miembro del escuadrón distinto del autor de la prueba |
| Autovoto | `400 Bad Request` |
| Voto duplicado / cambio de voto | `409 Conflict` |
| Votantes elegibles | Todos los miembros del escuadrón **excepto** el autor de la prueba |
| Mayoría simple | `votos_si > votantes_elegibles / 2` → `estado = cumplido` |
| Sin mayoría tras votar | El registro sigue en `pendiente` |
| Cierre diario | A las 23:59 (`Europe/Madrid`), si sigue sin esa mayoría → `no_cumplido` |
| Prueba ya cerrada | No se aceptan más votos (`400`) |

## Emisión de voto

### Endpoint

`POST /api/escuadrones/{escuadron_id}/pruebas/{registro_id}/votos/`

Requiere autenticación JWT: cabecera `Authorization: Bearer <access>`. El usuario debe pertenecer al escuadrón, no ser el autor de la prueba y no haber votado ya esa prueba. El registro debe existir, pertenecer a un hábito de ese escuadrón y estar en estado `pendiente`.

### Petición

```http
POST /api/escuadrones/{escuadron_id}/pruebas/{registro_id}/votos/
Authorization: Bearer <access>
Content-Type: application/json

{
  "voto": "sí"
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `voto` | string | sí | Exactamente `"sí"` o `"no"`. |

No se envían `fecha` ni `estado` en la petición. El servidor recalcula el resultado tras persistir el voto.

### Respuesta correcta

`201 Created` (primer y único voto del usuario autenticado sobre esa prueba).

```json
{
  "registro_id": 1,
  "estado": "pendiente",
  "votos_si": 1,
  "votantes_elegibles": 3,
  "votos_emitidos": 1,
  "mayoria_alcanzada": false,
  "voto_propio": "sí",
  "votos": [
    {
      "usuario_id": 7,
      "voto": "sí"
    }
  ]
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `registro_id` | integer | Identificador del registro diario votado. |
| `estado` | string | `pendiente`, `cumplido` o `no_cumplido` tras el cómputo. |
| `votos_si` | integer | Número de votos con valor `"sí"`. |
| `votantes_elegibles` | integer | Miembros del escuadrón menos el autor (`tamaño_escuadrón - 1`). |
| `votos_emitidos` | integer | Número de votos ya registrados sobre esa prueba. |
| `mayoria_alcanzada` | boolean | `true` si `votos_si > votantes_elegibles / 2`. |
| `voto_propio` | string \| null | `"sí"` o `"no"` del usuario autenticado; en el POST siempre está definido. |
| `votos` | array | Lista de votos emitidos. |
| `votos[].usuario_id` | integer | Identificador del miembro que votó. |
| `votos[].voto` | string | `"sí"` o `"no"`. |

Si tras este voto se alcanza la mayoría, `estado` pasa a `cumplido` y `mayoria_alcanzada` es `true`. En caso contrario `estado` sigue `pendiente`.

### Efectos al votar

1. Se comprueba que el escuadrón existe y que el usuario autenticado es miembro.
2. Se localiza el registro en ese escuadrón; si no existe o no pertenece al escuadrón, se responde `404`.
3. Se rechaza el voto si el usuario es el autor de la prueba (`400`).
4. Se rechaza el voto si el registro no está en `pendiente` (`400`).
5. Se rechaza el voto si el usuario ya votó esa prueba (`409`).
6. Se valida el campo `voto` (`sí` / `no`).
7. Se persiste el voto y se recalcula el cómputo.
8. Si `votos_si > votantes_elegibles / 2`, el `estado` del registro pasa a `cumplido` para todo el escuadrón. Si no, permanece `pendiente`.

### Errores de la emisión

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Falta `voto`, el valor no es `"sí"` ni `"no"`, el usuario es el autor de la prueba, o el registro ya está cerrado (`cumplido` / `no_cumplido`). |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |
| `403 Forbidden` | El usuario autenticado no pertenece al escuadrón. |
| `404 Not Found` | El escuadrón no existe, el registro no existe, o el registro no pertenece a un hábito de ese escuadrón. |
| `409 Conflict` | El usuario autenticado ya ha emitido un voto sobre esa prueba. |

Ejemplo de error de validación (`400`):

```json
{
  "voto": ["Debe ser \"sí\" o \"no\"."]
}
```

Ejemplo de autovoto (`400`):

```json
{
  "detail": "No puedes votar tu propia prueba de foto de hábito diario."
}
```

Ejemplo de prueba ya cerrada (`400`):

```json
{
  "detail": "Esta prueba ya está cerrada y no admite más votos."
}
```

Ejemplo sin autenticación (`401`):

```json
{
  "detail": "Authentication credentials were not provided."
}
```

Ejemplo de no miembro (`403`):

```json
{
  "detail": "El usuario no pertenece a este escuadrón."
}
```

Ejemplo de registro no encontrado (`404`):

```json
{
  "detail": "No se ha encontrado esa prueba de foto."
}
```

Ejemplo de voto duplicado (`409`):

```json
{
  "detail": "Ya has emitido un voto sobre esta prueba."
}
```

## Consulta del estado de votación

### Endpoint

`GET /api/escuadrones/{escuadron_id}/pruebas/{registro_id}/votos/`

Requiere autenticación JWT. Cualquier miembro del escuadrón puede consultar el recuento y los votos de una prueba de ese escuadrón. Este endpoint **no** emite ni modifica votos.

### Petición

```http
GET /api/escuadrones/{escuadron_id}/pruebas/{registro_id}/votos/
Authorization: Bearer <access>
```

No lleva cuerpo.

### Respuesta correcta

`200 OK`

La forma de la respuesta coincide con la de la emisión de voto. `voto_propio` es `"sí"`, `"no"` o `null` si el usuario autenticado aún no ha votado (el autor de la prueba tendrá `voto_propio: null` porque no es votante elegible).

```json
{
  "registro_id": 1,
  "estado": "pendiente",
  "votos_si": 1,
  "votantes_elegibles": 3,
  "votos_emitidos": 2,
  "mayoria_alcanzada": false,
  "voto_propio": null,
  "votos": [
    {
      "usuario_id": 7,
      "voto": "sí"
    },
    {
      "usuario_id": 9,
      "voto": "no"
    }
  ]
}
```

### Errores de la consulta

| Código | Condición |
| --- | --- |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |
| `403 Forbidden` | El usuario autenticado no pertenece al escuadrón. |
| `404 Not Found` | El escuadrón no existe, el registro no existe, o el registro no pertenece a un hábito de ese escuadrón. |

## Cálculo de resultados y cierre diario

### Mayoría simple

El umbral se calcula sobre los **votantes elegibles** (miembros del escuadrón excepto el autor), no sobre los votos ya emitidos:

- Sea `E = votantes_elegibles`.
- Sea `S = votos_si`.
- Hay mayoría cuando `S > E / 2`.
- Al alcanzarse la mayoría, el registro pasa a `cumplido` de inmediato y deja de admitir votos.

Ejemplo: escuadrón de 4 miembros → `E = 3`. Hace falta al menos **2** votos «Sí» (`2 > 1.5`).

### Cierre a las 23:59 (`Europe/Madrid`)

Al final del día calendario en la zona `Europe/Madrid`, el sistema cierra las pruebas de esa fecha que sigan en `pendiente`:

1. Si en ese momento `votos_si > votantes_elegibles / 2`, el registro queda `cumplido` (caso límite si la mayoría se alcanzó justo antes del cierre).
2. En cualquier otro caso (incluida la ausencia total de votos) el registro pasa a `no_cumplido`.

El mecanismo de ejecución del cierre (comando, tarea programada, etc.) es detalle de implementación del backend; este contrato solo fija el **efecto** sobre `estado`. No se define un endpoint público específico para forzar el cierre.

Tras el cierre (`cumplido` o `no_cumplido`), no se aceptan nuevos votos.

## Notas

- Un miembro emite como máximo un voto por registro; no se puede cambiar ni repetir.
- El autor de la prueba no es votante elegible y no puede votarse a sí mismo.
- El endpoint de visualización de la foto (`GET /api/escuadrones/{escuadron_id}/pruebas/{registro_id}/`) no emite ni registra votos; ver [PRUEBA_FOTO.md](PRUEBA_FOTO.md).
- Los valores de `estado` del registro son `pendiente`, `cumplido` y `no_cumplido`. Tras la carga de la foto el estado es `pendiente`; este contrato define cómo pasa a `cumplido` o `no_cumplido`.
- El panel encuentra las pruebas del día con `GET /api/escuadrones/{escuadron_id}/`. Cada miembro incluye `prueba_hoy` (un objeto con `id` y `estado`, o `null`), `es_usuario` y el nombre visible `nombre` si está configurado.
- La misma respuesta incluye `racha`: los días seguidos en que todos los miembros tienen la prueba en `cumplido`. Quien se une a un escuadrón empieza a contar al día siguiente, y el día de hoy suma si ya está cumplido y solo corta la racha si alguna prueba está en `no_cumplido`. Cada miembro incluye también `semana`, una lista de lunes a domingo con `fecha` y `estado` de su prueba (`null` si ese día no hay prueba).
- La pantalla muestra `votos_si` de `votantes_elegibles` y usa `estado` y `voto_propio` devueltos por la API para habilitar los botones.
- La especificación OpenAPI está disponible en `/api/schema/` y la interfaz interactiva en `/api/docs/`.
