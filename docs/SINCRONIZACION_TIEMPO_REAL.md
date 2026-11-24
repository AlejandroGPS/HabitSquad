# Sincronización del panel del escuadrón

Este documento describe el contrato WebSocket implementado por el backend para
invalidar el panel del escuadrón y hacer que sus miembros vuelvan a consultar
los datos actuales. El evento no contiene el panel ni la racha completos.

## Referencia funcional

Los criterios funcionales publicados para la PBI
[#10 Sincronización en Tiempo Real de la Racha Grupal](https://github.com/UNIZAR-30248-2026-HabitSquad/HabitSquad/issues/10)
establecen que todos los miembros deben ver el cambio de estado al momento y
que, al cambiar el día, la racha aumenta si todos cumplieron o se reinicia si
alguien falló. El contrato T48 no está enlazado en el repositorio ni en la
issue de documentación; por eso, las reglas de este documento se contrastan
con esos criterios y con el comportamiento real del backend.

## Conexión WebSocket

La ruta es:

```text
/ws/escuadrones/{escuadron_id}/
```

En local se usa `ws://localhost:8000`; en producción, `wss://<dominio>` a
través de Caddy. Cada conexión se limita a un escuadrón. El servidor completa
el handshake WebSocket y acepta el socket, pero no suscribe al usuario al canal
del escuadrón hasta que se autentique.

### Autenticación y autorización

Dentro de los cinco segundos posteriores a la apertura, el cliente debe enviar
el access JWT que obtuvo en el login REST:

```json
{"tipo":"autenticar","access":"<access JWT>"}
```

El backend comprueba que el token sea válido y no haya expirado, que el usuario
exista y esté activo, y que tenga una membresía en el escuadrón indicado en la
ruta. No hace falta ser administrador. Solo después de esas comprobaciones se
añade la conexión al grupo `escuadron_{escuadron_id}`. Una autenticación
correcta recibe:

```json
{"tipo":"autenticado","escuadron_id":12}
```

La autorización se comprueba al suscribirse. El backend no revalida el JWT ni
la membresía en cada evento; para renovar el token o volver a comprobar el
acceso, el cliente debe cerrar y abrir una conexión nueva con un access JWT
vigente.

Ejemplo mínimo en navegador:

```javascript
const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:'
const socket = new WebSocket(
  `${protocolo}//${location.host}/ws/escuadrones/${escuadronId}/`,
)

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ tipo: 'autenticar', access: accessToken }))
})

socket.addEventListener('message', async ({ data }) => {
  const evento = JSON.parse(data)
  if (evento.tipo === 'panel.actualizado') {
    // Consultar de nuevo GET /api/escuadrones/{escuadronId}/ con el JWT.
  }
})
```

El WebSocket es de solo lectura: el único mensaje de aplicación admitido del
cliente es el primero, de autenticación. Los cambios se realizan por los
endpoints REST existentes.

## Mensajes y eventos

### Evento de autenticación

Tras validar la conexión, el servidor envía `autenticado` con `escuadron_id`.
No contiene una copia inicial del panel; el cliente debe cargarla mediante
`GET /api/escuadrones/{escuadron_id}/`.

### Invalidación del panel

Después de confirmar en la base de datos un cambio relevante, los miembros
conectados y autorizados al mismo escuadrón reciben:

```json
{
  "tipo": "panel.actualizado",
  "escuadron_id": 12,
  "motivo": "voto_emitido",
  "registro_id": 45
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `tipo` | string | Siempre `panel.actualizado`. |
| `escuadron_id` | integer | Identificador del escuadrón afectado. |
| `motivo` | string | Causa del cambio; valores enumerados abajo. |
| `registro_id` | integer | Identificador de `RegistroDiario`, presente en cambios de prueba o voto. |

Los valores de `motivo` y cuándo se emiten son:

| `motivo` | Situación |
| --- | --- |
| `habito_actualizado` | Se crea o actualiza el hábito de una membresía. |
| `miembro_se_unio` | Una persona se une al escuadrón. |
| `prueba_actualizada` | Se crea o actualiza la prueba diaria de un miembro; incluye `registro_id`. |
| `voto_emitido` | Se registra un voto de validación; incluye `registro_id`. El estado puede pasar a `cumplido` al alcanzar la mayoría de votos afirmativos. |
| `cierre_diario` | Se cierra una prueba pendiente o el proceso programado notifica el cambio de día para recalcular la racha. |

El evento se publica después del commit de la operación. Es una notificación de
cambio, no una instantánea ni un historial durable: puede no recibirse si el
cliente estaba desconectado. Al recibirlo, el cliente debe volver a consultar
el endpoint de detalle para obtener el estado vigente del panel, de las pruebas
y de la racha.

## Errores y cierre de conexión

El backend señala los errores de autenticación mediante un frame de cierre; no
envía un objeto JSON de error. El navegador informa del cierre mediante el
evento `close` y su propiedad `code`.

| Código | Causa |
| --- | --- |
| `4401` | No se envió la autenticación en cinco segundos; el primer mensaje no contiene `tipo: "autenticar"`; el JWT falta, es inválido o ha expirado; el usuario no existe, está inactivo o no pertenece al escuadrón. |
| `4400` | El cliente envía otro mensaje de aplicación después de autenticarse. |
| `1000` | Cierre normal iniciado por el cliente, por ejemplo al abandonar el panel. |

Ejemplo de cierre normal en navegador:

```javascript
socket.close(1000, 'salida del panel')
```

Si la conexión termina o recibe `4401`, el cliente debe obtener un access JWT
vigente mediante el flujo de autenticación y abrir una conexión nueva. No debe
intentar enviar votos ni modificar el panel por WebSocket.

## Cierre diario y cálculo de la racha

Django Q2 ejecuta el cierre diario a las 00:00 de `Europe/Madrid`. La tarea
cierra las pruebas pendientes de fechas anteriores a la fecha local actual con
las reglas de validación existentes: una mayoría afirmativa las marca como
`cumplido`; en caso contrario quedan `no_cumplido`. Si el worker estuvo detenido,
también procesa fechas anteriores que sigan pendientes. Los registros ya
cerrados no se modifican.

La racha es común a todo el escuadrón, pero se calcula a partir de los estados
diarios; no hay un contador de racha persistido aparte. Un día cuenta como
cumplido cuando todos los miembros elegibles para ese día tienen su registro en
estado `cumplido`. Una membresía empieza a contar desde el día siguiente a su
alta. La jornada actual no suma ni rompe la racha mientras siga abierta. Al
cambiar la fecha, el cierre de las pruebas pendientes de ayer fija el resultado
definitivo: una jornada en que todos cumplieron pasa de N a N+1; si alguien no
alcanzó la mayoría afirmativa, la racha se reinicia a cero. El valor del detalle
REST refleja jornadas cerradas y el evento `cierre_diario` avisa a los clientes
de que deben consultarlo de nuevo. El enlace al contrato T48 debe confirmarse
para cerrar esa referencia documental.

Al terminar el cierre programado se emite `panel.actualizado` con motivo
`cierre_diario` para cada escuadrón, incluso si no tenía pruebas pendientes,
para que sus clientes refresquen la racha al cambiar el día. El cierre manual
también emite este motivo para los escuadrones cuyas pruebas pendientes hayan
cambiado.

## Ejecución local y producción

Para desarrollo local, desde la raíz del repositorio:

```bash
docker compose -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs --tail 50 api redis worker
```

Este Compose inicia PostgreSQL, Redis, la API ASGI y el worker Q2 sin Caddy ni
dominio público. No requiere `.env`: define valores locales de desarrollo y
expone Redis únicamente en `127.0.0.1:6379`. La API queda disponible en
`http://localhost:8000` y el WebSocket en
`ws://localhost:8000/ws/escuadrones/{id}/`. API y Redis deben figurar como
`healthy`, y el worker como `running`. El worker registra los horarios de
forma idempotente (`programar_cierre_diario` y `programar_alertas`) antes de
ejecutar `qcluster`.

Para comprobar el handshake del WebSocket localmente con `curl`:

```bash
curl --http1.1 --max-time 3 -i \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  -H 'Sec-WebSocket-Version: 13' \
  http://localhost:8000/ws/escuadrones/1/
```

Debe responder `101 Switching Protocols`. El consumer cierra después la
conexión si no recibe autenticación en cinco segundos; para validar la
sincronización funcional, conecta un cliente con un JWT válido y una membresía
del escuadrón. Para detener el entorno usa
`docker compose -f docker-compose.dev.yml down`.

En producción, `docker-compose.yml` añade Caddy, que envía `/api/`, `/admin/`
y `/ws/` a la API y conserva el upgrade WebSocket.

## Cliente web (PWA)

El panel del escuadrón (`/escuadrones/panel?id={id}`) usa este contrato
mediante `conectarEscuadron()` de `frontend/src/tiempoReal.js`:

- Abre la conexión cuando la primera carga REST del panel ha ido bien, con
  `wss:` en HTTPS y `ws:` en HTTP, en el mismo dominio que la aplicación. Si la
  carga falla (por ejemplo, `403` o `404`), no se conecta.
- Al abrirse envía `{"tipo":"autenticar","access":"<access JWT>"}` con el
  access de la sesión guardada.
- Con cada `autenticado`, también tras una reconexión, y con cada
  `panel.actualizado`, vuelve a pedir `GET /api/escuadrones/{id}/` y
  `GET /api/escuadrones/{id}/habito/`. Los avisos que llegan mientras hay una
  carga en curso se juntan en una sola petición más.
- Repinta la racha, los miembros y el resto de tarjetas sin huecos de carga ni
  animaciones de entrada, solo si cambia algo de lo que se ve, y devuelve el
  foco al mismo control. Si la petición falla, mantiene el panel anterior hasta
  el siguiente aviso.
- Si el servidor cierra con `4401` antes de autenticar (el access dura cinco
  minutos), renueva la sesión con el refresh y vuelve a conectar. Si también
  rechaza el access nuevo, deja de intentarlo; si el refresh ya no vale, la
  sesión caduca y la aplicación vuelve a `/login`.
- Si la conexión se corta por otro motivo, reintenta tras 1, 2, 4, 8 y 16 s, y
  después cada 30 s. Al recuperar la red (`online`) o volver a la aplicación
  (`visibilitychange`) reintenta sin esperar.
- Al salir del panel cierra la conexión con `1000`.

En desarrollo, `npm run dev` y `npm run preview` reenvían `/ws` al backend en
`127.0.0.1:8000` igual que `/api`. `python manage.py runserver` no atiende
WebSockets (responde `404` a `/ws/`). Para probar la sincronización hay que
levantar la API con `docker compose -f docker-compose.dev.yml up --build -d` o,
con Redis en marcha, con uvicorn desde `backend/`:

```bash
uvicorn config.asgi:application --host 127.0.0.1 --port 8000 --reload
```

## Referencias de implementación

- Ruta ASGI y autenticación: `backend/config/asgi.py` y `backend/escuadrones/tiempo_real/consumers.py`.
- Formato y publicación de eventos: `backend/escuadrones/tiempo_real/events.py`.
- Cálculo de la racha: `backend/escuadrones/detalle/services.py`.
- Cierre de pruebas y tarea de Q2: `backend/habitos/validacion/services/closing.py`, `backend/habitos/validacion/tasks.py` y `backend/habitos/management/commands/programar_cierre_diario.py`.
- Avisos Web Push (mismo worker): `backend/alertas/tasks.py` y `backend/alertas/management/commands/programar_alertas.py` (contrato en `docs/ALERTAS.md`).
- Cliente web: `frontend/src/tiempoReal.js` y `frontend/src/views/panelSeleccionado.js`.
