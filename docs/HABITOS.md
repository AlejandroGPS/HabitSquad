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

`GET /api/escuadrones/{escuadron_id}/`

Devuelve el escuadrón y el estado de cada miembro para el panel. Solo pueden
consultarlo los miembros del escuadrón (JWT). El nickname y la foto de perfil
siguen el mismo criterio que en [PERFIL_USUARIO.md](PERFIL_USUARIO.md) y
[PRUEBA_FOTO.md](PRUEBA_FOTO.md) (`foto_url` firmada o temporal, no permanente).

### Decisiones de diseño

| Tema | Acuerdo |
| --- | --- |
| Endpoint | `GET /api/escuadrones/{escuadron_id}/` (sin ruta nueva) |
| Auth | JWT (`Authorization: Bearer <access>`) + pertenencia al escuadrón |
| Escuadrón | `id`, `nombre`, `codigo_invitacion`, `creador_id`, `racha` |
| Miembro | `usuario_id`, `es_administrador`, `es_usuario`, `nickname`, `foto_url`, `habito`, `prueba_hoy`, `semana` |
| Nickname | Nombre público del usuario (mismo campo que en perfil/registro) |
| Foto | `foto_url`: URL firmada/temporal o `null` si no hay foto |
| Nombre de display | El panel usa `nickname`. No se expone el antiguo campo `nombre` (`get_full_name`) |
| Hábito | Objeto de hábito diario o `null` si el miembro aún no lo ha elegido |
| Estado de hoy | `prueba_hoy`: `{ "id", "estado" }` con `estado` en `pendiente`, `cumplido`, `no_cumplido`; `null` = sin prueba hoy |
| Semana | Lista de 7 días (lunes a domingo): `fecha` + `estado` o `null` si no hay registro ese día |
| Racha | Entero: días seguidos en que todos los miembros elegibles cumplieron |
| Invita | La API expone `codigo_invitacion`; copiar al portapapeles es cosa del cliente |
| Errores | `401` sin JWT válido; `403` autenticado pero no miembro; `404` escuadrón inexistente |

## Errores del detalle del escuadrón

- `401 Unauthorized`: usuario no autenticado.
- `403 Forbidden`: usuario autenticado, pero no miembro del escuadrón.
- `404 Not Found`: escuadrón inexistente.

La especificación OpenAPI actualizada está disponible en `/api/schema/` y la
interfaz interactiva en `/api/docs/`.
