# Hábitos diarios por escuadrón

Cada usuario puede definir un único hábito diario por escuadrón. El hábito se
asocia a la relación `Membresia`, por lo que un mismo usuario puede tener
hábitos distintos en escuadrones diferentes.

## Asignar o actualizar el hábito propio

### Pantalla del cliente

La ruta autenticada `/habito?escuadron=ID` recibe el escuadrón elegido en la
pantalla «Mis escuadrones». No incluye un desplegable ni cambia de escuadrón:
consulta únicamente `GET /api/escuadrones/ID/` y su hábito propio antes de
habilitar el guardado. El servidor verifica la pertenencia del usuario.
Si falta el identificador o no es válido, ofrece volver a «Mis escuadrones»;
no consulta la lista ni selecciona otro escuadrón automáticamente.
La escritura y las seis ideas están disponibles incluso mientras carga la API
o si falla la conexión. Las respuestas tardías no sobrescriben un borrador
que el usuario ya haya empezado. Un `404` vacío en la consulta del hábito
indica que aún no tiene hábito; un `404` con detalle se muestra como error.

El formulario sigue la pantalla 8 del PDF: campo libre con contador de 60
caracteres y seis ideas seleccionables. «Ir al gimnasio», «Leer» y «Estudiar»
se corresponden con las opciones predefinidas; el resto del texto (incluidas
las ideas con duración o cantidad) se envía como `otro`, conservándolo íntegro.
La API admite 255 caracteres, pero esta pantalla limita las nuevas entradas a
60. Los hábitos antiguos más largos se muestran sin recortar y deben acortarse
antes de guardarlos. Guarda mediante `PUT`, sin almacenar hábitos en `localStorage`.
La confirmación solo aparece cuando el servidor acepta el cambio. Si falla,
conserva el formulario para reintentar. Las peticiones utilizan `authFetch`,
incluida su renovación de JWT y gestión de sesión caducada.

Se accede desde «Mi hábito» en la navegación y desde «Elegir mi hábito» o
«Cambiar hábito» en el panel. `/escuadrones` muestra primero el selector recuperado
de la rama `feature/selector-escuadron`, ahora con los escuadrones reales de
`GET /api/escuadrones/`. El panel `/escuadrones/panel?id=ID` consulta su detalle
y el hábito propio; el guardado vuelve a ese mismo panel solo tras la
respuesta correcta del servidor. Las métricas de racha y las fotos pendientes
de implementar no se rellenan con datos de ejemplo.

### Contrato de guardado

`PUT /api/escuadrones/{escuadron_id}/habito/`

Requiere un access token JWT y que el usuario pertenezca al escuadrón.

### Opción predefinida

```json
{
  "opcion": "leer",
  "texto_personalizado": ""
}
```

Las opciones disponibles son `gimnasio`, `leer`, `estudiar` y `otro`.

### Hábito personalizado

```json
{
  "opcion": "otro",
  "texto_personalizado": "Leer 20 páginas"
}
```

El texto personalizado se recorta y admite hasta 255 caracteres. Es obligatorio
cuando la opción es `otro`; si está vacío o solo contiene espacios, la API
responde `400 Bad Request` y no modifica el hábito existente.

La operación es idempotente: si ya existe un hábito para la membresía, se
actualiza el mismo registro.

### Respuesta

```json
{
  "id": 1,
  "opcion": "otro",
  "texto_personalizado": "Leer 20 páginas",
  "creado_en": "2026-11-02T10:00:00Z",
  "actualizado_en": "2026-11-02T10:05:00Z"
}
```

## Consultar el hábito propio

`GET /api/escuadrones/{escuadron_id}/habito/`

Requiere autenticación y pertenencia al escuadrón.

- `200 OK`: devuelve el hábito configurado.
- `401 Unauthorized`: falta el access token, es inválido o ha expirado.
- `403 Forbidden`: el usuario no pertenece al escuadrón.
- `404 Not Found`: el escuadrón no existe o todavía no tiene hábito.

## Consultar el panel del escuadrón

### Endpoint

`GET /api/escuadrones/{escuadron_id}/`

Requiere autenticación JWT y pertenencia al escuadrón. Devuelve el escuadrón y
el estado de cada miembro para el panel (nickname, foto de perfil, hábito,
prueba de hoy y semana). El nickname y la foto siguen el mismo criterio que en
[PERFIL_USUARIO.md](PERFIL_USUARIO.md) y [PRUEBA_FOTO.md](PRUEBA_FOTO.md):
`foto_url` es firmada o temporal, nunca una URL pública permanente.

### Decisiones de diseño

| Tema | Acuerdo |
| --- | --- |
| Endpoint | `GET /api/escuadrones/{escuadron_id}/` (sin ruta nueva) |
| Auth | JWT (`Authorization: Bearer <access>`) + pertenencia al escuadrón |
| Escuadrón | `id`, `nombre`, `codigo_invitacion`, `es_publico`, `limite_miembros`, `creador_id`, `racha` |
| Miembro | `usuario_id`, `es_administrador`, `es_usuario`, `nickname`, `foto_url`, `habito`, `prueba_hoy`, `semana` |
| Nickname | Nombre público del usuario (mismo campo que en perfil/registro) |
| Foto | `foto_url`: URL firmada/temporal o `null` si no hay foto |
| Nombre de display | El panel usa `nickname`. No se expone un campo `nombre` de display distinto |
| Hábito | Objeto de hábito diario o `null` si el miembro aún no lo ha elegido |
| Estado de hoy | `prueba_hoy`: `{ "id", "estado" }` con `estado` en `pendiente`, `cumplido`, `no_cumplido`; `null` = sin prueba hoy |
| Semana | Lista de 7 días (lunes a domingo): `fecha` + `estado` o `null` si no hay registro ese día |
| Racha | Entero: días seguidos en que todos los miembros elegibles cumplieron |
| Invita | La API expone `codigo_invitacion`; copiar al portapapeles es cosa del cliente |
| Errores | `401` sin JWT válido; `403` autenticado pero no miembro; `404` escuadrón inexistente |

### Petición

```http
GET /api/escuadrones/{escuadron_id}/
Authorization: Bearer <access>
```

No lleva cuerpo.

### Respuesta correcta

`200 OK`

```json
{
  "id": 1,
  "nombre": "Madrugadores",
  "codigo_invitacion": "X8K9QL",
  "es_publico": false,
  "limite_miembros": 5,
  "creador_id": 42,
  "racha": 2,
  "miembros": [
    {
      "usuario_id": 42,
      "es_administrador": true,
      "es_usuario": true,
      "nickname": "HabitHero",
      "foto_url": "https://res.cloudinary.com/ejemplo/image/upload/s--firma--/v1/perfiles/abc123.jpg",
      "habito": null,
      "prueba_hoy": null,
      "semana": [
        { "fecha": "2026-11-16", "estado": null },
        { "fecha": "2026-11-17", "estado": "cumplido" },
        { "fecha": "2026-11-18", "estado": "cumplido" },
        { "fecha": "2026-11-19", "estado": null },
        { "fecha": "2026-11-20", "estado": null },
        { "fecha": "2026-11-21", "estado": null },
        { "fecha": "2026-11-22", "estado": null }
      ]
    },
    {
      "usuario_id": 7,
      "es_administrador": false,
      "es_usuario": false,
      "nickname": "LectorPro",
      "foto_url": null,
      "habito": {
        "id": 1,
        "opcion": "otro",
        "texto_personalizado": "Leer 20 páginas",
        "creado_en": "2026-11-02T10:00:00Z",
        "actualizado_en": "2026-11-02T10:05:00Z"
      },
      "prueba_hoy": {
        "id": 15,
        "estado": "pendiente"
      },
      "semana": [
        { "fecha": "2026-11-16", "estado": null },
        { "fecha": "2026-11-17", "estado": "cumplido" },
        { "fecha": "2026-11-18", "estado": "cumplido" },
        { "fecha": "2026-11-19", "estado": null },
        { "fecha": "2026-11-20", "estado": null },
        { "fecha": "2026-11-21", "estado": "pendiente" },
        { "fecha": "2026-11-22", "estado": null }
      ]
    }
  ]
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | integer | Identificador del escuadrón. |
| `nombre` | string | Nombre del escuadrón. |
| `codigo_invitacion` | string | Código único de 6 caracteres (`A–Z`, `0–9`) para invitar. |
| `creador_id` | integer | ID del usuario que creó el escuadrón. |
| `racha` | integer | Días seguidos en que todos los miembros elegibles cumplieron. |
| `miembros` | array | Lista de membresías del escuadrón. |

| Campo (miembro) | Tipo | Descripción |
| --- | --- | --- |
| `usuario_id` | integer | ID del usuario miembro. |
| `es_administrador` | boolean | `true` si es administrador del escuadrón. |
| `es_usuario` | boolean | `true` si este miembro es el usuario autenticado que consulta. |
| `nickname` | string | Nombre público del usuario (perfil/registro). |
| `foto_url` | string (`uri`) o `null` | URL firmada o temporal de la foto de perfil. `null` si no hay foto. |
| `habito` | object o `null` | Hábito diario del miembro, o `null` si aún no lo ha configurado. |
| `habito.id` | integer | Identificador del hábito. |
| `habito.opcion` | string | `gimnasio`, `leer`, `estudiar` u `otro`. |
| `habito.texto_personalizado` | string | Texto libre; relevante sobre todo si `opcion` es `otro`. |
| `habito.creado_en` | string (`date-time`) | Alta del hábito. |
| `habito.actualizado_en` | string (`date-time`) | Última modificación del hábito. |
| `prueba_hoy` | object o `null` | Resumen de la prueba de hoy, o `null` si no hay registro (sin prueba). |
| `prueba_hoy.id` | integer | Identificador del registro diario. |
| `prueba_hoy.estado` | string | `pendiente`, `cumplido` o `no_cumplido`. |
| `semana` | array | Siete elementos, de lunes a domingo de la semana actual. |
| `semana[].fecha` | string (`date`) | Día del calendario (`YYYY-MM-DD`). |
| `semana[].estado` | string o `null` | Estado de la prueba ese día, o `null` si no hay registro. |

### Notas

1. Un miembro sin hábito se representa con `"habito": null`.
2. Sin prueba hoy: `"prueba_hoy": null`. Con prueba: el cliente puede mostrar Cumplido / Pendiente / No cumplido según `estado`.
3. `semana` alimenta la vista «Esta semana» en el cliente; no implica endpoints extra.
4. `codigo_invitacion` alimenta «Invita»; copiar el código es responsabilidad del frontend.
5. En BD la foto es `foto_perfil_public_id` (ER); en esta respuesta solo se expone `foto_url` calculada.

### Errores

| Código | Condición |
| --- | --- |
| `401 Unauthorized` | Falta el access token, es inválido o ha expirado. |
| `403 Forbidden` | El usuario está autenticado pero no pertenece al escuadrón. |
| `404 Not Found` | El escuadrón no existe. |

La especificación OpenAPI actualizada está disponible en `/api/schema/` y la
interfaz interactiva en `/api/docs/`.
