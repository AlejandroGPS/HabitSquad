# Alertas inteligentes — contrato de API

Contrato acordado para las alertas de falta de prueba del día mediante
Web Push: suscripción del usuario autenticado, uso de la hora de aviso del
perfil y envío programado solo si ese día aún no hay prueba. La
implementación y la documentación OpenAPI (`/api/docs/`) deben respetar este
documento.

La hora de aviso se gestiona en el perfil
([PERFIL_USUARIO.md](PERFIL_USUARIO.md)). El worker Django Q2 de producción
es el mismo que el cierre diario
([SINCRONIZACION_TIEMPO_REAL.md](SINCRONIZACION_TIEMPO_REAL.md),
[DESPLIEGUE.md](DESPLIEGUE.md)). La sesión JWT sigue
[AUTENTICACION_JWT.md](AUTENTICACION_JWT.md).

## Decisiones de diseño

| Tema                        | Acuerdo                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prefijo                     | `/api/alertas/`                                                                                                                                    |
| Auth                        | JWT (`Authorization: Bearer <access>`) en endpoints protegidos → `401` si falta o no es válido                                                     |
| Clave pública VAPID         | `GET /api/alertas/vapid-public-key/` (pública; el cliente la necesita para suscribirse)                                                            |
| Alta de suscripción         | `POST /api/alertas/suscripcion/` con body Web Push (`endpoint`, `keys.p256dh`, `keys.auth`)                                                        |
| Baja de suscripción         | `DELETE /api/alertas/suscripcion/` (identificando la suscripción según el detalle del contrato)                                                    |
| Hora de aviso               | No se duplica: se consulta y cambia en `GET`/`PATCH /api/perfil/` (`hora_aviso`, default `20:00`, formato `HH:MM`, zona de la app `Europe/Madrid`) |
| Cuándo enviar               | A la `hora_aviso` del usuario, si ese día (calendario `Europe/Madrid`) **no** tiene prueba subida                                                  |
| Cuándo no enviar            | Si ya existe registro/prueba del día para el usuario (en cualquiera de sus hábitos/escuadrones aplicables según la implementación)                 |
| Envío programado            | No hay endpoint HTTP para "disparar" la alerta; lo ejecuta el worker Django Q2 (mismo proceso/infra que el cierre diario)                          |
| VAPID                       | Claves en variables de entorno (p. ej. pública + privada); solo la pública se expone por API; nunca secretos en el repositorio                     |
| Fuera de este contrato HTTP | UI, permisos del navegador, service worker / PWA (frontend)                                                                                        |

## Rutas previstas

| Método | Ruta | Auth | Función |
| --- | --- | --- | --- |
| `GET` | `/api/alertas/vapid-public-key/` | Pública | Devuelve la clave pública VAPID para el cliente |
| `POST` | `/api/alertas/suscripcion/` | JWT | Registra o actualiza la suscripción Web Push del usuario |
| `DELETE` | `/api/alertas/suscripcion/` | JWT | Elimina la suscripción Web Push del usuario |

El detalle de petición, respuesta, efectos y errores de cada endpoint se
completa en el siguiente refinamiento de este documento.
