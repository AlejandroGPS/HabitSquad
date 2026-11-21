# Sincronización del panel del escuadrón

## Conexión WebSocket

La API acepta conexiones ASGI en `ws/escuadrones/{escuadron_id}/`. Tras abrir
el socket, el cliente debe autenticarse dentro de cinco segundos enviando:

```json
{"tipo":"autenticar","access":"<access JWT>"}
```

El servidor valida el access token, comprueba que el usuario está activo y que
pertenece al escuadrón, y responde:

```json
{"tipo":"autenticado","escuadron_id":12}
```

Los tokens ausentes, inválidos o de usuarios ajenos al escuadrón cierran el
socket con el código `4401`. El socket es de solo lectura; si el cliente envía
otro mensaje después de autenticarse, se cierra con `4400`.

## Evento del panel

Los miembros conectados al mismo escuadrón reciben una invalidación JSON tras
una actualización confirmada en la base de datos:

```json
{
  "tipo":"panel.actualizado",
  "escuadron_id":12,
  "motivo":"prueba_actualizada",
  "registro_id":45
}
```

`registro_id` aparece cuando el cambio pertenece a una prueba. Los motivos
actuales son `habito_actualizado`, `miembro_se_unio`, `prueba_actualizada`,
`voto_emitido` y `cierre_diario`. El evento avisa de que los datos cambiaron;
el cliente debe volver a consultar `GET /api/escuadrones/{id}/` para cargar el
panel y su racha actuales.

## Cierre diario

Django Q2 programa `habitos.validacion.tasks.cerrar_jornadas_pendientes` cada
día a las 00:00 de `Europe/Madrid`. La tarea cierra las pruebas pendientes de
fechas anteriores al día local actual con las mismas reglas de mayoría que el
cierre manual. También procesa fechas anteriores pendientes si el worker estuvo
detenido. Los registros ya cerrados no se modifican. La racha sigue derivándose
de los estados diarios; no se persiste un contador separado. Al terminar, la
tarea notifica a todos los escuadrones, incluidos aquellos sin pruebas
pendientes, para que sus clientes refresquen la racha al cambiar el día.

## Ejecución

Para desarrollo local, `docker compose -f docker-compose.dev.yml up --build`
inicia PostgreSQL, Redis, la API ASGI y el worker Q2 sin Caddy ni dominio
público. La API queda disponible en `http://localhost:8000` y el WebSocket en
`ws://localhost:8000/ws/escuadrones/{id}/`. El worker registra el horario de
forma idempotente antes de ejecutar `qcluster`.

En producción, `docker-compose.yml` añade Caddy, que envía `/api/`, `/admin/`
y `/ws/` a la API.
