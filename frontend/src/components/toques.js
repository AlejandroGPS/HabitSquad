import { card } from './card.js'
import { button, element } from './dom.js'
import { fotoAvatar } from './avatar.js'
import { icon } from './icons.js'
import { PROFILE_BUTTON } from './perfil.js'
import { rememberedSquad } from '../session.js'

export const MENSAJES_TOQUE = [
  { id: 'animo', titulo: '¡Tú puedes!', texto: 'Un pasito más para cumplir tu hábito. ¡Tú puedes!' },
  { id: 'equipo', titulo: 'Vamos, equipo', texto: 'Tu escuadrón está contigo. ¡Vamos a por el hábito de hoy!' },
  { id: 'prueba', titulo: 'Que no se te olvide', texto: '¿Ya has hecho tu hábito? Acuérdate de subir la prueba de hoy.' },
]

let nextId = 0

// El envío se inyecta cuando exista su contrato; la aplicación no simula entregas.
export function toquesPanel({ api, demo = false } = {}) {
  const prefix = `toques-${++nextId}`
  let miembros = []
  let destinatario = null
  let mensaje = MENSAJES_TOQUE[0]
  let borrador = mensaje.texto
  let enviando = false
  let carga = 0
  const enviados = new Set()

  const estado = element('p', 'touch-status', 'Cargando tus escuadrones…')
  estado.setAttribute('role', 'status')
  const error = element('p', 'touch-error empty:hidden')
  error.setAttribute('role', 'alert')
  const selector = element('select', 'touch-select')
  selector.id = `${prefix}-escuadron`
  selector.disabled = true
  const etiqueta = element('label', 'touch-label', 'Escuadrón')
  etiqueta.htmlFor = selector.id
  const lista = element('fieldset', 'touch-members')
  const opciones = element('fieldset', 'touch-messages')
  const editor = element('textarea', 'touch-editor')
  editor.id = `${prefix}-texto`
  editor.rows = 3
  editor.value = mensaje.texto
  editor.placeholder = 'Escribe unas palabras de ánimo…'
  const etiquetaEditor = element('label', 'touch-label', 'Tu mensaje')
  etiquetaEditor.htmlFor = editor.id
  const ayudaEditor = element('p', 'mt-2 text-sm font-semibold text-ink-muted', 'Puedes editar un mensaje predefinido o escribir el tuyo.')
  ayudaEditor.id = `${prefix}-ayuda-texto`
  editor.setAttribute('aria-describedby', ayudaEditor.id)
  const previewNombre = element('p', 'font-black', 'Para tu compañero')
  const previewTexto = element('p', 'mt-2 whitespace-pre-wrap font-semibold leading-relaxed', mensaje.texto)
  const previewDestino = element('p', 'mt-3 text-sm font-bold text-ink-muted', 'Elige a quién quieres animar.')
  const nota = element('p', 'mt-3 text-sm font-semibold text-ink-muted',
    demo ? 'Modo de ejemplo: los toques no se envían a nadie.'
      : api.sendTouch ? 'Le llegará el mensaje que ves en la vista previa.' : 'El envío de toques estará disponible próximamente.')
  const enviar = button(`${PROFILE_BUTTON} mt-5 w-full`, darToque, icon('bell'), 'Dar toque')
  enviar.disabled = true
  nota.id = `${prefix}-nota`
  enviar.setAttribute('aria-describedby', nota.id)

  const reintentar = button('touch-retry', () => cargarEscuadrones(), 'Reintentar')
  reintentar.hidden = true
  const compositor = card('touch-composer',
    element('div', 'flex items-center gap-3',
      element('span', 'touch-icon', icon('users')),
      element('div', '', element('h2', 'text-xl font-black', 'Anima a tu escuadrón'),
        element('p', 'mt-1 font-semibold text-ink-muted', 'A veces, un pequeño empujón es todo lo que hace falta.'))),
    element('div', 'mt-5', etiqueta, selector), estado, error, reintentar, lista, opciones,
    element('div', 'mt-5', etiquetaEditor, editor, ayudaEditor))
  const vistaPrevia = card('touch-preview',
    element('p', 'touch-eyebrow', icon('bell', 'h-4 w-4'), 'VISTA PREVIA'),
    element('h2', 'mt-3 text-xl font-black', 'Un toque de motivación'),
    element('div', 'touch-notification',
      element('span', 'touch-icon', icon('users')),
      element('div', 'min-w-0', element('p', 'text-sm font-extrabold text-accent', 'HabitSquad'), previewNombre, previewTexto)),
    previewDestino, enviar, nota,
    element('div', 'touch-tip', icon('leaf'),
      element('p', '', 'Acompaña, sin presionar. Cada persona lleva su ritmo.')))
  const root = element('div', 'touch-grid', compositor, vistaPrevia)
  root.dataset.toques = ''

  opciones.append(element('legend', 'touch-label', 'Elige el mensaje'))
  for (const opcion of [...MENSAJES_TOQUE, { id: 'personalizado', titulo: 'Mensaje personalizado', texto: 'Escribe el mensaje a tu manera.' }]) {
    const radio = element('input', 'touch-radio')
    radio.type = 'radio'
    radio.name = `${prefix}-mensaje`
    radio.value = opcion.id
    radio.checked = opcion === mensaje
    radio.addEventListener('change', () => {
      mensaje = opcion.id === 'personalizado' ? { id: opcion.id, texto: borrador } : opcion
      editor.value = mensaje.texto
      error.textContent = ''
      actualizar()
    })
    opciones.append(element('label', 'touch-option', radio,
      element('span', 'min-w-0', element('span', 'block font-black', opcion.titulo),
        element('span', 'mt-1 block text-sm font-semibold text-ink-muted', opcion.texto))))
  }

  editor.addEventListener('input', () => {
    borrador = editor.value
    mensaje = { id: 'personalizado', texto: borrador }
    opciones.querySelectorAll('input').forEach((radio) => { radio.checked = radio.value === mensaje.id })
    error.textContent = ''
    actualizar()
  })

  function clave(miembro) { return `${selector.value}:${miembro.usuario_id}` }

  function actualizar() {
    previewNombre.textContent = destinatario ? `Para ${destinatario.nickname || destinatario.nombre || 'tu compañero'}` : 'Para tu compañero'
    previewTexto.textContent = mensaje.texto.trim() || 'Tu mensaje aparecerá aquí.'
    previewDestino.textContent = destinatario
      ? `En ${selector.selectedOptions[0]?.textContent ?? 'tu escuadrón'}`
      : 'Elige a quién quieres animar.'
    enviar.disabled = enviando || !mensaje.texto.trim() || !destinatario || !api.sendTouch || enviados.has(clave(destinatario))
    enviar.replaceChildren(icon(enviando ? 'clock' : 'bell'), enviando ? 'Enviando…' : 'Dar toque')
  }

  function pintarMiembros() {
    lista.replaceChildren(element('legend', 'touch-label', '¿A quién le damos un toque?'))
    const otros = miembros.filter((miembro) => !miembro.es_usuario)
    if (!otros.length) {
      lista.append(element('p', 'touch-empty', 'Cuando haya más personas en tu escuadrón, podrás animarlas desde aquí.'))
    }
    for (const miembro of otros) {
      const enviado = enviados.has(clave(miembro))
      const noDisponible = Boolean(miembro.prueba_hoy) || enviado
      const nombre = miembro.nickname || miembro.nombre || `Miembro ${miembro.usuario_id}`
      const radio = element('input', 'touch-radio')
      radio.type = 'radio'
      radio.name = `${prefix}-miembro`
      radio.value = String(miembro.usuario_id)
      radio.disabled = noDisponible || enviando
      radio.checked = destinatario?.usuario_id === miembro.usuario_id
      radio.addEventListener('change', () => {
        destinatario = miembro
        error.textContent = ''
        estado.textContent = ''
        actualizar()
      })
      const avatar = fotoAvatar({ nombre, fotoUrl: miembro.foto_url, className: 'h-10 w-10 rounded-xl bg-accent-soft text-accent font-black' })
      avatar.setAttribute('aria-hidden', 'true')
      lista.append(element('label', 'touch-member', radio,
        avatar,
        element('span', 'min-w-0', element('span', 'block break-words font-extrabold', nombre),
          element('span', `block text-sm font-bold ${noDisponible ? 'text-positive' : 'text-ink-muted'}`,
            enviado ? (demo ? 'Toque de ejemplo listo' : 'Toque enviado') : miembro.prueba_hoy ? 'Ya ha subido su prueba' : 'Sin prueba todavía'))))
    }
    if (otros.length && otros.every((miembro) => miembro.prueba_hoy)) {
      lista.append(element('p', 'touch-empty', '¡Todo el equipo ha subido su prueba! Hoy no hace falta ningún toque.'))
    }
  }

  async function cargarMiembros() {
    const turno = ++carga
    destinatario = null
    miembros = []
    lista.replaceChildren()
    error.textContent = ''
    reintentar.hidden = true
    estado.textContent = 'Cargando compañeros…'
    actualizar()
    try {
      const grupo = await api.getSquad(selector.value)
      if (turno !== carga) return
      miembros = grupo.miembros
      estado.textContent = ''
      pintarMiembros()
    } catch {
      if (turno !== carga) return
      estado.textContent = ''
      error.textContent = 'No se han podido cargar los compañeros. Vuelve a intentarlo.'
      reintentar.hidden = false
    }
  }

  async function cargarEscuadrones() {
    selector.disabled = true
    reintentar.hidden = true
    error.textContent = ''
    estado.textContent = 'Cargando tus escuadrones…'
    try {
      const grupos = await api.listSquads()
      const anterior = selector.value || rememberedSquad()
      selector.replaceChildren(...grupos.map((grupo) => {
        const opcion = element('option', '', grupo.nombre)
        opcion.value = String(grupo.id)
        return opcion
      }))
      if (!grupos.length) {
        estado.textContent = 'Únete a un escuadrón para empezar a dar toques.'
        lista.replaceChildren()
        destinatario = null
        actualizar()
        return
      }
      if (grupos.some((grupo) => String(grupo.id) === anterior)) selector.value = anterior
      selector.disabled = false
      await cargarMiembros()
    } catch {
      estado.textContent = ''
      error.textContent = 'No se han podido cargar tus escuadrones. Vuelve a intentarlo.'
      reintentar.hidden = false
    }
  }

  async function darToque() {
    if (enviar.disabled || enviando || !destinatario) return
    const receptor = destinatario
    const grupo = selector.value
    const elegido = mensaje.id
    const texto = mensaje.texto.trim()
    enviando = true
    error.textContent = ''
    estado.textContent = ''
    selector.disabled = true
    lista.querySelectorAll('input').forEach((radio) => { radio.disabled = true })
    opciones.disabled = true
    editor.disabled = true
    actualizar()
    try {
      await api.sendTouch({ squadId: grupo, userId: receptor.usuario_id, messageId: elegido, text: texto })
      enviados.add(`${grupo}:${receptor.usuario_id}`)
      estado.textContent = demo ? `Toque de ejemplo preparado para ${receptor.nickname || receptor.nombre}. No se ha enviado.`
        : `¡Toque enviado a ${receptor.nickname || receptor.nombre}!`
      destinatario = null
    } catch {
      error.textContent = 'No se ha podido enviar el toque. Conservamos tu selección para que puedas reintentarlo.'
    } finally {
      enviando = false
      selector.disabled = false
      opciones.disabled = false
      editor.disabled = false
      pintarMiembros()
      actualizar()
    }
  }

  selector.addEventListener('change', cargarMiembros)
  void cargarEscuadrones()
  return root
}
