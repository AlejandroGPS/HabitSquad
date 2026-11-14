# Frontend

Aplicación web de HabitSquad implementada con Vite, HTML, Tailwind CSS y
JavaScript.

## Requisitos

- Node.js 22.x (LTS) y npm. La versión está en `.nvmrc`.
- Dependencias fijadas en `package.json` y `package-lock.json`.

## Preparar el entorno local

Desde `frontend/`:

```bash
npm ci
```

`npm ci` instala exactamente las versiones del `package-lock.json`. Para añadir
o actualizar una dependencia se usa `npm install` y se suben los cambios de
`package.json` y `package-lock.json` en el mismo commit. La carpeta
`node_modules/` no se sube; está excluida por el `.gitignore` raíz.

## Comandos de desarrollo

Desde `frontend/`:

```bash
npm run dev       # servidor de desarrollo en http://localhost:5173
npm test          # pruebas con Vitest
npm run build     # build de producción en dist/
npm run preview   # sirve el build de dist/ en local
```

Las pruebas se escriben junto al código con el sufijo `.test.js`, por ejemplo
`src/router.test.js`. Se ejecutan en un DOM simulado con jsdom, así que pueden
crear elementos y lanzar eventos.

## Registro y sesión

`/registro` envía el correo y la contraseña a `POST /api/auth/register/`. Tras
verificar el correo, `/login` pide `POST /api/auth/token/` y guarda la sesión
en `localStorage` con la clave `habitsquad.session`.

A continuación la aplicación abre `/`. La ruta `/menu` se conserva por
compatibilidad. En desarrollo, Vite reenvía `/api` a
`http://127.0.0.1:8000`. El contrato de la API está en
OpenAPI y el recorrido de la sesión, en `docs/AUTENTICACION_JWT.md`.

## Pantallas y enrutador

Cada pantalla es una función que devuelve un elemento del DOM. Las rutas se
declaran en `src/routes.js`:

```js
{
  path: '/escuadrones/nuevo',
  title: 'Crea tu escuadrón',
  view: () => crearEscuadron(),
}
```

El enrutador (`src/router.js`) usa la History API: las URL son normales
(`/login`, no `/#/login`). Los enlaces internos llevan el atributo
`data-link` para cambiar de pantalla sin recargar la página:

```html
<a href="/registro" data-link>Registrarme</a>
```

Desde código se navega con `router.navigate('/login')`; cada pantalla recibe
`navigate` como argumento de `view`. Las rutas que no existen muestran la
pantalla «Página no encontrada».

Una ruta con `private: true` exige sesión: sin ella, el enrutador lleva a
`/login`. Una con `guestOnly: true` (login y registro) lleva a `/` si ya hay
sesión. Ambas redirecciones sustituyen la entrada del historial.

## Diseño responsive y componentes

La interfaz es mobile-first: primero se compone para una columna estrecha y
después se adapta con los prefijos `sm:` y `lg:` de Tailwind. Las pantallas de
acceso (iniciar sesión, registro y recuperar contraseña) siguen un estilo tipo
Duolingo con cristal: fondo de colores, tarjetas translúcidas, letra Nunito,
botones gruesos y la mascota del escuadrón. El resto de pantallas mantiene su
propio estilo. Todo cabe en la pantalla sin hacer scroll, también en móviles
pequeños.

Los colores son tokens de `src/style.css` (`bg-canvas`, `text-ink`,
`text-ink-muted`, `bg-accent`, `text-streak`…); no se escriben valores
hexadecimales en las vistas. El naranja de la racha se reserva para los días
de racha. Las animaciones solo se activan con `motion-safe:` y el cristal se
vuelve opaco si el sistema pide reducir la transparencia.

Las piezas repetidas viven en `src/components/` y las pantallas solo componen
esos bloques y contienen su lógica:

- `layout.js`: `accessLayout`, con la barra superior, la mascota con su
  bocadillo, la tarjeta con título y contenido y, en escritorio, las insignias
  decorativas (ocultas a lectores de pantalla).
- `navbar.js`: barra de acceso con el logo y los enlaces de iniciar sesión y
  registrarme.
- `forms.js`: campos, contraseña con mostrar/ocultar, errores, avisos y botón
  de envío con estado de espera.
- `navigation.js`: enlace de recuperación y enlace de volver.
- `brand.js` e `icons.js`: icono de la app y la llama de la racha.

Al crear una pantalla nueva se reutilizan estos componentes antes de copiar
clases o crear otra variante parecida.

## Sesión y llamadas a la API

Al iniciar sesión, `login()` (`src/api.js`) guarda el access y el refresh
token en `localStorage` (`src/session.js`). Las llamadas a endpoints que
requieren sesión se hacen con `authFetch`, que acepta los mismos argumentos que
`fetch` y añade `Authorization: Bearer <access>`:

```js
import { authFetch } from './api.js'

const response = await authFetch('/api/escuadrones/', { method: 'POST', body })
```

Si la API responde `401`, `authFetch` renueva los tokens con
`/api/auth/token/refresh/` y repite la petición una vez. Si varias peticiones
caducan a la vez, se hace una sola renovación. Si el refresh ya no vale, borra
la sesión y la aplicación vuelve a `/login`. `logout()` revoca el refresh en
`/api/auth/logout/` y borra la sesión aunque el backend no responda.

El flujo completo de tokens está en `docs/AUTENTICACION_JWT.md`.

### Registro de cuenta

La pantalla `/registro` envía el correo y la contraseña a
`POST /api/auth/register/` mediante `register()` (`src/api.js`). Si el alta
es correcta (`201`), la aplicación pide al usuario que revise su correo.
El enlace abre `/verify-email` para confirmar la dirección y continuar a
`/login`. Desde el inicio de sesión se puede pedir otro enlace de verificación.
Si el backend rechaza los datos (`400`), muestra el error en el campo
correspondiente (correo duplicado o contraseña no válida) y avisa en caso de
límite de peticiones (`429`).

### Recuperar la contraseña

La pantalla `/recuperar-contrasena` envía el correo a
`POST /api/auth/password-reset/`. La API devuelve la misma respuesta exista
o no la cuenta. El enlace del mensaje abre `/reset-password`, donde el usuario
escribe y confirma la nueva contraseña. La pantalla envía el código del enlace
y la nueva contraseña a `POST /api/auth/password-reset/confirm/`.

En desarrollo, `npm run dev` y `npm run preview` reenvían `/api` al backend en
`http://localhost:8000`, así que hay que tener `python manage.py runserver` en
marcha para iniciar sesión. En producción Caddy sirve frontend y API en el
mismo dominio.

## Configuración del escuadrón

`/escuadrones/configuracion` se abre desde «Configuración» en la barra
lateral, que como «Mi hábito» solo sale en web. Por ahora es un boceto con los
datos de `src/datosEjemplo.js`, hasta que el backend guarde estos ajustes.
Sigue el estilo de «Mi hábito»: tarjetas blancas en lista, con un chip de
color por fila, el texto a la izquierda y el control a la derecha.

Solo el administrador ve la configuración; el resto de miembros ve un aviso y
un enlace para volver al panel. Tiene dos pestañas:

- **General**: nombre, visibilidad (privado o público) y plazas. Se guardan
  juntos con «Guardar cambios» y se pueden descartar. Las plazas van de 2 a 10
  y nunca bajan de los miembros que ya hay.
- **Miembros**: el código de invitación (copiar o generar otro, y el anterior
  deja de servir), la lista de miembros con «Expulsar» y las plazas libres.
  Al final, «Eliminar escuadrón». Expulsar y eliminar piden pulsar dos veces.

## PWA

`vite-plugin-pwa` genera en el build el manifest (`manifest.webmanifest`) y el
service worker (`sw.js`), que guarda la aplicación en caché para que abra sin
conexión. Los iconos están en `public/icons/`.

El service worker solo existe en el build. Para probar la instalación o el
funcionamiento sin conexión:

```bash
npm run build
npm run preview   # http://localhost:4173
```

En Chrome, la pestaña Application de las herramientas de desarrollo muestra el
manifest y el estado del service worker. Para instalarla en un móvil hace falta
HTTPS, así que se prueba con la versión desplegada.

## Estructura

- `index.html`: punto de entrada de la aplicación.
- `src/main.js`: carga estilos y arranca la aplicación.
- `src/app.js`: crea el enrutador y vuelve a `/login` si caduca la sesión.
- `src/router.js`: enrutador con la History API.
- `src/routes.js`: rutas, pantallas y rutas que exigen sesión.
- `src/api.js`: inicio y cierre de sesión, renovación de tokens y `authFetch`.
- `src/session.js`: guarda los tokens en el navegador.
- `src/components/`: piezas reutilizables de diseño, formularios y navegación.
- `src/views/`: pantallas de la aplicación.
- `src/style.css`: importa Tailwind CSS.
- `public/`: ficheros estáticos que se copian tal cual al build, incluidos los
  iconos de la PWA.
- `vite.config.js`: configuración de Vite, Tailwind, la PWA y Vitest.
