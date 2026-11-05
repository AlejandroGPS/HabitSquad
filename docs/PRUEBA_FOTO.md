# Prueba diaria por foto — contrato de API

Contrato acordado para la carga y la visualización de fotos del hábito diario. 
La implementación y la documentación OpenAPI (`/api/docs/`)
deben respetar este documento.

El hábito diario por escuadrón está descrito en [HABITOS.md](HABITOS.md). La
foto se asocia a un registro diario de ese hábito: un usuario tiene como
máximo un registro por hábito y día calendario.

## Carga de la foto de prueba de hábito cumplido

### Endpoint

`POST /api/escuadrones/{escuadron_id}/prueba/`

Requiere autenticación JWT: cabecera `Authorization: Bearer <access>`. El
usuario debe pertenecer al escuadrón y tener ya asignado su hábito diario en
ese escuadrón.

### Petición

```http
POST /api/escuadrones/{escuadron_id}/prueba/
Authorization: Bearer <access>
Content-Type: multipart/form-data

foto: <archivo de imagen>
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `foto` | file | sí | Imagen con tipo MIME `image/jpeg`, `image/png` o `image/webp`. Tamaño máximo 5 MB. |

No se envían `fecha` ni `estado` en la petición. El servidor asigna la fecha
del día en la zona `Europe/Madrid` y el estado inicial `pendiente`.

### Respuesta correcta

- `201 Created`: primer registro del hábito para ese día.
- `200 OK`: ya existía un registro del mismo hábito y día; se actualiza la
  foto y el estado vuelve a `pendiente`.

```json
{
  "id": 1,
  "habito_id": 10,
  "usuario_id": 7,
  "fecha": "2026-11-05",
  "estado": "pendiente",
  "foto_url": "https://res.cloudinary.com/ejemplo/image/upload/s--firma--/v1/pruebas/abc123.jpg"
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | integer | Identificador del registro diario. |
| `habito_id` | integer | Identificador del hábito diario del usuario en el escuadrón. |
| `usuario_id` | integer | Identificador del usuario que ha subido la foto. |
| `fecha` | string (`date`) | Día del registro en formato `YYYY-MM-DD` (`Europe/Madrid`). |
| `estado` | string | Tras la carga es siempre `pendiente`. |
| `foto_url` | string (`uri`) | URL firmada o temporal para consultar la imagen. No es una URL pública permanente. |

La imagen se almacena fuera de la API (Cloudinary). En base de datos solo se
persiste la referencia necesaria para generar esa URL.

### Efectos al subir

1. Se comprueba que el escuadrón existe y que el usuario autenticado es
   miembro.
2. Se comprueba que el usuario tiene hábito diario asignado en ese escuadrón.
3. Se valida el fichero `foto` (presencia, tipo MIME y tamaño).
4. Se sube la imagen al almacenamiento configurado y se guarda la referencia.
5. Si no hay registro para ese hábito y día, se crea uno con estado
   `pendiente`. Si ya existe, se actualiza la foto y el estado queda
   `pendiente`.

### Errores de la carga

| Código | Condición |
| --- | --- |
| `400 Bad Request` | Falta `foto`, el tipo MIME no está permitido, el fichero supera 5 MB, o el usuario no tiene hábito diario en ese escuadrón. |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |
| `403 Forbidden` | El usuario autenticado no pertenece al escuadrón. |
| `404 Not Found` | El escuadrón no existe. |

Ejemplo de error de validación (`400`):

```json
{
  "foto": ["No se ha enviado ninguna imagen."]
}
```

Ejemplo sin hábito asignado (`400`):

```json
{
  "detail": "Debes asignar tu hábito diario en este escuadrón antes de subir una foto."
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

## Visualización de la foto

### Endpoint

`GET /api/escuadrones/{escuadron_id}/pruebas/{registro_id}/`

Requiere autenticación JWT: cabecera `Authorization: Bearer <access>`. Cualquier
miembro del escuadrón puede ver el registro (metadatos y foto) si pertenece a
un hábito de ese escuadrón. Este endpoint solo permite visualizar la prueba;
no emite ni registra votos.

### Petición

```http
GET /api/escuadrones/{escuadron_id}/pruebas/{registro_id}/
Authorization: Bearer <access>
```

No lleva cuerpo.

### Respuesta correcta

`200 OK`

```json
{
  "id": 1,
  "habito_id": 10,
  "usuario_id": 7,
  "fecha": "2026-11-05",
  "estado": "pendiente",
  "foto_url": "https://res.cloudinary.com/ejemplo/image/upload/s--firma--/v1/pruebas/abc123.jpg"
}
```

La forma de la respuesta coincide con la de la carga. `foto_url` es siempre
una URL firmada o temporal; el cliente no debe tratarla como enlace permanente
ni cachearla a largo plazo.

### Errores de la visualización

| Código | Condición |
| --- | --- |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |
| `403 Forbidden` | El usuario autenticado no pertenece al escuadrón. |
| `404 Not Found` | El escuadrón no existe, el registro no existe, o el registro no pertenece a un hábito de ese escuadrón. |

Ejemplo de registro no encontrado (`404`):

```json
{
  "detail": "No se ha encontrado esa prueba de foto."
}
```

## Notas

- Varios miembros del mismo escuadrón pueden subir prueba el mismo día: cada
  uno tiene su propio hábito y, por tanto, su propio registro.
- El mismo usuario no mantiene dos registros distintos para el mismo hábito y
  el mismo día; una nueva subida actualiza el existente.
- Los valores posibles de `estado` en el modelo son `pendiente`, `cumplido` y
  `no cumplido`. Este contrato solo fija `pendiente` tras la carga; el cambio
  de estado por validación del escuadrón queda fuera de estos endpoints.
- La especificación OpenAPI está disponible en `/api/schema/` y la interfaz
  interactiva en `/api/docs/`.

