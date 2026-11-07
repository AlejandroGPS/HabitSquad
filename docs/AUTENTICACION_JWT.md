# Autenticación JWT

Esta guía describe el flujo JWT implementado en el backend de HabitSquad, el
papel de cada token y las garantías y límites de seguridad. No sustituye la
documentación interactiva de OpenAPI, disponible en `/api/docs/` con el
servidor local en marcha.

## Conceptos

La API entrega dos tokens distintos al iniciar sesión:

- **Access token (acceso):** credencial de vida corta que el cliente presenta
  para acceder a endpoints protegidos. Su duración configurada es de **5
  minutos**.
- **Refresh token (renovación):** credencial de mayor duración, configurada
  para **1 día**, que se presenta al endpoint de refresh para obtener un nuevo
  par de tokens. No debe enviarse como sustituto del access token a cada
  endpoint.

Los dos son credenciales *bearer*: quien obtenga una copia puede intentar
utilizarlos como el cliente legítimo mientras sean válidos. La expiración
reducida del access limita el tiempo de uso de una copia robada; la rotación
permite invalidar el refresh utilizado y evitar su reutilización después de
que se haya renovado correctamente.

## Registro desde la aplicación

La pantalla **Registrarme** está en `/registro`. El usuario escribe su correo y
una contraseña. La aplicación comprueba el formato en el navegador y envía
`POST /api/auth/register/`.

Ese alta no devuelve tokens. El usuario debe verificar primero su correo
mediante el enlace recibido. Después, la propia aplicación llama a
`POST /api/auth/token/` con el mismo correo y la misma contraseña. Guarda
`access` en `localStorage` con la clave `habitsquad.access` y `refresh` con
`habitsquad.refresh`, y abre la pantalla principal (`/`). La ruta `/menu` se
conserva por compatibilidad.

Si el alta responde `201` pero el token no se obtiene, la cuenta queda creada
y no se guarda la sesión. La pantalla muestra «La cuenta se ha creado, pero no
se ha podido iniciar la sesión.». Un `400` muestra el aviso del campo (`email`
o `password`), por ejemplo si el correo ya existe. Un `429` indica que se ha
superado el límite de cinco registros anónimos por hora.

Para verlo: con el backend en el puerto 8000 y el frontend de Vite, abre
`/registro`, crea la cuenta con un correo nuevo y comprueba que la dirección
pasa a `/`. En las herramientas del navegador, la pestaña Red debe mostrar
el `201` de `register/` y el `200` de `token/`. En Almacenamiento deben aparecer
las dos claves.

## Flujo de uso

1. El cliente envía su email y contraseña a `POST /api/auth/token/`.
   Tras un alta correcta, la pantalla de registro hace esta llamada sola.
2. Si son válidos y la cuenta está activa, la API devuelve `{ "access":
   "...", "refresh": "..." }`.
3. El cliente envía el access token en `Authorization: Bearer <access>` al
   llamar a endpoints que requieran autenticación.
4. Cuando el access token expire, el cliente envía el refresh vigente a
   `POST /api/auth/token/refresh/`.
5. Si el refresh es válido, la API devuelve un access y un refresh nuevos. El
   refresh presentado se añade a la blacklist; desde entonces no puede usarse
   de nuevo.
6. El cliente debe sustituir ambos tokens guardados por los nuevos. Debe
   serializar las renovaciones concurrentes: si envía varias veces el mismo
   refresh a la vez, solo la primera renovación puede tener éxito y las demás
   solicitudes pueden recibir `401`.

El endpoint de renovación solo necesita el refresh en el cuerpo JSON; no se
envía el access vencido:

```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "<refresh-vigente>"
}
```

Respuesta correcta (`200 OK`):

```json
{
  "access": "<nuevo-access>",
  "refresh": "<nuevo-refresh>"
}
```

## Endpoints de tokens y sesión

### Inicio de sesión

`POST /api/auth/token/`

Petición:

```json
{
  "email": "persona@example.com",
  "password": "<contraseña>"
}
```

- `200 OK`: devuelve `access` y `refresh`.
- `401 Unauthorized`: credenciales incorrectas o cuenta inactiva. El error es
  genérico y no revela cuál de esas condiciones ocurrió.
- `429 Too Many Requests`: se superó el límite actual de cinco intentos por
  hora y dirección IP.

### Renovación y rotación

`POST /api/auth/token/refresh/`

- `200 OK`: devuelve los dos tokens nuevos y revoca el refresh presentado.
- `400 Bad Request`: falta el campo `refresh` o está vacío.
- `401 Unauthorized`: el token está malformado, expirado o ya está en
  blacklist.

La validación criptográfica y la rotación las realiza SimpleJWT. La aplicación
`rest_framework_simplejwt.token_blacklist` registra los refresh emitidos y
revocados en la base de datos. Por eso se deben aplicar las migraciones después
de instalar o habilitar esta aplicación:

```bash
cd backend
python manage.py migrate
```

## Qué aporta y qué no aporta la rotación

La renovación periódica **no hace que un token robado sea imposible de usar**.
Reduce la exposición del access al limitar su vida a cinco minutos y, después
de una renovación correcta, vuelve inutilizable el refresh anterior.

Hay límites importantes:

- Si alguien roba el refresh antes que el cliente legítimo y lo usa primero,
  podría obtener un nuevo par de tokens. La rotación no puede distinguir cuál
  de los dos poseedores es el legítimo.
- Un access ya emitido sigue siendo válido hasta que expire. Añadir el refresh
  anterior a la blacklist no revoca access tokens ya creados; en este proyecto
  su vigencia máxima configurada es de cinco minutos.
- La blacklist protege contra la reutilización del refresh revocado, pero no
  protege si el atacante roba el refresh nuevo después de una rotación.
- Las duraciones cortas y la rotación reducen el impacto; no sustituyen HTTPS,
  protección del dispositivo, control de acceso ni almacenamiento seguro.

## Almacenamiento y manejo por el cliente

Los tokens deben tratarse como secretos:

- No incluirlos en logs, mensajes de error, URLs, analítica ni capturas.
- Usar HTTPS fuera del entorno local para que no viajen en claro.
- Limitar el acceso al almacenamiento del cliente y evaluar sus riesgos. El
  almacenamiento accesible a JavaScript puede exponer tokens si ocurre un
  XSS; las cookies `HttpOnly`, `Secure` y `SameSite` reducen algunos riesgos,
  pero requieren diseñar y proteger el flujo contra CSRF. La API actual
  devuelve tokens JSON y no configura cookies.
- No reutilizar el refresh después de recibir un refresh nuevo. Si el cliente
  no puede almacenar de forma segura la respuesta, debe pedir al usuario que
  inicie sesión de nuevo.

## Configuración actual

Los valores están definidos en `backend/config/settings.py` mediante
`SIMPLE_JWT`:

| Ajuste | Valor | Efecto |
| --- | --- | --- |
| `ACCESS_TOKEN_LIFETIME` | 5 minutos | Tiempo máximo de validez del access emitido. |
| `REFRESH_TOKEN_LIFETIME` | 1 día | Vigencia máxima del refresh desde su emisión. |
| `ROTATE_REFRESH_TOKENS` | `True` | Emite un refresh nuevo al renovar. |
| `BLACKLIST_AFTER_ROTATION` | `True` | Revoca el refresh usado en la renovación. |

La duración de un refresh nuevo empieza al emitirlo y no es una sesión
ilimitada: cada refresh también caduca según su fecha de expiración.

### Cierre de sesión

`POST /api/auth/logout/`

Petición:

```json
{
  "refresh": "<refresh-vigente>"
}
```

- `204 No Content`: el refresh se añadió a la blacklist; no hay cuerpo de
  respuesta.
- `400 Bad Request`: el campo falta o está vacío, el token está malformado,
  expiró, no es un refresh o ya había sido revocado.

El logout invalida el refresh enviado, no los access tokens ya emitidos. Esos
access tokens siguen siendo válidos hasta su expiración (cinco minutos como
máximo según la configuración actual). Si el cliente tiene más de una sesión o
dispositivo, este endpoint cierra la sesión asociada al refresh proporcionado,
no todas las sesiones de la cuenta.

## Prueba manual

1. Inicia el backend y abre `/api/docs/`.
2. Usa `POST /api/auth/token/` con una cuenta existente para obtener ambos
   tokens.
3. Usa `POST /api/auth/token/refresh/` y pega el refresh obtenido.
4. Confirma que la respuesta incluye tokens distintos.
5. Vuelve a enviar el refresh anterior: debe responder `401`.
6. Envía el refresh nuevo: debe poder renovarse mientras no haya expirado ni
   se haya usado antes.
7. Envía un refresh todavía válido a `POST /api/auth/logout/`: debe responder
   `204` sin contenido.
8. Vuelve a enviar ese refresh al logout o al refresh: el logout debe responder
   `400` y el refresh, `401`.

No compartas tokens reales en incidencias, documentación, capturas o
repositorios.
