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

`/registro` envía el correo, el nickname, la contraseña y su confirmación
(`email`, `nickname`, `password`, `password_confirm`) a `POST /api/auth/register/`.
El nickname se recorta y ambas contraseñas deben coincidir exactamente. Los
errores del backend se muestran junto a cada campo. Tras crear la cuenta se
pide verificar el correo, según el contrato de `docs/REGISTRO.md`. Tras
verificar el correo, `/login` pide `POST /api/auth/token/` y guarda la sesión
en `localStorage` con la clave `habitsquad.session`.

A continuación la aplicación abre `/escuadrones`, «Mis escuadrones». La presentación
está en `/`. En desarrollo, Vite reenvía `/api` a
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

## Perfil de usuario

El menú de cuenta enlaza a `/perfil` y `/perfil/editar`. La integración, las
pruebas y las dependencias pendientes del backend se describen en
[PERFIL_USUARIO_FRONTEND.md](../docs/PERFIL_USUARIO_FRONTEND.md).

## Buscador de escuadrones (mock)

`/escuadrones/buscar` se abre desde «Mis escuadrones» y requiere sesión, como
el resto de pantallas de escuadrones. Permite buscar por nombre sin distinguir
mayúsculas ni tildes y ordenar los resultados. Los escuadrones completos no
permiten unirse.

El listado y la ficha muestran la racha, la ocupación respecto a la capacidad
y las plazas libres, sin identificar a los miembros ni mostrar una temática.
La ficha permite confirmar la unión y elegir un hábito de ejemplo.
Se puede cerrar con Escape, el fondo o «Ahora no».
La unión y el hábito solo se guardan en memoria: sobreviven a la navegación
y se reinician al recargar. No modifican los escuadrones reales ni sus paneles.
El acceso con código y la creación enlazan a sus pantallas existentes.

Los 12 ejemplos y el adaptador temporal están en
`src/mocks/buscadorEscuadrones.js`. Para conectar la API, sustituir el objeto
`api` de `buscarEscuadronesScreen({ api })`, que expone métodos asíncronos
`list()`, `join(id)` y `saveHabit(id, text)`. Cada uno devuelve escuadrones con
`id`, `nombre`, `categoria`, `habito`, `racha`, `color`, `capacidad`, `publico`,
`unido`, `habitoPropio` y `miembros: [{ nickname, habito }]`. La vista no usa
`fetch` ni los endpoints reales para estas operaciones.

## Configuración del escuadrón (mock)

`/escuadrones/configuracion` requiere sesión. «Configuración» forma parte del
menú lateral del panel, junto a Escuadrón, Racha, Alertas y Mi hábito. En móvil
se abre con el botón de ajustes de la cabecera del panel. Ambas pantallas
comparten el menú y conservan el ID seleccionado al volver al panel o abrir
Mi hábito. La configuración abre siempre el escuadrón ficticio Los Inquebrantables,
independiente del escuadrón real desde el que se navega. El parámetro `origen`
conserva el destino para volver a ese panel, sin cargar ni modificar sus datos.

Para probar sin cuenta ni backend, ejecutar `npm run dev` y abrir
`/previews/configuracion.html`. Añadir `?rol=miembro` permite revisar el aviso
para quien no administra. Estas vistas previas solo se sirven en desarrollo.

- **General:** nombre (1–100 caracteres), visibilidad y plazas se guardan juntos.
  El resumen muestra los valores guardados. El borrador se conserva al cambiar
  de pestaña; «Descartar» restaura los valores anteriores. Las plazas van de
  2 a 10 y nunca bajan del número de miembros.
- **Miembros:** nickname, foto o iniciales, papel y plazas libres. Expulsar y
  eliminar requieren dos pulsaciones y permiten cancelar. El administrador
  no puede expulsarse. La eliminación solo afecta al escuadrón ficticio;
  recargar restaura los ejemplos.
- **Invitaciones:** código seleccionable, copia con alternativa manual,
  generación de otro código con confirmación y número de plazas libres.

El estado mock se conserva en memoria durante la navegación y se reinicia al
recargar. No comparte datos con el buscador ni modifica el backend. Los errores
se muestran sin perder el borrador; durante las operaciones se bloquean los
controles para evitar envíos duplicados. Las pestañas admiten flechas, Inicio
y Fin con selección y foco accesibles.

La vista recibe `configuracionEscuadronScreen({ api, id, panelHref, onLogout })`.
El adaptador asíncrono está en `src/mocks/configuracionEscuadron.js` y expone
`get(id)`, `update(id, { nombre, publico, capacidad })`,
`removeMember(id, memberId)`, `regenerateInvitation(id)` y `delete(id)`.
Todos salvo `delete` devuelven el escuadrón completo:
`{ id, nombre, publico, capacidad, codigo, esAdministrador, miembros }`;
cada miembro tiene `{ id, nickname, esAdministrador, esUsuario, fotoUrl }`.

Al conectar la API habrá que inyectar el adaptador real y el ID seleccionado,
retirar la indicación de demo y aplicar los permisos y límites también en el
servidor. La creación de escuadrones mantiene su contrato actual hasta esa
integración. La gestión de expulsados en el selector de otras cuentas queda
pendiente del backend; esta pantalla solo simula el resultado local.
