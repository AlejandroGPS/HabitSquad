# Despliegue en producción

HabitSquad se despliega en una máquina virtual de Azure (Azure for Students)
con Docker Compose. Caddy sirve el frontend, hace de proxy hacia Django y
obtiene y renueva solo el certificado HTTPS de Let's Encrypt.

URL de producción: <https://habitsquad.austriaeast.cloudapp.azure.com>

## Máquina virtual

| Elemento | Valor |
| --- | --- |
| Suscripción | Azure for Students |
| Grupo de recursos | `habitsquad-rg` |
| Región | Austria Este (`austriaeast`) |
| Máquina | `habitsquad-vm`, Ubuntu 24.04 LTS, `Standard_B2ats_v2` (2 vCPU, 1 GB) |
| Disco | Standard SSD de 30 GB |
| Swap | 2 GB en `/swapfile` |
| Usuario | `habitsquad`, solo con clave SSH |
| Puertos abiertos | 22, 80 y 443 |

La suscripción de estudiante solo permite desplegar en Italia Norte, Suecia
Central, Polonia Central, Austria Este y Suiza Norte. `Standard_B1s` no está
disponible para la suscripción en ninguna de ellas; `Standard_B2ats_v2` tiene
la misma memoria y también entra en las horas gratuitas de Azure for Students.

Para la demo se puede ampliar temporalmente la memoria sin perder datos:

```bash
az vm deallocate -g habitsquad-rg -n habitsquad-vm
az vm resize -g habitsquad-rg -n habitsquad-vm --size Standard_B2als_v2
az vm start -g habitsquad-rg -n habitsquad-vm
```

## Servicios

| Servicio | Imagen | Función |
| --- | --- | --- |
| `db` | `postgres:18.6-alpine` | Base de datos, con los datos en el volumen `postgres-data`. |
| `api` | `backend/Dockerfile` | Django sobre uvicorn (ASGI). Al arrancar aplica las migraciones y ejecuta `collectstatic`. |
| `web` | `frontend/Dockerfile` | Build de Vite servido por Caddy, con HTTPS. |

Caddy reparte las peticiones según el `Caddyfile`:

- `/api/` y `/admin/` van a Django.
- `/static/` sirve los estáticos de Django.
- El resto sirve el frontend; si la ruta no es un archivo, responde con
  `index.html` para que funcione el enrutador del cliente.

## Variables de entorno

El `.env` de producción solo existe en la máquina, en `~/habitsquad/.env`, con
permisos `600`. Las variables están descritas en `.env.example`. La clave de
Django y la contraseña de PostgreSQL se generaron aleatoriamente en el
servidor y no están en el repositorio.

Sin `POSTGRES_DB`, Django sigue usando SQLite, así que el desarrollo local no
cambia.

### Enviar correo de verificación con Gmail

Activa la verificación en dos pasos en la cuenta remitente del proyecto y
[crea una contraseña de aplicación](https://support.google.com/accounts/answer/185833?hl=es).
En la VM, añade o actualiza estas variables en `~/habitsquad/.env`, con
permisos `600`. Usa la misma cuenta en `EMAIL_HOST_USER` y
`DEFAULT_FROM_EMAIL` y pega la contraseña de aplicación sin espacios.

```dotenv
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_TIMEOUT=10
EMAIL_HOST_USER=remitente@gmail.com
EMAIL_HOST_PASSWORD=CONTRASENA_DE_APLICACION
DEFAULT_FROM_EMAIL=remitente@gmail.com
EMAIL_VERIFICATION_FRONTEND_URL=https://habitsquad.austriaeast.cloudapp.azure.com/verify-email
```

Si la versión con `/verify-email` ya está desplegada, recrea el contenedor de
la API para que Docker lea el archivo actualizado.

```bash
cd ~/habitsquad
docker compose config --quiet
docker compose up -d --no-deps --force-recreate api
```

Abre la web pública y registra una cuenta de prueba o solicita el reenvío para
una cuenta pendiente de verificar. Comprueba que el mensaje llega, que el
enlace apunta al dominio público y que después de confirmarlo puedes iniciar
sesión. Si hay un error, revisa `docker compose logs --tail 80 api`. Un error
SMTP `535` indica que Google rechazó la autenticación. Un tiempo de espera
agotado puede indicar que el contenedor no alcanza `smtp.gmail.com:587`.

## Despliegue automático

El workflow `.github/workflows/deploy.yml` se ejecuta cuando termina
correctamente la CI de un cambio en `main`. Se conecta por SSH a la máquina,
actualiza el repositorio a `origin/main` y ejecuta `scripts/deploy.sh`.

La clave de GitHub Actions es exclusiva para CD. En `authorized_keys` está
restringida a ejecutar `/home/habitsquad/run-deploy`; no permite obtener una
shell ni abrir túneles. El repositorio tiene estos secretos:

| Secreto | Contenido |
| --- | --- |
| `AZURE_VM_HOST` | Nombre DNS de la máquina. |
| `AZURE_VM_USER` | Usuario SSH de despliegue. |
| `AZURE_VM_SSH_KEY` | Clave privada exclusiva de GitHub Actions. |
| `AZURE_VM_KNOWN_HOSTS` | Clave pública SSH del servidor para verificar su identidad. |

El script construye las imágenes de una en una, arranca los contenedores y
comprueba por HTTPS tanto el frontend como el admin de Django. Las migraciones
se aplican en el arranque de la API. GitHub Actions vuelve a comprobar la URL
desde fuera de Azure.

También se puede lanzar manualmente desde la pestaña **Actions > CD > Run
workflow**.

## Desplegar a mano

Desde la máquina virtual, en `~/habitsquad` y con el código actualizado:

```bash
./scripts/deploy.sh
```

Las imágenes se construyen de una en una para no agotar la memoria.

Comprobaciones:

```bash
docker compose ps
docker compose logs --tail 50 api
curl -I https://habitsquad.austriaeast.cloudapp.azure.com
```

## Operación

```bash
ssh -i ~/.ssh/habitsquad_azure habitsquad@habitsquad.austriaeast.cloudapp.azure.com
docker compose exec api python manage.py createsuperuser
docker compose exec db psql -U habitsquad -d habitsquad
```

La máquina debe seguir encendida hasta la entrega final: si se apaga, Caddy no
puede renovar el certificado.
