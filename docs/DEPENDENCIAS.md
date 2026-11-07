# Dependencias y runtimes

Este documento registra los runtimes y las dependencias acordados para que el
equipo pueda reproducir el entorno. Cada cambio de versiones o incorporación
de paquetes debe reflejarse aquí.

## Runtimes

| Área | Versión objetivo | Estado |
| --- | --- | --- |
| Backend | Python 3.12.x | Instalado y probado localmente con Python 3.12.3 en `backend/.venv`. |
| Frontend | Node.js 22.x (LTS) y npm | Probado localmente con Node.js 22.22.1. Fijado en `frontend/.nvmrc` y en `engines` de `package.json`. |
| CI | GitHub Actions | El workflow fija `actions/checkout@v7.0.1` y `actions/setup-python@v7.0.0`. El primer workflow de dependencias pasó; el workflow ampliado con pruebas debe validarse al subir estos cambios. |

## Backend

El manifiesto [backend/requirements.txt](../backend/requirements.txt) incluye
versiones exactas de las dependencias directas y transitivas para reproducir
la resolución comprobada con Python 3.12.x.

### Dependencias principales

| Paquete | Versión | Propósito |
| --- | --- | --- |
| Django | 5.2.18 | Framework del backend; línea 5.2 LTS dentro del Django 5 acordado. |
| djangorestframework | 3.18.3 | API REST. |
| djangorestframework-simplejwt | 5.5.1 | Autenticación JWT. |
| drf-spectacular | 0.30.0 | Generación de documentación OpenAPI. |
| cloudinary | 1.47.0 | Cliente de Cloudinary para subir y firmar fotos. |
| django-cloudinary-storage | 0.3.0 | Integración de Cloudinary como almacenamiento de ficheros en Django. |
| pytest | 9.1.1 | Ejecución de pruebas. |
| pytest-django | 4.14.0 | Integración de pytest con Django. |
| pytest-cov | 7.1.0 | Informes de cobertura para pytest. |
| ruff | 0.17.0 | Lint y formato del código Python. |

### Resolución completa fijada

Además de los paquetes principales, el manifiesto fija las dependencias
transitivas que resolvió pip:

| Paquete | Versión |
| --- | --- |
| PyJWT | 2.15.1 |
| PyYAML | 6.0.3 |
| Pygments | 2.21.0 |
| asgiref | 3.12.1 |
| attrs | 26.1.0 |
| certifi | 2026.10.23 |
| charset_normalizer | 3.5.2 |
| coverage | 7.16.2 |
| idna | 3.20 |
| inflection | 0.5.1 |
| iniconfig | 2.3.1 |
| jsonschema | 4.26.0 |
| jsonschema-specifications | 2025.9.1 |
| packaging | 26.3 |
| pluggy | 1.6.0 |
| referencing | 0.37.0 |
| requests | 2.34.2 |
| rpds-py | 2026.9.1 |
| six | 1.17.0 |
| sqlparse | 0.6.0 |
| typing_extensions | 4.16.0 |
| uritemplate | 4.2.0 |
| urllib3 | 2.8.0 |

### Dependencias de producción

[backend/requirements-prod.txt](../backend/requirements-prod.txt) incluye
`requirements.txt` y añade lo que solo necesita la imagen de producción:

| Paquete | Versión | Propósito |
| --- | --- | --- |
| uvicorn | 0.54.0 | Servidor ASGI, preparado para Django Channels. |
| psycopg / psycopg-binary | 3.3.6 | Driver de PostgreSQL. |
| click | 8.5.0 | Dependencia de uvicorn. |
| h11 | 0.16.0 | Dependencia de uvicorn. |

Las dependencias de otras áreas previstas por la arquitectura —como Channels,
Redis, Django Q2 y Web Push— se incorporarán cuando se trabaje en las fases
correspondientes, con sus versiones y cambios documentados. Cloudinary ya está
incluido para el almacenamiento de las fotos de prueba diaria.

### Instalación local

Desde la raíz del repositorio, en un sistema con soporte para entornos
virtuales de Python 3.12:

```bash
python3.12 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
```

Para confirmar las versiones instaladas:

```bash
python --version
python -m django --version
pytest --version
coverage --version
ruff --version
```

La instalación se debe realizar en el entorno virtual, no sobre los paquetes
globales del sistema.

### Estado de validación

- **Instalación local comprobada:** las dependencias se instalaron en
  `backend/.venv` con Python 3.12.3. Django 5.2.18, pytest 9.1.1, coverage
  7.16.2 y Ruff 0.17.0 arrancan correctamente.
- **Backend comprobado localmente:** `manage.py check`, migraciones SQLite y
  consistencia de migraciones pasan; los 10 tests del paquete `usuarios`
  pasan con 100 % de cobertura.
- **CI pendiente de validar con estos cambios:** GitHub Actions debe volver a
  ejecutar instalación, Ruff, checks Django, migraciones y tests después del
  push que incluya el workflow ampliado.
- **Entorno local:** el entorno virtual `backend/.venv` está ignorado por Git.
  No se instalaron paquetes en el Python global del sistema.

## Producción

Imágenes de Docker fijadas en los Dockerfile y en `docker-compose.yml`. El
despliegue está descrito en [DESPLIEGUE.md](DESPLIEGUE.md).

| Imagen | Versión |
| --- | --- |
| python | 3.12.15-slim |
| node (solo para el build) | 22.23.3-alpine |
| caddy | 2.11.7-alpine |
| postgres | 18.6-alpine |

## Frontend

Las versiones exactas están en [frontend/package.json](../frontend/package.json)
y el árbol completo en `frontend/package-lock.json`, que se instala con
`npm ci` para reproducir el entorno.

### Dependencias principales

| Paquete | Versión | Propósito |
| --- | --- | --- |
| vite | 8.3.4 | Servidor de desarrollo y build del frontend. |
| tailwindcss | 4.3.3 | Estilos con clases de utilidad. |
| @tailwindcss/vite | 4.3.3 | Integración de Tailwind en Vite. |
| vitest | 5.0.3 | Pruebas de la lógica del frontend. |
| jsdom | 30.1.2 | DOM simulado para las pruebas de Vitest. |
| vite-plugin-pwa | 2.0.0 | Genera el manifest y el service worker de la PWA (Workbox). |

Vite 8 requiere Node.js 20.19+ o 22.12+. Se fija Node.js 22 LTS porque
Node.js 20 terminó su soporte en abril de 2026.

### Estado de validación

- **Comprobado localmente** con Node.js 22.22.1 y npm 9.2.0: `npm ci`,
  `npm test` y `npm run build` pasan, y el build incluye los estilos de
  Tailwind, el manifest y el service worker.
- **Comprobado en Chrome** con `npm run preview`: el service worker se activa,
  el manifest se carga y la aplicación abre sin conexión.
- **CI:** el job `frontend` de GitHub Actions ejecuta `npm ci`, `npm test` y
  `npm run build`.
