# Configuración de escuadrones

Contrato de la configuración, descubrimiento y unión de escuadrones. Todos los
endpoints requieren autenticación JWT; los escuadrones públicos son visibles
para usuarios registrados.

## Campos de Escuadron

| Campo | Tipo | Valor inicial | Regla |
| --- | --- | --- | --- |
| `es_publico` | boolean | `false` | `true` permite descubrir y unirse sin código. |
| `limite_miembros` | integer | `5` | Debe ser igual o superior a `2`. |

El límite controla nuevas incorporaciones. Si el administrador lo reduce por
debajo de la ocupación actual, no se expulsa a nadie; se rechazan nuevas uniones
hasta que haya plazas disponibles.

## Consultar configuración

`GET /api/escuadrones/{escuadron_id}/configuracion/`

Solo el administrador del escuadrón puede consultar esta ruta. Respuesta `200`:

```json
{
  "id": 1,
  "nombre": "Madrugadores",
  "es_publico": false,
  "limite_miembros": 5,
  "miembros_actuales": 2
}
```

Respuestas de error: `401` sin autenticación, `403` si el usuario no es
administrador y `404` si no existe el escuadrón.

## Actualizar configuración

`PATCH /api/escuadrones/{escuadron_id}/configuracion/`

Solo el administrador puede modificar `nombre`, `es_publico` o
`limite_miembros`. Los campos se pueden enviar parcialmente. Por ejemplo:

```json
{
  "nombre": "Lectores",
  "es_publico": true,
  "limite_miembros": 8
}
```

La respuesta `200` devuelve la configuración actualizada y `miembros_actuales`.
La respuesta `400` indica datos inválidos; en particular, el límite no puede
ser inferior a 2. También aplican los errores `401`, `403` y `404` anteriores.

## Descubrir escuadrones públicos

`GET /api/escuadrones/publicos/`

Devuelve los escuadrones públicos a los que el usuario autenticado todavía no
pertenece, con el número actual de miembros y el límite configurado. Los
escuadrones privados y aquellos a los que el usuario ya pertenece no aparecen
en este listado.

El parámetro de consulta opcional `q` busca por coincidencia parcial del nombre,
sin distinguir mayúsculas y minúsculas. Cada resultado también incluye la racha
actual (`racha`).

```json
[
  {
    "id": 1,
    "nombre": "Lectores",
    "es_publico": true,
    "limite_miembros": 8,
    "miembros_actuales": 3,
    "racha": 0
  }
]
```

## Unirse a un escuadrón

- Los escuadrones públicos permiten unirse sin código con
  `POST /api/escuadrones/{escuadron_id}/unirse/` y cuerpo vacío. La ruta
  devuelve `201` si la unión tiene éxito, `403` si el escuadrón es privado,
  `404` si no existe y `409` si el usuario ya pertenece o no hay plazas.
- Los escuadrones privados requieren el código mediante el endpoint existente
  `POST /api/escuadrones/unirse/`, documentado en
  [UNIRSE_ESCUADRON.md](UNIRSE_ESCUADRON.md).

La unión responde `201` con los datos del escuadrón y sus miembros. La ruta
pública responde `403` si el escuadrón es privado, `404` si no existe y `409`
si el usuario ya pertenece o se alcanzó el límite. La unión por código también
responde `409` al alcanzar el límite. En ambos casos no se crea una membresía
si el escuadrón ya está lleno.
