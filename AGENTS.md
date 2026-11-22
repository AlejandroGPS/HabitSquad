# AGENTS.md

Documento de contexto permanente para agentes de IA (OpenCode, Claude, Codex, etc.) que trabajen en **HabitSquad**.

> Revisado contra el checkout actual el **2026-11-21**. Si algo de este documento no coincide con el código, prevalecen el código y los archivos de configuración; actualiza este documento después de verificar el cambio.

---

## 0. Lectura rápida para agentes

Antes de tocar código:

1. Lee este archivo completo.
2. Identifica la funcionalidad afectada y abre su carpeta real (por ejemplo `backend/habitos/validacion/` o `frontend/src/views/panelSeleccionado.js`).
3. Lee el contrato de API correspondiente en `docs/` si el cambio afecta a un endpoint.
4. Ejecuta las comprobaciones indicadas en la sección 6 antes de dar la tarea por terminada.

Comandos mínimos de referencia:

```bash
# Backend (desde backend/)
python manage.py migrate
pytest --cov=usuarios --cov=autenticacion --cov=escuadrones --cov=habitos --cov-report=term-missing --cov-fail-under=100
ruff check .
ruff format --check .
python manage.py check
python manage.py runserver

# Frontend (desde frontend/)
npm ci
npm test
npm run build
npm run dev
```

---

## 1. Project Overview

**HabitSquad** es una aplicación web/PWA de seguimiento de hábitos con responsabilidad compartida. Cada usuario elige un hábito diario, se une a un **escuadrón** mediante un código de invitación, demuestra que ha cumplido con una foto y el resto del escuadrón valida la prueba con votos. La racha del escuadrón se mantiene mientras todos sus miembros cumplan.

- **Contexto:** proyecto del Grupo 05 para la asignatura Gestión de Proyecto Software, curso 2026/2027 (`README.md`).
- **Problema que resuelve:** mantener un hábito diario con compromiso social y evidencia fotográfica, evitando que la racha compartida se rompa.
- **Funcionalidades implementadas (verificadas en código):**
  - Registro con email, nickname único y verificación de correo.
  - Login/logout con JWT, renovación con rotación y blacklist.
  - Recuperación de contraseña por email.
  - Creación de escuadrones con código de invitación único de 6 caracteres.
  - Unión a escuadrones por código y listado de escuadrones propios.
  - Panel de escuadrón con miembros, hábitos, pruebas del día, semana y racha.
  - Hábito diario por membresía (un hábito distinto por escuadrón).
  - Subida de foto de prueba diaria a Cloudinary y visualización mediante URL firmada.
  - Validación por votos «sí»/«no», mayoría simple y cierre diario mediante comando de gestión.
  - Sincronización del panel por WebSocket autenticado, eventos por Redis y cierre nocturno con Django Q2.
  - Frontend SPA responsive y PWA instalable (manifest y service worker generados en build).
- **Estado general:** desarrollo activo y funcional en `main`; no es un producto terminado. La sincronización del panel usa Django Channels y Redis; Django Q2 cierra las pruebas pendientes a medianoche de `Europe/Madrid`. Las notificaciones siguen pendientes. Ver sección 10.

Fuentes principales: `README.md`, `docs/ARQUITECTURA.md`, `backend/README.md`, `frontend/README.md` y el código de las apps.

---

## 2. Technology Stack

### Backend

| Área | Tecnología / versión | Evidencia |
| --- | --- | --- |
| Lenguaje | Python 3.12.x | `backend/README.md`, `backend/ruff.toml`, CI |
| Framework | Django 5.2.18 | `backend/requirements.txt` |
| API | Django REST Framework 3.18.3 | `backend/requirements.txt` |
| Autenticación | djangorestframework-simplejwt 5.5.1 | `backend/requirements.txt`, `backend/config/settings.py` |
| Documentación API | drf-spectacular 0.30.0 | `backend/requirements.txt`, `backend/config/urls.py` |
| Fotos | cloudinary 1.47.0 + django-cloudinary-storage 0.3.0 | `backend/requirements.txt`, `backend/config/settings.py` |
| Pruebas | pytest 9.1.1, pytest-django 4.14.0, pytest-cov 7.1.0, coverage 7.16.2 | `backend/requirements.txt`, `backend/pytest.ini` |
| Calidad | Ruff 0.17.0 | `backend/ruff.toml` |
| Servidor producción | uvicorn 0.54.0 sobre ASGI | `backend/requirements-prod.txt`, `backend/docker-entrypoint.sh` |
| Tiempo real y tareas | Channels 4.3.2, channels-redis 4.3.0, Django Q2 1.11.1, Redis | `backend/requirements.txt`, `backend/config/settings.py` |
| Base de datos | SQLite en desarrollo; PostgreSQL con `psycopg` en producción | `backend/config/settings.py`, `backend/requirements-prod.txt` |

### Frontend

| Área | Tecnología / versión | Evidencia |
| --- | --- | --- |
| Lenguaje | JavaScript moderno (ES modules), HTML y CSS | `frontend/package.json`, `frontend/src/` |
| Bundler / dev server | Vite 8.3.4 | `frontend/package.json` |
| Estilos | Tailwind CSS 4.3.3 con `@tailwindcss/vite` | `frontend/package.json`, `frontend/vite.config.js` |
| PWA | vite-plugin-pwa 2.0.0 (Workbox) | `frontend/vite.config.js` |
| Pruebas | Vitest 5.0.3 + jsdom 30.1.2 | `frontend/package.json`, `frontend/vite.config.js` |
| Tipografía | `@fontsource-variable/nunito` 5.3.0 | `frontend/package.json` |
| Runtime | Node.js 22.x; mínimo `>=22.12` | `frontend/.nvmrc`, `frontend/package.json` |

### Infraestructura y servicios externos

- **Docker Compose** de producción con `db` (PostgreSQL 18.6), `redis`, `api` (Django + uvicorn), `worker` (Django Q2) y `web` (Vite servido por Caddy 2.11.7). `docker-compose.dev.yml` ofrece API, PostgreSQL, Redis y worker local sin Caddy.
- **Caddy** termina HTTPS, sirve el frontend, hace proxy de `/api/`, `/admin/` y `/ws/` a Django y sirve `/static/`. Ver `Caddyfile`.
- **Cloudinary** almacena las fotos de prueba como imágenes privadas; la base de datos solo guarda el `public_id`.
- **SMTP** para verificación de correo y recuperación de contraseña; en desarrollo el backend de consola es el predeterminado.
- **GitHub Actions** para CI y CD; despliegue en una VM de Azure descrito en `docs/DESPLIEGUE.md`.
- **Tiempo real:** Django Channels enruta WebSockets en ASGI; Redis comparte eventos entre la API y el worker. Django Q2 programa el cierre diario. Web Push sigue pendiente.

---

## 3. Project Architecture

### 3.1 Backend: Django por funcionalidades

El proyecto Django se llama `config` y agrupa cuatro apps de dominio:

| App | Responsabilidad | Puntos de entrada |
| --- | --- | --- |
| `backend/config/` | Configuración global, URLs raíz, ASGI/WSGI y OpenAPI. | `config/settings.py`, `config/urls.py`, `config/asgi.py` |
| `backend/usuarios/` | Usuario personalizado (`CustomUser`) y administración. | `usuarios/models/custom_user.py` |
| `backend/autenticacion/` | Registro, login, refresh, logout, recuperación de contraseña y verificación de email. | `autenticacion/urls.py` |
| `backend/escuadrones/` | Escuadrones, membresías, creación, unión, listado y detalle. | `escuadrones/urls.py`, `escuadrones/models/escuadron.py` |
| `backend/habitos/` | Hábito diario, registros, fotos de prueba, votos y cierre diario. | `habitos/api/urls.py`, `habitos/models/` |

**Patrón interno dominante:** cada funcionalidad se organiza como una carpeta con:

```text
<funcionalidad>/
├── api/          # urls.py, views.py, serializers.py: transporte HTTP y validación de entrada
├── services/     # lógica de aplicación, transacciones y reglas de negocio
└── tests/        # pruebas de API y de servicios
```

Ejemplos reales:

- `backend/autenticacion/registro/api/` → `services/registration.py` → `usuarios.models.CustomUser`.
- `backend/escuadrones/crear/api/` → `services/creation.py` y `services/invitation_code.py` → `escuadrones.models`.
- `backend/habitos/validacion/api/` → `services/voting.py` y `services/closing.py` → `habitos.models`.
- `backend/habitos/prueba/api/` → `services/upload.py` → Cloudinary + `RegistroDiario`.

**Flujo típico de una petición:**

```text
config/urls.py
  → app/feature/api/urls.py
  → api/views.py
  → api/serializers.py (validación)
  → services/*.py (regla de negocio)
  → models/*.py (persistencia)
  → Response DRF (JSON)
```

Las vistas son deliberadamente finas. La lógica de negocio reutilizable vive en `services/`; los serializers validan y traducen, y los modelos concentran persistencia y restricciones.

### 3.2 Autenticación y autorización

- Usuario personalizado `CustomUser` con `email` como `USERNAME_FIELD`; no existe `username`. Ver `backend/usuarios/models/custom_user.py`.
- `email_verified` bloquea el login hasta confirmar el correo. `VerifiedEmailTokenSerializer` devuelve un error genérico si la cuenta no está verificada.
- JWT de SimpleJWT:
  - access: **5 minutos**;
  - refresh: **1 día**;
  - rotación de refresh y blacklist tras rotación (`SIMPLE_JWT` en `config/settings.py`).
- Throttling (`DEFAULT_THROTTLE_RATES` en `config/settings.py`):
  - tasa `anon`: 5 solicitudes/hora por IP, aplicada con `AnonRateThrottle` en registro, recuperación y verificación;
  - scope `login`: 5 intentos/hora por IP, aplicado con `ScopedRateThrottle` en el login.
- En las vistas protegidas se declara explícitamente `authentication_classes = (JWTAuthentication,)` y `permission_classes = (IsAuthenticated,)`. No hay configuración global de autenticación/permissions en `REST_FRAMEWORK`; no asumas defaults implícitos.
- La pertenencia al escuadrón se comprueba en la vista o en el servicio. Si el usuario no pertenece: `403`; si el escuadrón no existe: `404`.
- El admin de Django (`/admin/`) usa sesión de Django, no JWT.

### 3.3 Modelo de datos

```text
CustomUser 1 ─── N Membresia N ─── 1 Escuadron
                       │
                       1
                       │
                       1
                 HabitoDiario
                       │
                       1
                       │
                       N
                RegistroDiario
                       │
                       1
                       │
                       N
                VotoValidacion
```

Entidades y restricciones principales:

- `Escuadron`: `nombre`, `creador` (FK a usuario), `codigo_invitacion` único de 6 caracteres, `miembros` M2M through `Membresia`, `creado_en`.
- `Membresia`: relación única `(escuadron, usuario)`, `es_administrador`, `unido_en`.
- `HabitoDiario`: uno por `Membresia` (`OneToOneField`), opciones `gimnasio`, `leer`, `estudiar`, `otro`; `texto_personalizado` obligatorio para `otro`.
- `RegistroDiario`: uno por `(habito, fecha)`, `cloudinary_public_id`, estado `pendiente` / `cumplido` / `no_cumplido`.
- `VotoValidacion`: uno por `(registro, usuario)`, valor `"sí"` o `"no"`.

Archivos: `backend/escuadrones/models/escuadron.py`, `backend/habitos/models/habito_diario.py`, `backend/habitos/models/registro_diario.py`, `backend/habitos/models/voto_validacion.py`.

### 3.4 Superficie de API

Todas las rutas cuelgan de `/api/`. Salvo las marcadas como públicas, requieren `Authorization: Bearer <access>`.

| Método y ruta | Función | Auth |
| --- | --- | --- |
| `POST /api/auth/register/` | Registro de cuenta; no devuelve tokens. | Pública + throttle anon |
| `POST /api/auth/token/` | Login; devuelve `access` y `refresh`. | Pública + throttle login |
| `POST /api/auth/token/refresh/` | Renueva y rota tokens. | Pública |
| `POST /api/auth/logout/` | Revoca el refresh. | Pública (requiere refresh válido) |
| `POST /api/auth/password-reset/` | Solicita enlace de recuperación. | Pública + throttle anon |
| `POST /api/auth/password-reset/confirm/` | Establece nueva contraseña. | Pública + throttle anon |
| `POST /api/auth/email-verification/` | Solicita/reenvía verificación. | Pública + throttle anon |
| `POST /api/auth/email-verification/confirm/` | Confirma el correo. | Pública + throttle anon |
| `GET /api/escuadrones/` | Lista los escuadrones del usuario. | JWT |
| `POST /api/escuadrones/` | Crea un escuadrón. | JWT |
| `POST /api/escuadrones/unirse/` | Une al usuario mediante código. | JWT |
| `GET /api/escuadrones/{id}/` | Detalle con miembros, hábitos, pruebas, semana y racha. | JWT + pertenencia |
| `GET /api/escuadrones/{id}/habito/` | Consulta el hábito propio. | JWT + pertenencia |
| `PUT /api/escuadrones/{id}/habito/` | Crea o actualiza el hábito propio. | JWT + pertenencia |
| `POST /api/escuadrones/{id}/prueba/` | Sube la foto de prueba del día. | JWT + pertenencia |
| `GET /api/escuadrones/{id}/pruebas/{registro_id}/` | Metadatos y URL firmada de la foto. | JWT + pertenencia |
| `GET /api/escuadrones/{id}/pruebas/{registro_id}/votos/` | Consulta estado de votación. | JWT + pertenencia |
| `POST /api/escuadrones/{id}/pruebas/{registro_id}/votos/` | Emite voto `"sí"`/`"no"`. | JWT + pertenencia |
| `WS /ws/escuadrones/{id}/` | Autentica miembros por primer mensaje JSON y envía invalidaciones `panel.actualizado`. | Access JWT + pertenencia |
| `GET /api/schema/`, `GET /api/docs/` | Esquema OpenAPI y Swagger UI. | Públicas |

**Atención:** `GET /api/escuadrones/` y `POST /api/escuadrones/` comparten ruta pero pertenecen a vistas distintas incluidas en `backend/escuadrones/urls.py` (selector y crear). Al añadir rutas, revisa el orden de `include()` y evita colisiones.

Contratos detallados: `docs/REGISTRO.md`, `docs/AUTENTICACION_JWT.md`, `docs/RECUPERACION_CONTRASENA.md`, `docs/CREAR_ESCUADRON.md`, `docs/UNIRSE_ESCUADRON.md`, `docs/HABITOS.md`, `docs/PRUEBA_FOTO.md`, `docs/VALIDACION_HABITO.md`, `docs/SINCRONIZACION_TIEMPO_REAL.md`.

### 3.5 Frontend: SPA sin framework

El frontend es JavaScript modular sin React/Vue. El flujo es:

```text
frontend/index.html
  → src/main.js
  → src/app.js
  → src/router.js
  → src/routes.js
  → src/views/*.js
  → src/components/*.js
```

- `src/router.js`: enrutador con History API; intercepta enlaces con `data-link` y renderiza la vista en `#app`.
- `src/routes.js`: tabla de rutas. `private: true` exige sesión; `guestOnly: true` redirige a `/escuadrones` si ya hay sesión. `guard()` centraliza las redirecciones.
- `src/views/`: cada pantalla es una función que devuelve un elemento DOM. Recibe `{ navigate }` y, cuando aplica, dependencias inyectables (`api`, `ahora`) para facilitar las pruebas.
- `src/components/`: piezas reutilizables (layout, formularios, tarjetas del panel, landing, iconos). Se reutilizan antes de crear variantes nuevas.
- `src/api.js`: cliente `fetch`, `ApiError`, `authFetch` con renovación de JWT y `logout`.
- `src/session.js`: única fuente de sesión en `localStorage` bajo la clave `habitsquad.session`.
- `src/style.css`: tokens de Tailwind (`bg-canvas`, `text-ink`, `bg-accent`, `text-streak`, etc.) y clases de componente (`glass`, `access-backdrop`, `app-backdrop`).

Flujo de sesión: registro → verificación de email → login → `/escuadrones` → panel → hábito → subida de prueba → votación. En desarrollo, Vite reenvía `/api` al backend en el puerto 8000; en producción Caddy sirve frontend y API bajo el mismo dominio.

---

## 4. Repository Structure

```text
HabitSquad/
├── backend/                         # API Django
│   ├── config/                      # settings, urls raíz, asgi, wsgi
│   ├── usuarios/                    # CustomUser, admin, migraciones y tests
│   ├── autenticacion/               # login, logout, refresh, registro, recuperacion
│   │   ├── login/                   # api/ + tests/
│   │   ├── logout/                  # api/ + services/ + tests/
│   │   ├── refresh/                 # api/ + tests/
│   │   ├── registro/                # api/ + services/ + tests/
│   │   └── recuperacion/            # api/ + services/ + tests/
│   ├── escuadrones/                 # escuadrones y membresías
│   │   ├── crear/                   # api/ + services/ + tests/
│   │   ├── unirse/                  # api/ + services/ + tests/
│   │   ├── selector/                # api/ + tests/
│   │   ├── detalle/                 # api/ + services.py + tests/
│   │   ├── models/
│   │   └── tests/
│   ├── habitos/                     # hábitos, pruebas y validación
│   │   ├── api/                     # hábito propio (GET/PUT)
│   │   ├── services/                # asignación de hábito
│   │   ├── prueba/                  # subida/visualización de fotos
│   │   ├── validacion/              # votos, mayoría y cierre diario
│   │   ├── models/
│   │   ├── management/commands/     # cerrar_validaciones_diarias
│   │   └── tests/
│   ├── manage.py
│   ├── pytest.ini
│   ├── ruff.toml
│   ├── requirements.txt
│   ├── requirements-prod.txt
│   ├── Dockerfile
│   └── docker-entrypoint.sh
├── frontend/                        # SPA Vite + Tailwind
│   ├── src/
│   │   ├── api.js                   # cliente HTTP y refresh de sesión
│   │   ├── app.js                   # arranque y evento de sesión caducada
│   │   ├── router.js                # History API
│   │   ├── routes.js                # rutas, guards y pantallas
│   │   ├── session.js               # localStorage
│   │   ├── components/              # componentes reutilizables
│   │   ├── views/                   # pantallas
│   │   ├── style.css                # Tailwind y tokens
│   │   └── tiempo.js                # utilidades de fecha/cierre
│   ├── public/icons/                # iconos PWA
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── package-lock.json
│   └── Dockerfile
├── docs/                            # contratos, arquitectura y despliegue
├── scripts/deploy.sh                # despliegue en la VM (producción)
├── .github/workflows/ci.yml         # CI
├── .github/workflows/deploy.yml     # CD
├── docker-compose.yml
├── docker-compose.dev.yml             # stack local con PostgreSQL, Redis, API ASGI y Q2
├── Caddyfile
├── .env.example                     # nombres de variables, sin valores reales
└── README.md
```

No se deben editar ni versionar artefactos generados: `backend/.venv/`, `backend/db.sqlite3`, `backend/staticfiles/`, `frontend/node_modules/`, `frontend/dist/`, cachés de pytest/Ruff/Vite. Están excluidos por `.gitignore`.

Notas de estructura:

- `frontend/src/auth/` contiene módulos heredados (`login.js`, `registro.js`) que no usa el flujo activo de rutas; el flujo vigente está en `src/api.js`, `src/session.js` y `src/views/acceso.js`.
- `frontend/src/views/panelEscuadron.js` y `frontend/src/datosEjemplo.js` son restos de maquetación/demo; no están referenciados por `routes.js`.
- `docs/REPORT.md` está vacío en este checkout; no asumas contenido.

---

## 5. Development Environment

### Requisitos previos

- **Python 3.12.x**.
- **Node.js 22.x** (mínimo 22.12) y npm. La versión está en `frontend/.nvmrc`.
- Opcional: **Docker** y **Docker Compose** para el entorno tipo producción.
- En Windows, los comandos de activación del entorno virtual cambian respecto a los ejemplos Unix de la documentación.

### Backend: instalación y arranque

Desde la raíz del repositorio:

```bash
python3.12 -m venv backend/.venv
source backend/.venv/bin/activate          # Unix
# En Windows PowerShell: backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
```

Desde `backend/` con el entorno activado:

```bash
python manage.py migrate
python manage.py check
python manage.py runserver
```

El servidor de desarrollo queda en `http://127.0.0.1:8000`. La base de datos local es SQLite (`backend/db.sqlite3`, ignorada por Git). La documentación interactiva está en `http://127.0.0.1:8000/api/docs/` y el esquema en `/api/schema/`.

### Frontend: instalación y arranque

Desde `frontend/`:

```bash
npm ci
npm run dev
```

El servidor de Vite queda en `http://localhost:5173`. En desarrollo, `/api` se reenvía al backend en el puerto 8000 (`frontend/vite.config.js`). Mantén el backend arrancado para probar login, escuadrones, hábitos y fotos.

### Variables de entorno

Django **no carga automáticamente** un archivo `.env` en desarrollo local: lee variables del entorno del proceso. El archivo `.env` se usa con `docker-compose.yml` (`env_file: .env`). `.env.example` solo contiene nombres y valores de ejemplo; nunca copies credenciales reales al repositorio.

Variables reconocidas por el backend (`backend/config/settings.py`) y por Compose:

| Grupo | Variables |
| --- | --- |
| Django | `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS` |
| Email | `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_TIMEOUT`, `DEFAULT_FROM_EMAIL` |
| Enlaces del frontend | `EMAIL_VERIFICATION_FRONTEND_URL`, `PASSWORD_RESET_FRONTEND_URL`, `PASSWORD_RESET_TIMEOUT` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| PostgreSQL | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT` |
| Compose/Caddy | `SITE_ADDRESS` |

Comportamiento por defecto relevante:

- Sin `POSTGRES_DB`, Django usa SQLite. Si `POSTGRES_DB` está definida, cambia a PostgreSQL.
- Sin configuración SMTP, el email se imprime en la consola de Django (`console.EmailBackend`).
- Sin credenciales de Cloudinary, la subida de fotos no puede completarse; el resto de la API funciona.
- `DJANGO_DEBUG` es `true` por defecto en local. En producción debe ser `false`.
- La zona horaria de la aplicación es `Europe/Madrid` (`TIME_ZONE`).

### Docker Compose (opcional, entorno tipo producción)

Para trabajar localmente con WebSockets y el cierre programado, usa el stack
de desarrollo desde la raíz (no requiere `.env`):

```bash
docker compose -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs --tail 50 api redis worker
```

API y Redis deben estar `healthy`; el worker debe estar `running`. La guía
`docs/SINCRONIZACION_TIEMPO_REAL.md` describe cómo comprobar el handshake y
detener el stack.

Desde la raíz:

```bash
cp .env.example .env
# Rellena los valores en .env; no lo subas al repositorio.
docker compose config --quiet
docker compose up -d --build
```

Servicios: `db` (PostgreSQL), `api` (Django/uvicorn, aplica migraciones y `collectstatic` al arrancar) y `web` (Caddy con el build del frontend). El acceso es por `SITE_ADDRESS` con HTTPS. Para desarrollo diario se recomienda el arranque directo de backend y frontend.

---

## 6. Build, Test and Quality Commands

### Backend (desde `backend/`)

| Comando | Qué comprueba / hace | Cuándo usarlo |
| --- | --- | --- |
| `python manage.py check` | Valida la configuración de Django. | Antes de cada entrega y tras cambiar settings/URLs. |
| `python manage.py makemigrations --check --dry-run` | Detecta modelos sin migración. | Tras cambiar modelos; debe salir sin cambios pendientes. |
| `python manage.py migrate` | Aplica migraciones a SQLite local. | Primera puesta en marcha y tras añadir migraciones. |
| `python manage.py migrate --noinput` | Aplica migraciones sin preguntar (CI/producción). | CI y arranque de contenedor. |
| `python manage.py collectstatic --noinput` | Recoge estáticos en `backend/staticfiles/`. | CI y despliegue. |
| `ruff check .` | Lint Python (E, F, I, UP, B, RUF). | Antes de commit/PR. |
| `ruff format --check .` | Comprueba formato Ruff (línea 88). | Antes de commit/PR. |
| `ruff format .` | Aplica el formato automáticamente. | Cuando `ruff format --check` falle. |
| `pytest --cov=usuarios --cov=autenticacion --cov=escuadrones --cov=habitos --cov-report=term-missing --cov-fail-under=100` | Suite completa con cobertura y umbral del 100 %. Es el comando de CI. | Antes de PR y para validar una implementación completa. |
| `pytest ruta/al/test_file.py -q` | Ejecuta un archivo de tests concreto. | Iteración rápida. |
| `pytest ruta/al/test_file.py::test_nombre -q` | Ejecuta un test concreto. | Depuración. |
| `python manage.py spectacular --validate --file openapi-schema.yml` | Genera y valida el esquema OpenAPI. En CI se usa `/tmp/openapi-schema.yml`. | Tras cambiar serializers, vistas o contratos de API. |
| `python manage.py runserver` | Servidor de desarrollo en el puerto 8000. | Desarrollo manual. |
| `python manage.py cerrar_validaciones_diarias` | Cierra las pruebas pendientes de hoy (`Europe/Madrid`). | Operación manual o tarea programada. |
| `python manage.py cerrar_validaciones_diarias --fecha YYYY-MM-DD` | Cierra una fecha concreta. | Reparaciones y pruebas operativas. |

Notas:

- `pytest` descubre `test_*.py`, `*_tests.py` y `tests.py` según `backend/pytest.ini`; el módulo de settings es `config.settings`.
- El umbral de cobertura del 100 % se aplica con los flags de `pytest-cov`; ejecutar un subconjunto sin esos flags no lo aplica.
- No se usa `python manage.py test`; el runner oficial del proyecto es pytest.

### Frontend (desde `frontend/`)

| Comando | Qué comprueba / hace | Cuándo usarlo |
| --- | --- | --- |
| `npm ci` | Instala exactamente `package-lock.json`. | Primera puesta en marcha y CI. |
| `npm test` | Ejecuta `vitest run` (suite completa). | Antes de commit/PR. |
| `npm test -- src/router.test.js` | Ejecuta un archivo de tests concreto. | Iteración rápida. |
| `npx vitest run src/router.test.js` | Equivalente directo a Vitest para un archivo. | Cuando se prefiera no pasar por npm. |
| `npx vitest` | Modo watch (no está expuesto como script). | Desarrollo de tests. |
| `npm run build` | Build de producción en `frontend/dist/`; genera manifest y service worker PWA. | Antes de PR y para probar la PWA. |
| `npm run preview` | Sirve `dist/` en `http://localhost:4173` con proxy `/api`. | Verificación del build y de la PWA. |
| `npm run dev` | Servidor de desarrollo en `http://localhost:5173`. | Desarrollo manual. |

No hay scripts de lint, formato, typecheck ni análisis estático en `frontend/package.json`. La CI solo ejecuta `npm ci`, `npm test` y `npm run build` para el frontend. No inventes un comando de lint frontend que no exista.

### CI/CD

- `.github/workflows/ci.yml` se ejecuta en push a `main`, en pull requests y manualmente. Backend: instala dependencias, Ruff, `check`, `makemigrations --check`, `migrate`, `collectstatic`, validación OpenAPI y pytest con cobertura 100 %. Frontend: `npm ci`, `npm test`, `npm run build`.
- `.github/workflows/deploy.yml` se ejecuta cuando la CI de `main` termina correctamente (o manualmente) y despliega por SSH en la VM de Azure.
- `scripts/deploy.sh` es de producción: construye las imágenes una a una (la VM tiene 1 GB de RAM), arranca Compose y comprueba HTTPS. No lo ejecutes en local sin entender que contiene el dominio de producción.

---

## 7. Coding Conventions

### Backend

- **Estilo:** Ruff con `target-version = "py312"` y `line-length = 88`; lint `E`, `F`, `I`, `UP`, `B`, `RUF`. Formatea con `ruff format`.
- **Nombres:** dominio en español (`Escuadron`, `Membresia`, `HabitoDiario`, `RegistroDiario`, `VotoValidacion`, `codigo_invitacion`, `es_administrador`), infraestructura técnica en inglés (`serializers.py`, `views.py`, `services/`, `MembershipNotFoundError`). Mantén la mezcla existente; no renombres dominio a inglés ni viceversa sin una razón fuerte.
- **Organización:** una carpeta por funcionalidad con `api/`, `services/` y `tests/`. No metas lógica de negocio compleja en las vistas ni en los serializers; usa servicios.
- **Vistas:** finas, con autenticación y permisos explícitos. Usa `get_object_or_404`, `PermissionDenied`, `NotFound` y respuestas DRF coherentes.
- **Errores:** excepciones de dominio en `services/` (`MembershipNotFoundError`, `AutovotoError`, `PruebaCerradaError`, `VotoDuplicadoError`, `FotoInvalidaError`, etc.) y traducción a códigos HTTP en la capa API. Los mensajes de usuario van en español y, cuando aplica, con la clave del campo (`{"campo": ["mensaje"]}`).
- **Validación:** serializers para forma y reglas de entrada; `clean()` del modelo para invariantes de dominio; restricciones `UniqueConstraint` en `Meta` para integridad en base de datos. No dupliques la misma validación en tres capas sin necesidad.
- **Fechas:** usa `timezone.localdate()` / `timezone.now()`; la zona es `Europe/Madrid`. No uses fechas naive para registros diarios ni cierres.
- **Consultas:** usa `select_related` / `prefetch_related` en listados y detalles para evitar N+1. Ejemplo: `escuadrones/detalle/api/views.py`.
- **OpenAPI:** documenta cada endpoint con `@extend_schema` o `@extend_schema_view` (`operation_id`, `tags`, `summary`, `description`, `responses`, ejemplos). Hay tests que comprueban el esquema; un endpoint nuevo sin documentación puede romper la suite.
- **Migraciones:** cualquier cambio de modelo requiere migración versionada y `makemigrations --check` limpio.
- **Dependencias:** están fijadas con versiones exactas. Si añades una, actualiza `backend/requirements.txt` (y `requirements-prod.txt` si es solo de producción) y `docs/DEPENDENCIAS.md`.
- **Logging:** no hay un sistema de logging estructurado propio; se usan excepciones y respuestas DRF. No añadas `print()` de depuración.
- **Docstrings/comentarios:** en español, explicando decisiones no obvias. No documentes lo evidente.

### Frontend

- **Estilo observado:** ES modules, comillas simples, sin punto y coma y 2 espacios. Mantén el estilo del archivo que edites.
- **Nombres:** pantallas y dominio en español (`crearEscuadronScreen`, `habitoDiarioScreen`, `panelSeleccionadoScreen`, `votarPruebaScreen`); utilidades técnicas en inglés (`createRouter`, `authFetch`, `getSquad`, `saveSession`). Los tests usan descripciones en español.
- **Pantallas:** funciones que devuelven un elemento DOM, no HTML string. Usa `element()` de `src/components/dom.js` y los componentes existentes. No uses `innerHTML` para contenido de usuario.
- **Componentes:** reutiliza `src/components/` antes de duplicar clases o crear variantes. Las piezas del panel están en `src/components/panel/` y la landing en `src/components/landing/`.
- **Navegación:** enlaces internos con `data-link`; navegación programática con `navigate()`. No recargues la página para cambiar de pantalla.
- **API:** usa `authFetch` para endpoints protegidos; gestiona `ApiError` y muestra mensajes en español. No leas/escribas tokens fuera de `src/session.js`.
- **Sesión:** clave única `habitsquad.session`. `refreshSession()` serializa renovaciones concurrentes; no dupliques lógica de refresh.
- **Estilos:** mobile-first con Tailwind. La convención documentada es usar tokens de `src/style.css` (`bg-canvas`, `text-ink`, `bg-accent`, `text-streak`, etc.) y evitar hexadecimales en vistas; en la práctica algunas vistas usan valores hex puntuales. Para código nuevo, prioriza tokens/clases existentes.
- **Accesibilidad:** usa `role="status"`, `role="alert"`, `aria-label`, foco en campos con error y estados de carga. Respeta `motion-safe:` y `prefers-reduced-motion`.
- **Pruebas:** archivos `.test.js` junto al código. Inyecta dependencias (`api`, `ahora`) en las pantallas cuando sea posible para no depender de red/reloj reales.

### Convenciones del proyecto

- Idioma de interfaz, mensajes de error y documentación: **español**. Nombres técnicos de infraestructura: inglés.
- Los commits los realiza manualmente la persona responsable (`README.md`). No crees commits ni hagas push salvo petición explícita.
- Los PBIs se trabajan en ramas personales y se integran vía PR tras pasar CI; no trabajes directamente sobre `main` salvo que se indique.
- No subas secretos, `.env` reales, credenciales de Cloudinary/SMTP ni claves de Django.

---

## 8. Testing Strategy

### Backend

- **Framework:** pytest + pytest-django; configuración en `backend/pytest.ini`.
- **Organización:** tests junto a cada funcionalidad, en `<feature>/tests/`; también hay tests de modelos en `app/tests/`. Archivos `test_*.py`.
- **Base de datos:** SQLite de test; los tests que tocan BD usan `@pytest.mark.django_db`.
- **Patrones usados:**
  - `APIClient` de DRF y `reverse()` para URLs.
  - `AccessToken.for_user(user)` para autenticar clientes en tests.
  - Fixtures locales por módulo (`user`, `api_client`, `auth_client`, `squad`, `membership`, `registro`, etc.); no hay `conftest.py` global.
  - Tests de servicios con `pytest.raises` para excepciones de dominio.
  - Tests de comandos con `call_command`.
  - Tests de esquema OpenAPI que comprueban rutas, `operationId`, respuestas y componentes.
- **Cobertura:** la CI exige 100 % sobre `usuarios`, `autenticacion`, `escuadrones` y `habitos`. Cualquier rama nueva debe quedar cubierta o la CI fallará.
- **Cómo ejecutar:** ver sección 6. Para un test concreto: `pytest backend/habitos/validacion/tests/test_services.py::test_emitir_voto_mayoria_pasa_a_cumplido -q` (desde `backend/`, ajustando la ruta).

### Frontend

- **Framework:** Vitest con entorno `jsdom` (`frontend/vite.config.js`).
- **Organización:** archivos `.test.js` junto al módulo probado; hay tests unitarios de componentes, router, API, sesión y vistas, además de un test de integración (`src/views/registro.integration.test.js`).
- **Patrones usados:**
  - `vi.stubGlobal('fetch', ...)` para simular la API.
  - Limpieza de `localStorage` y `document.body` en `beforeEach`/`afterEach`.
  - Aserciones sobre DOM (`textContent`, atributos ARIA, elementos presentes) y sobre llamadas a `fetch`.
  - `vi.waitFor` para estados asíncronos.
- **Cómo ejecutar:** `npm test` para todo; `npm test -- src/router.test.js` o `npx vitest run src/router.test.js` para un archivo.
- **No hay** tests E2E, Playwright, Cypress ni pruebas automatizadas de PWA/navegador real en el repositorio. La PWA se verifica manualmente con `npm run build` + `npm run preview`.

### Criterio de implementación validada

Una tarea se considera correctamente validada cuando, como mínimo:

1. Los tests nuevos/actualizados pasan.
2. La suite completa de backend pasa con cobertura 100 % (comando de CI).
3. `ruff check .` y `ruff format --check .` pasan.
4. `python manage.py check` y `makemigrations --check --dry-run` pasan.
5. El esquema OpenAPI se genera sin errores si se tocaron endpoints.
6. `npm test` y `npm run build` pasan si se tocó el frontend.
7. La CI de GitHub Actions queda en verde.

---

## 9. Important Design Decisions

No hay una carpeta de ADR formales; las decisiones están registradas en `docs/`, los README y el propio código. Las decisiones verificables son:

1. **Backend modular por funcionalidad, con capa de servicios.**
   - Cada feature separa transporte (`api/`), lógica (`services/`) y pruebas (`tests/`).
   - Documentado en `backend/README.md` («Organización por funcionalidad») y aplicado en `autenticacion/`, `escuadrones/` y `habitos/`.

2. **Usuario propio con email como identificador y nickname público único.**
   - `CustomUser` elimina `username`, normaliza email a minúsculas y usa una restricción `Lower("nickname")` para unicidad sin distinguir mayúsculas.
   - Ver `backend/usuarios/models/custom_user.py` y `docs/REGISTRO.md`.

3. **JWT de corta duración con rotación y blacklist.**
   - Access 5 min, refresh 1 día, rotación y blacklist tras rotación.
   - Ver `backend/config/settings.py` y `docs/AUTENTICACION_JWT.md`.

4. **Verificación de email obligatoria antes del login.**
   - El registro crea `email_verified=False`; el login rechaza cuentas no verificadas con un mensaje genérico.
   - Ver `backend/autenticacion/login/api/serializers.py`, `backend/autenticacion/registro/services/registration.py` y `docs/RECUPERACION_CONTRASENA.md`.

5. **Respuestas neutras en recuperación y verificación.**
   - No se revela si un email existe; se responde siempre con el mismo mensaje.
   - Ver `backend/autenticacion/recuperacion/api/views.py` y `docs/RECUPERACION_CONTRASENA.md`.

6. **Hábito diario por membresía, no por usuario global.**
   - Un usuario puede tener hábitos distintos en escuadrones distintos.
   - Ver `docs/HABITOS.md`, `docs/ARQUITECTURA.md` y `backend/habitos/models/habito_diario.py`.

7. **Fotos privadas en Cloudinary con URL firmada temporal.**
   - La BD guarda `cloudinary_public_id`; la URL se firma al leer y caduca (1 hora).
   - Ver `backend/habitos/prueba/services/upload.py` y `docs/PRUEBA_FOTO.md`.

8. **Validación por mayoría simple de votantes elegibles.**
   - Votantes elegibles = miembros del escuadrón menos el autor; mayoría cuando `votos_si > votantes_elegibles / 2`.
   - El registro pasa a `cumplido` al alcanzar la mayoría; si no, sigue `pendiente` hasta el cierre.
   - Ver `docs/VALIDACION_HABITO.md` y `backend/habitos/validacion/services/voting.py`.

9. **Cierre diario mediante comando de gestión.**
   - `cerrar_validaciones_diarias` cierra los registros pendientes de una fecha; por defecto, hoy en `Europe/Madrid`.
   - Ver `backend/habitos/management/commands/cerrar_validaciones_diarias.py` y `backend/habitos/validacion/services/closing.py`.
   - Django Q2 ejecuta el cierre atrasado cada día a medianoche; el comando `programar_cierre_diario` crea el horario idempotentemente.

10. **Frontend SPA sin framework, con History API.**
    - Pantallas como funciones que devuelven DOM; rutas y guards centralizados.
    - Ver `frontend/README.md`, `frontend/src/router.js` y `frontend/src/routes.js`.

11. **Sesión en `localStorage` con renovación single-flight.**
    - Clave `habitsquad.session`; `refreshSession()` evita renovaciones concurrentes con el mismo refresh.
    - Ver `frontend/src/session.js`, `frontend/src/api.js` y `frontend/README.md`.

12. **PWA generada en build.**
    - `vite-plugin-pwa` genera manifest y service worker; en desarrollo no existe service worker.
    - Ver `frontend/vite.config.js` y `frontend/README.md`.

13. **SQLite en desarrollo y PostgreSQL en producción.**
    - El cambio se activa por la presencia de `POSTGRES_DB`.
    - Ver `backend/config/settings.py` y `docs/DESPLIEGUE.md`.

14. **Despliegue con Docker Compose, uvicorn y Caddy.**
    - Caddy termina HTTPS, sirve el frontend y hace proxy de API/admin/static.
    - Ver `docker-compose.yml`, `Caddyfile`, `backend/Dockerfile`, `frontend/Dockerfile` y `docs/DESPLIEGUE.md`.

15. **CI con cobertura obligatoria del 100 %.**
    - El workflow falla si la cobertura baja del umbral.
    - Ver `.github/workflows/ci.yml` y `backend/README.md`.

---

## 10. Current Development Context

### Funcionalidades existentes y componentes relevantes

- **WebSocket del panel:** `backend/escuadrones/tiempo_real/consumers.py` acepta conexiones en `ws/escuadrones/{id}/`; el primer mensaje JSON debe llevar `tipo: autenticar` y el access JWT en `access`. Solo miembros activos pueden suscribirse. Los eventos se distribuyen por Redis.
- **Cierre programado:** `backend/habitos/validacion/tasks.py` cierra jornadas pendientes anteriores al día local actual. Django Q2 lo programa a medianoche en `Europe/Madrid`; Compose arranca su worker.
- **Autenticación completa:** registro, verificación de email, login, refresh con rotación, logout y recuperación de contraseña.
  - Rutas: `backend/autenticacion/*/api/urls.py`.
  - Lógica: `backend/autenticacion/*/services/`.
  - Contratos: `docs/REGISTRO.md`, `docs/AUTENTICACION_JWT.md`, `docs/RECUPERACION_CONTRASENA.md`.
- **Escuadrones:** creación con código único, unión por código, listado y detalle con panel.
  - Rutas: `backend/escuadrones/*/api/urls.py`.
  - Lógica: `backend/escuadrones/crear/services/`, `unirse/services/`, `detalle/services.py`.
  - Contratos: `docs/CREAR_ESCUADRON.md`, `docs/UNIRSE_ESCUADRON.md`, `docs/HABITOS.md`.
- **Hábito diario:** asignación y consulta por membresía.
  - `backend/habitos/api/`, `backend/habitos/services/assignment.py`.
- **Prueba fotográfica:** subida a Cloudinary, actualización del registro del día y visualización con URL firmada.
  - `backend/habitos/prueba/`, `docs/PRUEBA_FOTO.md`.
- **Validación por votos:** emisión/consulta, mayoría y cierre diario.
  - `backend/habitos/validacion/`, `docs/VALIDACION_HABITO.md`.
- **Panel y racha:** cálculo de racha y semana en `backend/escuadrones/detalle/services.py`; UI en `frontend/src/views/panelSeleccionado.js` y `frontend/src/components/panel/`.
- **Frontend completo de las pantallas principales:** presentación, login, registro, verificación, recuperación, selector, creación/unión, panel, hábito, subida de prueba y votación.
  - Rutas: `frontend/src/routes.js`.
  - Cliente API: `frontend/src/api.js`.
- **PWA:** manifest, iconos y service worker generados en build.

### Limitaciones y deuda técnica identificadas

Hechos comprobados en el checkout actual:

1. **El cierre diario está programado con Django Q2.**
   - Compose ejecuta un worker separado que programa el cierre cada día a las 00:00 (`Europe/Madrid`) y procesa fechas pendientes anteriores si hubo una interrupción.

2. **Tiempo real implementado; Web Push sigue pendiente.**
   - `docs/SINCRONIZACION_TIEMPO_REAL.md` describe el contrato WebSocket, la autenticación por JWT, los eventos y la tarea de cierre diario.
   - El cliente debe volver a consultar el detalle REST después del evento `panel.actualizado`; no se envía el detalle completo por WebSocket.
   - `ResumenEscuadron.racha` cuenta jornadas cerradas anteriores a la fecha local actual; la jornada de hoy se incorpora al cambiar la fecha. El enlace de T48 está pendiente de confirmar.

3. **El límite de 5 miembros por escuadrón solo se muestra en el frontend.**
   - `frontend/src/views/panelSeleccionado.js` calcula `5 - miembros.length` y `miembrosCard` muestra «de 5 miembros».
   - El backend no impone ese máximo en `Membresia` ni en `unirse_escuadron`; un agente no debe asumir que la API lo aplica.

4. **Hay código frontend heredado o de demo no usado por las rutas activas.**
   - `frontend/src/auth/login.js` y `frontend/src/auth/registro.js` implementan un flujo antiguo con claves `habitsquad.access`/`habitsquad.refresh`; no los importa `routes.js`. El flujo activo usa `habitsquad.session` en `src/session.js`.
   - `frontend/src/views/panelEscuadron.js` y `frontend/src/datosEjemplo.js` no están referenciados por `routes.js`; parecen restos de maquetación/demo.
   - No los uses como fuente de verdad para flujos nuevos; considera su eliminación solo con autorización y tras comprobar que no se usan.

5. **No hay lint/formato/typecheck de frontend.**
   - `frontend/package.json` solo define `dev`, `build`, `preview` y `test`; la CI no ejecuta ESLint/Prettier.

6. **No hay configuración CORS.**
   - El frontend se sirve en el mismo origen que la API en producción (Caddy) y usa proxy en desarrollo. Un cliente en otro origen necesitaría añadir CORS explícitamente.

7. **Documentación parcialmente desactualizada.**
   - `docs/REPORT.md` está vacío.
   - `docs/HABITOS.md` afirma que las métricas de racha y las fotos están «pendientes de implementar», pero el código ya las implementa; esa frase es histórica.
   - `docs/DEPENDENCIAS.md` contiene estados de validación de CI que pueden ser antiguos; la fuente vigente es `.github/workflows/ci.yml`.
   - `docs/login-quitado.md` describe código eliminado en un momento dado; úsalo solo como contexto histórico.
   - `docs/ARQUITECTURA.md` describe el objetivo global y puede incluir funcionalidades aún no implementadas.

8. **Detalle menor de configuración:** `frontend/vite.config.js` declara `server` dos veces; prevalece la segunda definición, con proxy a `http://127.0.0.1:8000`. No es un fallo funcional, pero conviene unificarlo si se toca el archivo.

### Aspectos que requieren especial atención

- **Rutas compartidas:** `GET` y `POST /api/escuadrones/` viven en includes distintos; añadir rutas puede provocar colisiones.
- **Migraciones y usuario custom:** `AUTH_USER_MODEL = "usuarios.CustomUser"`. Cambiar el modelo de usuario es delicado; crea migraciones y prueba el flujo completo.
- **Rotación de refresh:** el backend revoca el refresh usado. Cualquier cliente debe serializar renovaciones; no dupliques lógica de refresh.
- **Fotos privadas:** no expongas `cloudinary_public_id` como URL pública; usa `build_signed_foto_url`.
- **Zona horaria:** los registros diarios y el cierre dependen de `Europe/Madrid`; no uses `datetime.date.today()` sin contexto.
- **Cobertura 100 %:** una rama nueva sin test puede hacer fallar la CI aunque el resto pase.
- **OpenAPI:** los tests verifican el esquema; cambia contratos y documentación a la vez.
- **Secretos:** no incluyas valores reales de `.env`, Cloudinary, SMTP ni claves JWT.

### Cuestiones pendientes de verificar

- Estado real del último workflow de CI y del despliegue en Azure (no se puede confirmar solo desde el código).
- Comportamiento de la PWA en dispositivos reales y HTTPS (la documentación indica que se prueba manualmente).
- Vigencia de los estados de validación escritos en `docs/DEPENDENCIAS.md`.
- Si el límite de 5 miembros es un requisito de producto pendiente de implementar en backend o solo una decisión de UI.

---

## 11. Guidelines for AI Agents

Reglas obligatorias para cualquier agente que modifique este repositorio:

1. **Leer este `AGENTS.md` antes de cualquier modificación.** Si el cambio afecta a una funcionalidad, lee también su contrato en `docs/` y su README.
2. **Analizar el código relacionado antes de proponer cambios.** Localiza la app/carpeta, las rutas, los serializers, los servicios, los modelos y los tests existentes.
3. **Reutilizar la arquitectura, patrones y convenciones existentes.** No introduzcas una capa, framework o patrón nuevo si el repositorio ya resuelve el problema de otra forma.
4. **Evitar modificaciones innecesarias fuera del alcance solicitado.** No reformatees archivos completos ni renombres símbolos ajenos a la tarea.
5. **No introducir dependencias nuevas sin justificación clara.** Si son imprescindibles, fija la versión, actualiza `requirements*.txt` o `package.json`/`package-lock.json` y documenta el cambio en `docs/DEPENDENCIAS.md`.
6. **No inventar funcionalidades, requisitos ni comportamientos.** Si un dato no está en el código o en `docs/`, indícalo como no verificado.
7. **No modificar interfaces públicas sin comprobar sus dependencias.** Revisa frontend, tests, OpenAPI y documentación antes de cambiar rutas, campos, códigos de estado o formatos de respuesta.
8. **Mantener la compatibilidad con el código existente.** Respeta las claves de sesión, los nombres de campos de la API, los valores de estado (`pendiente`, `cumplido`, `no_cumplido`) y los valores de voto (`"sí"`, `"no"`).
9. **Añadir o actualizar tests cuando se introduzcan cambios funcionales.** Mantén el umbral de cobertura del 100 % en backend y actualiza los tests de frontend afectados.
10. **Ejecutar las comprobaciones pertinentes antes de dar una tarea por finalizada.** Como mínimo, las de la sección 6 que apliquen al área modificada.
11. **Informar de los archivos modificados, decisiones tomadas y pruebas ejecutadas.** Indica también lo que no se pudo verificar.
12. **No sobrescribir cambios del usuario ni realizar operaciones destructivas sin autorización.** No borres archivos, ramas, datos, migraciones ni configuraciones sin confirmación explícita.
13. **No incluir credenciales, tokens, contraseñas ni secretos.** Usa `.env.example` solo para nombres; nunca valores reales.
14. **No editar artefactos generados** (`dist/`, `staticfiles/`, `db.sqlite3`, `node_modules/`, `.venv/`) ni migraciones ya aplicadas en producción sin un plan claro.
15. **Respetar el flujo del proyecto:** ramas personales para PBIs, PR y CI en verde; los commits los realiza manualmente la persona responsable salvo petición explícita.

---

## 12. Context Maintenance

Este documento debe mantenerse actualizado cuando el contexto del proyecto cambie de forma significativa.

### Cuándo actualizar `AGENTS.md`

Actualízalo si cambia alguno de estos elementos:

- La arquitectura (nuevas apps, capas, patrones, servicios externos).
- Las tecnologías principales o sus versiones relevantes.
- La estructura del repositorio (nuevas carpetas de dominio, reorganización).
- Los comandos de desarrollo, build, test o calidad.
- Las convenciones de implementación (nombres, estilo, manejo de errores, logging).
- Las decisiones técnicas relevantes (nuevos ADR o cambios en `docs/`).
- Los procesos de testing, CI/CD o despliegue.
- Las limitaciones conocidas o la deuda técnica relevante.

### Cuándo no actualizarlo

No lo actualices por cambios triviales que no afecten al contexto general: correcciones de texto, ajustes visuales menores, refactors internos sin impacto en comandos/arquitectura, o cambios de una sola prueba que no alteren la estrategia.

### Protocolo

1. Verifica el cambio en el código y en los archivos de configuración; no lo escribas de memoria.
2. Actualiza primero la documentación específica (`docs/`, README de backend/frontend) si el cambio afecta a un contrato o comando.
3. Actualiza `AGENTS.md` solo con la información operativa que un agente necesite para trabajar.
4. Comprueba que las rutas, comandos y referencias citadas siguen existiendo.
5. No incluyas secretos ni valores de entorno reales.
6. Si detectas una contradicción entre `AGENTS.md`, `docs/` y el código, investiga y corrige la fuente incorrecta; no dupliques la contradicción.
7. Registra la fecha de revisión al principio del documento cuando hagas una actualización sustancial.

### Checklist rápido de revisión

- [ ] ¿Siguen existiendo las rutas y archivos citados?
- [ ] ¿Los comandos coinciden con `package.json`, `pytest.ini`, `ruff.toml`, `docker-compose.yml` y `.github/workflows/`?
- [ ] ¿Las versiones coinciden con `requirements*.txt` y `package.json`?
- [ ] ¿Las limitaciones descritas siguen siendo ciertas?
- [ ] ¿Hay secretos o datos sensibles en el documento?
- [ ] ¿El documento sigue siendo útil para empezar una tarea sin explorar todo el repositorio?
