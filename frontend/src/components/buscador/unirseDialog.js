import { button, element } from '../dom.js'
import { icon } from '../icons.js'
import { squadBadge } from './escuadronResultado.js'

// El diálogo nativo mantiene el foco dentro de la hoja y hace inerte el fondo.
export function unirseDialog({ api, onUpdate, onClose }) {
  const dialog = element('dialog', 'squad-dialog')
  dialog.setAttribute('aria-labelledby', 'join-squad-title')
  let squad
  let pending = false
  let trigger
  let version = 0

  function close() { if (!pending) dialog.close() }
  dialog.addEventListener('cancel', (event) => { if (pending) event.preventDefault() })
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close() })
  dialog.addEventListener('close', () => {
    version++
    onClose?.(squad.id)
    if (trigger?.isConnected && !trigger.disabled) trigger.focus()
  })

  function header(kicker) {
    const heading = element('h2', 'text-xl leading-tight font-black break-words', squad.nombre)
    heading.id = 'join-squad-title'
    const dismiss = button('squad-dismiss', close, icon('close'))
    dismiss.setAttribute('aria-label', 'Cerrar ficha del escuadrón')
    return element('div', 'flex items-center gap-3', squadBadge(squad),
      element('div', 'min-w-0 flex-1', element('p', 'text-sm font-bold text-ink-muted', kicker), heading), dismiss)
  }
  function cancel(label = 'Ahora no') { return button('squad-cancel', close, label) }

  async function perform(action, control, next) {
    if (pending) return
    pending = true
    const current = version
    const original = control.textContent
    control.textContent = 'Guardando…'
    dialog.setAttribute('aria-busy', 'true')
    const controls = [...dialog.querySelectorAll('button, input')]
    controls.forEach((node) => { node.disabled = true })
    const error = dialog.querySelector('[role="alert"]')
    error.textContent = ''
    try {
      const updated = await action()
      if (current !== version || !dialog.isConnected) return
      squad = updated
      onUpdate(updated)
      next()
    } catch (cause) {
      if (current === version) error.textContent = cause instanceof Error ? cause.message : 'No se ha podido guardar. Vuelve a intentarlo.'
    } finally {
      pending = false
      dialog.setAttribute('aria-busy', 'false')
      controls.forEach((node) => { node.disabled = false })
      control.textContent = original
    }
  }
  function errorNode() { const node = element('p', 'squad-error'); node.setAttribute('role', 'alert'); return node }

  function details() {
    const free = Math.max(0, squad.capacidad - squad.miembros.length)
    const stats = element('dl', 'squad-stats')
    for (const [value, label, className] of [[squad.racha, 'días de racha', 'squad-streak'],
      [`${squad.miembros.length}/${squad.capacidad}`, 'miembros', ''], [free, 'plazas libres', 'squad-available']]) {
      stats.append(element('div', '', element('dt', 'text-sm font-semibold text-ink-muted', label), element('dd', `-order-1 text-2xl font-black ${className}`, String(value))))
    }
    const confirm = button('squad-action w-full', () => perform(() => api.join(squad.id), confirm, chooseHabit), icon('userPlus'), `Unirme a ${squad.nombre}`)
    dialog.replaceChildren(element('div', 'squad-dialog-content', header('Unirte a'), stats,
      element('p', 'squad-notice', icon('bell'), 'Después eliges tu hábito. Si mañana no subes la prueba, la racha del escuadrón vuelve a cero.'),
      errorNode(), confirm, cancel()))
  }

  function chooseHabit() {
    const input = element('input', 'squad-habit-input')
    input.id = 'mock-habit'
    input.name = 'habito'
    input.required = true
    input.maxLength = 60
    input.placeholder = 'Ej. Leer 20 minutos'
    const label = element('label', 'block mt-5 font-extrabold', '¿Qué harás hoy?')
    label.htmlFor = input.id
    const form = element('form', 'mt-2', label, input)
    const save = button('squad-action mt-5 w-full', () => {}, 'Guardar mi hábito')
    save.type = 'submit'
    form.append(errorNode(), save)
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      if (!input.value.trim()) { input.setCustomValidity('Escribe tu hábito.'); input.reportValidity(); return }
      void perform(() => api.saveHabit(squad.id, input.value), save, success)
    })
    input.addEventListener('input', () => input.setCustomValidity(''))
    dialog.replaceChildren(element('div', 'squad-dialog-content', header('¡Ya estás dentro!'),
      element('p', 'mt-4 font-semibold text-ink-muted', 'Un hábito pequeño, una racha compartida. Elige el tuyo para empezar.'), form,
      element('p', 'mt-3 text-sm font-semibold text-ink-muted', 'Esta unión es de ejemplo y se reinicia al recargar.'), cancel('Elegir hábito más tarde')))
    input.focus()
  }

  function success() {
    const heading = header('¡Todo listo!')
    const status = element('p', 'squad-notice', icon('check'), `Tu hábito: ${squad.habitoPropio}`)
    status.setAttribute('role', 'status')
    const done = button('squad-action mt-5 w-full', close, 'Volver al buscador')
    dialog.replaceChildren(element('div', 'squad-dialog-content', heading, status,
      element('p', 'font-semibold text-ink-muted', 'Ya formas parte de este escuadrón de ejemplo. ¡A sumar días juntos!'), done))
    done.focus()
  }

  return {
    node: dialog,
    open(value, opener) {
      if (pending || (!value.unido && value.miembros.length >= value.capacidad)) return
      squad = value
      trigger = opener
      version++
      if (squad.unido) chooseHabit()
      else details()
      dialog.showModal()
      if (squad.unido) dialog.querySelector('input')?.focus()
    },
  }
}
