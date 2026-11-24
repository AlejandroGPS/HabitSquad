import { ApiError, getProfile } from '../api.js'
import { crearAvisos } from '../avisos.js'
import { accountMenu } from '../components/accountMenu.js'
import { appLayout } from '../components/appLayout.js'
import { card, cardLabel, pillButtonClass } from '../components/card.js'
import { button, element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import { PROFILE_BUTTON } from '../components/perfil.js'

const AHORA_NO = 'habitsquad.avisos'

const ESTADOS = {
  comprobando: {
    titulo: 'Que no se te pase la prueba',
    texto: 'Comprobando los avisos de este navegador…',
  },
  desactivado: {
    titulo: 'Que no se te pase la prueba',
    texto: 'Si a tu hora aún no has subido la foto, te avisamos aunque tengas HabitSquad cerrado. Si ya la has subido, no te molestamos.',
  },
  pospuesto: {
    titulo: 'Sin avisos por ahora',
    texto: 'No te avisaremos fuera de la app. Puedes activarlos cuando quieras.',
  },
  activado: {
    titulo: 'Avisos activados',
    texto: 'Si a tu hora todavía no has subido la prueba, te avisaremos en este navegador aunque tengas HabitSquad cerrado.',
  },
  bloqueado: {
    titulo: 'Has bloqueado los avisos',
    texto: 'Para recibirlos, permite las notificaciones de HabitSquad en los ajustes del navegador y vuelve a comprobarlo.',
  },
  'no-soportado': {
    titulo: 'Este navegador no admite avisos',
    texto: 'En iPhone y iPad, añade HabitSquad a la pantalla de inicio desde Safari y ábrela desde allí. En el ordenador o en Android, usa Chrome, Edge o Firefox.',
  },
  'no-disponible': {
    titulo: 'Los avisos no están disponibles',
    texto: 'Esta versión de HabitSquad no puede recibir avisos. Vuelve a abrirla dentro de un rato.',
  },
}

const CONFIRMACIONES = {
  activar: { activado: 'Avisos activados en este navegador.' },
  desactivar: { desactivado: 'Avisos desactivados.' },
}

const EN_CURSO = { activar: 'Activando…', desactivar: 'Desactivando…', comprobar: 'Comprobando…' }

const SI_FALLA = { activar: 'desactivado', desactivar: 'activado', comprobar: 'bloqueado' }

function mensajeError(error, accion) {
  if (error instanceof ApiError && error.status === 503) {
    return 'Los avisos no están disponibles ahora mismo. Inténtalo más tarde.'
  }
  return `No se han podido ${accion} los avisos. Comprueba la conexión e inténtalo de nuevo.`
}

// Muestra de cómo llega el aviso: el mismo texto que envía el servidor.
function muestraAviso() {
  const logo = element('img', 'h-9 w-9 shrink-0 rounded-[0.625rem]')
  logo.src = '/icons/icon-192.png'
  logo.alt = ''
  return element(
    'figure',
    'rounded-[1.25rem] bg-[#f3f1f8] p-3 lg:w-72 lg:shrink-0',
    element('figcaption', 'mb-2 text-[0.8125rem] font-extrabold text-ink-muted', 'Así te llegará'),
    element(
      'div',
      'flex gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_20px_-12px_rgb(60_30_140/0.3)]',
      logo,
      element(
        'div',
        'min-w-0 flex-1',
        element('p', 'flex justify-between gap-2 text-[0.8125rem] font-bold text-ink-muted', 'HabitSquad', element('span', '', 'ahora')),
        element('p', 'font-extrabold', 'Todavía no has subido la prueba de hoy.'),
      ),
    ),
  )
}

export function alertasScreen({
  onLogout,
  api = { getProfile },
  avisos = crearAvisos(),
  almacen = window.localStorage,
} = {}) {
  const perfil = api.getProfile()

  const titulo = element('h2', 'text-[1.25rem] leading-tight font-black focus:outline-none lg:text-[1.5rem]')
  titulo.tabIndex = -1
  const texto = element('p', 'mt-1 font-semibold text-ink-muted')
  const acciones = element('div', 'mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 empty:hidden')
  const confirmacion = element('p', 'mt-3 text-[0.9375rem] font-bold text-[#248a3d] empty:hidden')
  confirmacion.setAttribute('role', 'status')
  const error = element('p', 'mt-3 text-[0.9375rem] font-bold text-[#d70015] empty:hidden')
  error.setAttribute('role', 'alert')
  const permiso = card(
    'lg:col-span-3 flex flex-col gap-5 lg:flex-row lg:items-center',
    element(
      'div',
      'min-w-0 flex-1',
      element('span', 'mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#fff1e6] text-[#c93400]', icon('bell', 'h-5 w-5 shrink-0')),
      titulo,
      texto,
      acciones,
      confirmacion,
      error,
    ),
    muestraAviso(),
  )

  const hora = element('p', 'mt-1 text-[2.5rem] leading-none font-black tabular-nums', '—')
  const notaHora = element('p', 'mt-2 mb-4 text-[0.8125rem] font-bold text-ink-muted', 'Cada uno elige su hora en el perfil.')
  const cambiarHora = element('a', `${pillButtonClass} mt-auto self-start`, icon('pencil', 'h-4 w-4 shrink-0'), 'Cambiar hora')
  cambiarHora.href = '/perfil/editar#recordatorio'
  cambiarHora.dataset.link = ''
  const tuAviso = card('flex flex-col', cardLabel('Tu aviso', { icon: 'clock' }), hora, notaHora, cambiarHora)

  const body = element('div', 'mt-4 grid gap-3 px-4 lg:mt-6 lg:grid-cols-4 lg:gap-4 lg:px-0', permiso, tuAviso)
  const cuenta = accountMenu({ loadProfile: () => perfil, onLogout })
  const root = appLayout({ active: 'alertas', kicker: 'Tu cuenta', title: 'Alertas', body, trailing: cuenta })

  perfil.then(
    (datos) => { hora.textContent = datos.hora_aviso },
    () => { notaHora.textContent = 'No se ha podido cargar tu hora. Vuelve a entrar en un rato.' },
  )

  let ocupado = false

  function pintar(estado, { anunciar = false } = {}) {
    const datos = ESTADOS[estado]
    titulo.textContent = datos.titulo
    texto.textContent = datos.texto
    const accion = (nombre, operacion) => (evento) => ejecutar(nombre, operacion, evento.currentTarget)
    const activar = button(PROFILE_BUTTON, accion('activar', avisos.activar), icon('bell', 'h-5 w-5 shrink-0'), 'Activar avisos')
    const porEstado = {
      desactivado: [activar, button('min-h-11 font-extrabold text-accent', posponer, 'Ahora no')],
      pospuesto: [activar],
      activado: [button(pillButtonClass, accion('desactivar', avisos.desactivar), 'Desactivar avisos')],
      bloqueado: [button(pillButtonClass, accion('comprobar', avisos.consultar), 'Volver a comprobar')],
    }
    acciones.replaceChildren(...(porEstado[estado] ?? []))
    if (anunciar) titulo.focus()
  }

  function mostrar(estado, opciones) {
    if (estado === 'activado') almacen.removeItem(AHORA_NO)
    pintar(estado === 'desactivado' && almacen.getItem(AHORA_NO) ? 'pospuesto' : estado, opciones)
  }

  function posponer() {
    almacen.setItem(AHORA_NO, 'ahora-no')
    error.textContent = ''
    confirmacion.textContent = ''
    pintar('pospuesto', { anunciar: true })
  }

  async function ejecutar(accion, operacion, pulsado) {
    if (ocupado) return
    ocupado = true
    error.textContent = ''
    confirmacion.textContent = ''
    for (const control of acciones.querySelectorAll('button')) control.disabled = true
    pulsado.lastChild.textContent = EN_CURSO[accion]
    try {
      const estado = await operacion()
      confirmacion.textContent = CONFIRMACIONES[accion]?.[estado] ?? ''
      mostrar(estado, { anunciar: true })
    } catch (causa) {
      error.textContent = mensajeError(causa, accion)
      mostrar(SI_FALLA[accion])
    } finally {
      ocupado = false
    }
  }

  pintar('comprobando')
  avisos.consultar().then(mostrar, () => mostrar('desactivado'))
  return root
}
