# Perfil de usuario: frontend

Implementación en `feature/perfil-usuario`, con el backend de
`origin/main` (`f488700`) integrado. Utiliza el contrato de
[PERFIL_USUARIO.md](PERFIL_USUARIO.md) y las pantallas Perfil y Editar perfil
de la propuesta de diseño del sprint 3.

## Acceso y rutas

- El menú de cuenta, tanto en el selector como en el panel, incluye **Mi perfil**.
- `/perfil`: identidad, ajustes de cuenta y hábitos de los escuadrones.
- `/perfil/editar`: foto, nickname, correo, contraseña y hora del aviso.
- `/perfil/confirmar-email?uid=...&token=...`: confirmación pública del correo
  nuevo, compatible con el enlace que genera el backend. También se conserva
  `/perfil/email/confirmar` como alias. `/verify-email` verifica el registro inicial.
- Perfil y edición requieren sesión; el router conserva el destino al pedir login.

Con `npm run dev`, `/perfil-preview.html` permite revisar las pantallas con
datos de ejemplo sin backend. Los cambios de esa vista son temporales y se
reinician al recargar. El selector de hora abre un diálogo con horas y minutos;
Aplicar hora actualiza el formulario y Guardar hora persiste el cambio.

## Peticiones y comportamiento

El cliente reutiliza `authFetch`: JWT, renovación compartida y manejo de sesión
caducada. No guarda el perfil ni las URLs temporales de las fotos en localStorage.

- `GET /api/perfil/`: carga la identidad y los valores guardados.
- `PATCH /api/perfil/`: envía solo `nickname` o `hora_aviso`, según el formulario.
- `POST /api/perfil/foto/`: multipart con `foto`, sin fijar Content-Type; cámara
  o galería, vista previa, guardado explícito y descarte. Acepta JPEG, PNG o WebP
  de hasta 5 MiB; la API debe validar también el contenido del archivo.
- `POST /api/perfil/email/`: solicita el cambio o reenvía el enlace al correo
  pendiente; mantiene el correo de acceso actual hasta confirmar.
- `POST /api/perfil/email/confirm/`: pública, envía `uid` y `token` tras pulsar
  Confirmar correo nuevo, sin consumir el enlace solo por abrir la página.
- `POST /api/perfil/password/`: contraseña actual, nueva y confirmación; nunca
  recorta espacios, impide envíos duplicados y limpia los campos tras el éxito.
- Los errores 400 se muestran junto a sus campos. Los errores de conexión
  conservan los valores editados; se puede reintentar la carga.

## Estado de la integración

El backend de main ya implementa los seis endpoints; no son stubs 501.
Requiere aplicar `python manage.py migrate` para incorporar los campos de perfil
de la migración `usuarios.0004_customuser_perfil_fields`.

Comprobado el 22 de noviembre de 2026 mediante HTTP contra Django y las funciones
reales de `frontend/src/api.js`, con una base temporal, cuenta ficticia y correo
en memoria: login, consulta, guardado persistente de nickname y hora, validación,
renovación JWT, solicitud y confirmación de correo usando el enlace generado,
cambio de contraseña, acceso con la contraseña nueva y cierre de sesión.

La foto válida necesita credenciales de Cloudinary. Sin ellas no se ha probado
la subida al servicio externo; sí la petición multipart y el rechazo de formato
no permitido por HTTP. La suite del backend cubre el éxito con Cloudinary simulado.

El contrato no proporciona:

- Estadísticas personales, logros o fecha de alta.
  Las tarjetas de estadísticas, actividad y logros se han retirado del diseño;
  no se deducen totales personales de las rachas de grupo.
  La vista previa proporciona una racha de ejemplo de 12 días para mostrar la
  píldora bajo el correo. La sección de actividad se ha retirado del diseño.
- Consulta de disponibilidad de nickname. Se comprueba al guardar; no se indica
  que un nombre está libre sin respuesta del servidor.
- Cancelación del cambio de correo. No se ofrece un botón que simule cancelarlo.
- Estado de verificación de correo. La ficha no asegura que esté verificado.
- Envío de notificaciones push. Esta pantalla solo configura la hora del aviso.

Los hábitos utilizan `GET /api/escuadrones/` y el detalle de cada escuadrón para
mostrar el hábito propio y el estado de la prueba de hoy. Un fallo en esos datos
no impide mostrar el perfil.

## Validación

Desde `frontend/`:

```sh
npm test
npm run build
```

Los tests de `src/perfil-api.test.js` verifican métodos, cuerpos, multipart,
autenticación, renovación JWT y confirmación pública. Los tests de
`src/views/perfil.test.js` cubren carga, 501 y reintento, hábitos, validación,
guardado explícito, correo pendiente, contraseña y foto.

Para la prueba manual:

1. Iniciar backend y frontend según sus README; entrar y abrir Mi perfil.
2. Guardar nombre, foto y hora por separado; recargar y comprobar persistencia.
3. Solicitar correo nuevo; comprobar que sigue visible el correo anterior y
   confirmar el enlace en una ventana sin sesión.
4. Cambiar contraseña; cerrar sesión y comprobar el acceso con la nueva.
5. Probar nickname ocupado, contraseña actual incorrecta y un corte de conexión.
6. Comprobar móvil y escritorio; en móvil Cuenta aparece tras las demás secciones.

La revisión visual se realizó a 1280 px y 390 px con respuestas simuladas,
usando los componentes reales. Esos datos no se incluyen en la aplicación.
