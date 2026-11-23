import { button, element } from './dom.js'
import { icon } from './icons.js'
import { PROFILE_BUTTON, PROFILE_SOFT_BUTTON } from './perfil.js'

let nextId = 0

export function selectorHora(input) {
  const id = `selector-hora-${++nextId}`
  const value = element('span', 'tabular-nums')
  const trigger = button('inline-flex h-11 min-w-28 items-center justify-between gap-3 rounded-xl border border-hairline bg-white px-3 text-lg font-black shadow-sm hover:border-accent-line focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60', open,
    value, icon('forward', 'h-4 w-4 rotate-90 text-ink-muted'))
  trigger.id = `${id}-trigger`
  trigger.setAttribute('aria-label', 'Elegir hora del aviso')
  trigger.setAttribute('aria-haspopup', 'dialog')
  trigger.setAttribute('aria-expanded', 'false')
  trigger.setAttribute('aria-controls', id)
  const dialog = element('dialog', 'm-auto w-[calc(100%_-_2rem)] max-w-sm rounded-[1.75rem] border-2 border-white bg-white p-6 font-rounded text-ink shadow-[0_24px_80px_rgb(60_30_140/0.3)] backdrop:bg-[#24134f]/35 backdrop:backdrop-blur-sm')
  dialog.id = id
  dialog.setAttribute('aria-labelledby', `${id}-title`)
  dialog.setAttribute('aria-describedby', `${id}-description`)
  const title = element('h2', 'text-xl font-black', 'Elige tu hora')
  title.id = `${id}-title`
  const description = element('p', 'mt-1 text-sm font-semibold text-ink-muted', 'Ajusta las horas y los minutos del aviso.')
  description.id = `${id}-description`

  function column(label, maximum) {
    const field = element('input', 'h-20 w-full rounded-2xl border-2 border-transparent bg-accent-soft text-center text-4xl font-black tabular-nums text-accent outline-none focus:border-accent-line focus:ring-4 focus:ring-accent/15 [&::-webkit-inner-spin-button]:appearance-none')
    field.type = 'number'
    field.min = '0'
    field.max = String(maximum)
    field.step = '1'
    field.required = true
    field.inputMode = 'numeric'
    field.setAttribute('aria-label', label)
    field.style.MozAppearance = 'textfield'
    const step = (amount) => { field.value = String(((Number(field.value) || 0) + amount + maximum + 1) % (maximum + 1)).padStart(2, '0') }
    const up = button('grid min-h-11 w-full place-items-center rounded-xl text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent', () => step(1), icon('forward', 'h-5 w-5 -rotate-90'))
    up.setAttribute('aria-label', `Aumentar ${label.toLowerCase()}`)
    const down = button(up.className, () => step(-1), icon('forward', 'h-5 w-5 rotate-90'))
    down.setAttribute('aria-label', `Reducir ${label.toLowerCase()}`)
    return { field, root: element('div', 'min-w-0 flex-1 text-center', element('p', 'mb-1 text-sm font-extrabold text-ink-muted', label), up, field, down) }
  }
  const hours = column('Horas', 23)
  const minutes = column('Minutos', 59)
  function close() { dialog.close() }
  function apply() {
    if (!hours.field.reportValidity() || !minutes.field.reportValidity()) return
    input.value = `${String(Number(hours.field.value)).padStart(2, '0')}:${String(Number(minutes.field.value)).padStart(2, '0')}`
    input.dispatchEvent(new Event('input', { bubbles: true }))
    close()
  }
  const closeButton = button('grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f3f1f8] text-ink-muted hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent', close, icon('close'))
  closeButton.setAttribute('aria-label', 'Cerrar selector de hora')
  dialog.append(element('div', 'flex items-start justify-between gap-3', element('div', '', title, description), closeButton),
    element('div', 'my-5 flex items-center gap-3', hours.root, element('span', 'pt-6 text-3xl font-black text-accent', ':'), minutes.root),
    element('p', 'mb-5 rounded-xl bg-[#f3f1f8] p-3 text-sm font-semibold text-ink-muted', 'Después, pulsa Guardar hora para guardar el cambio.'),
    element('div', 'flex gap-3', button(`${PROFILE_SOFT_BUTTON} flex-1 px-3`, close, 'Cancelar'), button(`${PROFILE_BUTTON} flex-1 px-3`, apply, 'Aplicar hora')))
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); apply() }
  })
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
  })
  dialog.addEventListener('close', () => trigger.setAttribute('aria-expanded', 'false'))
  function open() {
    const [hour, minute] = (input.value || '20:00').split(':')
    hours.field.value = hour
    minutes.field.value = minute
    dialog.showModal()
    trigger.setAttribute('aria-expanded', 'true')
    hours.field.focus()
    hours.field.select()
  }
  function sync() { value.textContent = input.value || '—' }
  input.addEventListener('input', sync)
  sync()
  return { trigger, dialog, sync }
}
