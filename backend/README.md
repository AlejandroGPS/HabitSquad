# Backend

API de HabitSquad implementada con Django y Django REST Framework.

## Requisitos

- Python 3.12.x.
- Dependencias fijadas en `requirements.txt`.

## Preparar el entorno local

Desde la raíz del repositorio:

```bash
python3.12 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
```

El entorno virtual contiene los paquetes del proyecto y no debe subirse al
repositorio; está excluido por el `.gitignore` raíz.

## Comandos de desarrollo

Desde `backend/` con el entorno virtual activado:

```bash
python manage.py migrate
python manage.py check
pytest --cov=usuarios --cov=autenticacion --cov=escuadrones --cov=habitos --cov-report=term-missing --cov-fail-under=100
ruff check .
ruff format --check .
python manage.py runserver
```

La configuración actual usa SQLite y está pensada para desarrollo. La clave
por defecto de Django es solo local; antes de cualquier despliegue se debe
definir `DJANGO_SECRET_KEY` mediante la configuración segura del entorno.

## API de registro

Con el servidor iniciado, la documentación interactiva de la API está
disponible en `http://127.0.0.1:8000/api/docs/` y el esquema OpenAPI en
`http://127.0.0.1:8000/api/schema/`.

El endpoint `POST /api/auth/register/` recibe `email` y `password`, y devuelve
`id`, `email` y `date_joined`. No devuelve tokens. La aplicación web, tras un
`201`, pide la sesión en `POST /api/auth/token/` con las mismas credenciales.
El endpoint limita las solicitudes anónimas a cinco por hora y dirección IP.

El endpoint `POST /api/auth/token/` recibe `email` y `password` y devuelve
`access` y `refresh`. El token de acceso dura cinco minutos y el de renovación,
un día. Los intentos de inicio de sesión también están limitados a cinco por
hora y dirección IP.

El endpoint `POST /api/auth/token/refresh/` recibe un token `refresh` y devuelve
un nuevo `access` y un nuevo `refresh`. Al rotarlo, el token anterior se añade
a la blacklist y deja de ser válido. La blacklist de SimpleJWT persiste en la
base de datos; aplica las migraciones con `python manage.py migrate` antes de
usar el endpoint.

El endpoint `POST /api/auth/logout/` recibe el refresh vigente, lo revoca y
responde `204 No Content`. Un token ausente, inválido, expirado o ya revocado
responde `400 Bad Request`.

Para entender el ciclo de tokens, sus límites de seguridad y probarlo
manualmente, consulta la [guía de autenticación JWT](../docs/AUTENTICACION_JWT.md).

## API de escuadrones

El endpoint autenticado `POST /api/escuadrones/` recibe `nombre` y crea un
escuadrón. El usuario del access token queda como miembro administrador y el
escuadrón obtiene un `codigo_invitacion` único de 6 caracteres (`A–Z`, `0–9`).
La respuesta incluye `id`, `nombre`, `codigo_invitacion`, `creador_id` y
`miembros`.

El contrato de entrada y respuesta está documentado en
[docs/CREAR_ESCUADRON.md](../docs/CREAR_ESCUADRON.md).

## API de hábitos diarios

Cada usuario tiene un único hábito por escuadrón. El hábito se asocia a
`Membresia`, por lo que puede ser diferente en cada grupo.

- `PUT /api/escuadrones/{escuadron_id}/habito/`: crea o actualiza el hábito
  propio.
- `GET /api/escuadrones/{escuadron_id}/habito/`: consulta el hábito propio.
- `GET /api/escuadrones/{escuadron_id}/`: consulta el escuadrón y el hábito de
  cada miembro.

Todos requieren JWT y pertenencia al escuadrón. La opción `otro` requiere un
texto personalizado no vacío de hasta 255 caracteres. El contrato completo
está en [docs/HABITOS.md](../docs/HABITOS.md).

## Usuario

La app `usuarios` contiene el modelo `CustomUser`, su configuración de
administración y sus pruebas. El modelo usa un ID `BigAutoField`, email único
normalizado a minúsculas como identificador y el manejo de contraseña hasheada
de Django. La migración inicial se creó después de configurar `AUTH_USER_MODEL`.

## Organización por funcionalidad

Cada funcionalidad de autenticación separa el transporte HTTP, la lógica de
aplicación y sus pruebas:

```text
autenticacion/
├── urls.py                     # Agrupa rutas de autenticación
├── login/                      # Inicio de sesión y emisión de tokens
│   ├── api/
│   └── tests/
├── refresh/                    # Renovación y rotación de tokens
│   ├── api/
│   └── tests/
└── registro/
    ├── api/                    # Endpoints, rutas y serializadores HTTP
    ├── services/               # Operaciones de aplicación y escritura de datos
    └── tests/                  # Pruebas de API y servicios

usuarios/
├── models/                     # Entidades persistentes compartidas
├── admin.py                   # Integración con Django Admin
└── tests/                      # Pruebas del modelo de usuario

escuadrones/
├── models/                     # Escuadrón y membresía
├── crear/                      # Creación de escuadrón
│   ├── api/
│   ├── services/
│   └── tests/
├── detalle/                    # Consulta del escuadrón y hábitos de miembros
│   ├── api/
│   └── tests/
└── tests/                      # Pruebas del modelo

habitos/
├── models/                     # Hábito diario por membresía
├── api/                        # Serializers, vistas y rutas
├── services/                   # Asignación y consulta
└── tests/                      # Pruebas del modelo, API y OpenAPI
```

El flujo de registro es `registro/api/urls.py` → `registro/api/views.py` →
`registro/api/serializers.py` → `registro/services/registration.py` →
`usuarios.models`. Login usa SimpleJWT para autenticar y emitir tokens; refresh
usa SimpleJWT para rotarlos y almacenarlos en blacklist. La creación de
escuadrón es `escuadrones/crear/api/` → `crear/services/creation.py` →
`escuadrones.models`. Los hábitos se asignan mediante
`habitos/api/` → `habitos/services/` → `HabitoDiario`, usando `Membresia` como
relación usuario-escuadrón. Cada funcionalidad mantiene sus pruebas en su
propio `tests/`. Solo se añaden modelos bajo `usuarios/models/` si hacen falta
nuevas entidades de usuario; no se duplica el usuario por cada operación.