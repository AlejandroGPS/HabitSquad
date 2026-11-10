# HabitSquad

Proyecto del Grupo 05 para la asignatura Gestión de Proyecto Software
2026/2027.

HabitSquad se desarrollará como una aplicación web con un backend en Django y
una aplicación frontend independiente. El trabajo conocido incluye la
preparación de la infraestructura, el registro de usuarios y la autenticación
mediante tokens JWT.

## Tecnologías previstas

- **Backend:** Python 3.12, Django 5+, Django REST Framework, SimpleJWT,
  drf-spectacular, Ruff y pytest con pytest-cov.
- **Frontend:** JavaScript, Vite, Tailwind CSS y Vitest.
- **Integración continua:** GitHub Actions para ejecutar los controles y las
  pruebas de backend y frontend, además de construir el frontend.
- **Base de datos de desarrollo:** SQLite.

Las versiones concretas se acordarán y documentarán antes de incorporar las
dependencias correspondientes. El contrato de versiones del backend se
definirá en su fase de preparación. Las dependencias del frontend se añadirán
cuando se trabaje en esa parte, manteniendo sus archivos de npm y documentando
los cambios para el equipo.

## Estructura prevista

```text
backend/                 API y aplicación Django
frontend/                Aplicación JavaScript
docs/                    Documentación del proyecto
.github/workflows/       Automatizaciones de GitHub Actions
```

La estructura detallada de cada aplicación se concretará durante su
implementación.

## Alcance y fases de trabajo

El orden y el alcance detallado de cada fase se confirmarán antes de empezar a
implementarla. Los README de `backend/` y `frontend/` podrán ampliarse con sus
instrucciones específicas cuando esas aplicaciones estén preparadas.

## Metodología de trabajo

- Los cambios de preparación inicial se realizarán sobre `main`, de acuerdo
  con el flujo del repositorio.
- Los PBIs se trabajarán en ramas personales; se
  abordarán uno por uno y en el orden acordado. Los cambios o desarrollo no
  será posible mergearlos hasta que no hayan pasado un ciertos tests de validez
  en función la tarea a desarrollar y de la tecnología.
- Cada fase se dividirá en cambios pequeños y comprensibles. Después de cada
  cambio se ejecutarán las comprobaciones pertinentes antes de continuar.
- Los commits los realizará manualmente la persona responsable del trabajo.
- Se documentarán los cambios de dependencias y versiones para que el equipo
  pueda reproducir el entorno.

## Registro de cuenta

En la aplicación, **Registrarme** (`/registro`) crea la cuenta con correo y
contraseña mediante `POST /api/auth/register/`. Esa respuesta no incluye
tokens. Tras el alta, el usuario abre el enlace del correo y verifica su
dirección en `/verify-email`. Después puede iniciar sesión con las mismas
credenciales. La ruta `/menu` se conserva por compatibilidad.

El contrato de esos endpoints está en OpenAPI (`/api/schema/` y `/api/docs/`
con el backend en marcha). El detalle de la sesión y la prueba manual están en
[docs/AUTENTICACION_JWT.md](docs/AUTENTICACION_JWT.md). Los endpoints también
están resumidos en [backend/README.md](backend/README.md).

## Documentación

- `docs/DEPENDENCIAS.md`: runtimes, versiones, librerías principales e
  instrucciones de instalación.
- `docs/CREAR_ESCUADRON.md`: contrato del endpoint de creación de escuadrones.
- `docs/UNIRSE_ESCUADRON.md`: contrato del endpoint de unión a un escuadrón.
- `docs/REPORT.md`: informe del proyecto, que se completará según se acuerde.
- `backend/README.md` y `frontend/README.md`: instrucciones específicas de cada
  aplicación cuando se implemente su configuración.
