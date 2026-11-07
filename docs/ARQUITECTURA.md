# Arquitectura acordada

Este documento recoge la arquitectura y las tecnologías acordadas por el
equipo para HabitSquad. Describe el objetivo global del producto; no implica
que todas las funcionalidades estén dentro de la asignación actual. El trabajo
actual incluye la infraestructura base, los PBI #01 y #02 de autenticación,
el PBI #05 de definición del hábito diario por escuadrón y el PBI #06 de
recuperación de contraseña.

## Componentes y tecnologías

| Área | Tecnología | Uso acordado |
| --- | --- | --- |
| Frontend | Vite, HTML, Tailwind CSS y JavaScript | Aplicación separada de la API y diseño mobile-first. |
| App móvil | PWA (manifest y service worker) | Instalación en la pantalla de inicio, acceso a la cámara y notificaciones. |
| Acciones del cliente | `fetch` | Llamadas para crear escuadrones, guardar hábitos, subir fotos y enviar toques. |
| Tiempo real en el cliente | WebSocket | Actualización del panel del escuadrón y de la racha. |
| API | Python 3.12, Django 5 y Django REST Framework | API JSON para usuarios, escuadrones, hábitos, rachas y fotos. |
| Autenticación | `djangorestframework-simplejwt` | Registro, inicio de sesión y autenticación mediante tokens JWT. |
| Tiempo real en el servidor | Django Channels y Redis | Propagación de altas, acciones «Cumplido» y reinicios de racha. |
| Base de datos | SQLite en desarrollo y PostgreSQL en producción | Persistencia de los datos del escuadrón. |
| Tareas programadas | Django Q2 | Avisos a la hora configurada (20:00 por defecto) y cierre de racha a las 00:00 en `Europe/Madrid`. |
| Fotos | Cloudinary y `django-cloudinary-storage` | Almacenamiento de pruebas fotográficas previsto para el PBI #03. |
| Notificaciones | Web Push y `django-webpush` | Avisos programados y toques previstos para el PBI #05. En iPhone se requiere instalar la PWA. |
| Pruebas | pytest, coverage y Vitest | Pruebas automáticas de API y de la lógica frontend; objetivo de cobertura del 100 %. |
| Estilo de código | Ruff | Formato y detección de errores en Python. |
| Documentación de API | drf-spectacular y OpenAPI | Descripción de los endpoints generada a partir del código. |

## CI/CD y despliegue

- **Integración continua:** GitHub Actions ejecutará Ruff, pytest, Vitest y el
  build de Vite en cada Pull Request.
- **Despliegue:** al integrar cambios en `main`, se prevé el despliegue
  automático en una máquina virtual de Azure (Azure for Students).
- **Contenedores:** Docker Compose en Azure ejecutará la API, Redis,
  PostgreSQL, Django Q2 y el frontend estático, servidos por HTTPS.

## Gestión y control de versiones

- Git y GitHub para el control de versiones.
- GitHub Issues para la pila de trabajo, con la etiqueta `PBI` y milestones
  `S1`–`S4`; GitHub Projects para el tablero.
- Los cambios de startup de esta asignación se harán directamente sobre
  `main`.
- Los commits se realizarán manualmente, siendo commits pequeños y comprensibles.

## Documentación del proyecto

La documentación se mantendrá en Markdown en el README y en `docs/`. La
documentación de los endpoints se generará como OpenAPI a partir del código.
Las versiones concretas de runtimes y dependencias se fijarán y describirán en
`docs/DEPENDENCIAS.md` cuando se acuerde el contrato de versiones.

Los hábitos diarios se almacenan por `Membresia`: cada usuario puede definir
un hábito diferente en cada escuadrón. La asignación, consulta propia y
consulta de hábitos del panel están descritas en
[`docs/HABITOS.md`](HABITOS.md).

La recuperación de contraseña, sus endpoints y su configuración de correo
están descritas en [`docs/RECUPERACION_CONTRASENA.md`](RECUPERACION_CONTRASENA.md).
