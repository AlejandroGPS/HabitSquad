import { ApiError, getDailyHabit, getSquad, saveDailyHabit } from '../api.js'
import { appLayout } from '../components/appLayout.js'
import { element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import mascotUrl from '../assets/mascota.webp'

const HABIT_MAX_LENGTH = 60
const PREDEFINED = { gimnasio: 'Ir al gimnasio', leer: 'Leer', estudiar: 'Estudiar' }
const SUGGESTIONS = [
  ['Leer 20 minutos', 'book', 'bg-[#efeaff] text-[#5b32ea]'],
  ['Ir al gimnasio', 'dumbbell', 'bg-[#fff1e6] text-[#c93400]'],
  ['Meditar 10 minutos', 'leaf', 'bg-[#e8f5ec] text-[#248a3d]'],
  ['Caminar 8.000 pasos', 'route', 'bg-[#e6f3ff] text-[#0878c9]'],
  ['Sin móvil en la cama', 'moon', 'bg-[#efeaff] text-[#5b32ea]'],
  ['Estudiar 1 hora', 'pencil', 'bg-[#fff1e6] text-[#c93400]'],
]

export function habitPayload(text) {
  const value = text.trim()
  const option = Object.keys(PREDEFINED).find((key) => PREDEFINED[key] === value)
  return { opcion: option ?? 'otro', texto_personalizado: option ? '' : value }
}

function errorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      const errors = error.data ?? {}
      const value = errors.texto_personalizado ?? errors.opcion ?? errors.detail
      if (Array.isArray(value)) return value.join(' ')
      if (typeof value === 'string') return value
      return 'Revisa la opción y el texto del hábito.'
    }
    if (error.status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
    if (error.status === 403) return 'No tienes permiso para modificar el hábito de este escuadrón.'
    if (error.status === 404) return 'El escuadrón ya no existe. Vuelve a cargar tus escuadrones.'
  }
  return 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.'
}

export function habitoDiarioScreen({ navigate, api = { getSquad, getDailyHabit, saveDailyHabit } } = {}) {
  const squadId = new URLSearchParams(window.location.search).get('escuadron')
  const validSquadId = Boolean(squadId && /^[1-9]\d*$/.test(squadId))
  const squadName = element('span', '', 'Mi hábito diario')
  const body = element('div', 'habit-detail mt-4 px-4 lg:mt-6 lg:px-0')
  const form = element('form', 'space-y-4')
  form.noValidate = true
  const intro = element('section', 'flex min-w-0 items-center gap-4 rounded-[1.75rem] bg-gradient-to-br from-[#6a45f0] to-[#4c28cc] p-5 text-white shadow-sm')
  const mascot = element('img', 'h-24 w-20 shrink-0 object-contain')
  mascot.src = mascotUrl
  mascot.alt = ''
  intro.append(mascot, element('div', '', element('h2', 'text-base font-black', 'Uno solo, y que sea tuyo.'), element('p', 'mt-1 text-sm font-bold', 'Si un día no lo cumples, la racha del escuadrón vuelve a cero.')))
  const customLabel = element('label', 'block text-sm font-extrabold text-[#6e6e73]', '¿Qué harás cada día?')
  const custom = element('input', 'mt-2 h-12 w-full min-w-0 rounded-xl border-2 border-transparent bg-[#f2f2f7] px-3 font-semibold text-[#1d1d1f] outline-none focus:border-accent aria-invalid:border-red-600 disabled:opacity-60')
  custom.id = 'habito-texto'
  custom.name = 'habito'
  custom.maxLength = HABIT_MAX_LENGTH
  custom.placeholder = 'Ej. Leer 20 minutos'
  custom.autocomplete = 'off'
  customLabel.htmlFor = custom.id
  const counter = element('p', 'mt-2 text-right text-xs font-bold text-[#6e6e73]', '0/60')
  counter.id = 'habito-contador'
  custom.setAttribute('aria-describedby', counter.id)
  const customArea = element('div', 'min-w-0 rounded-[1.75rem] bg-white p-5 shadow-sm', customLabel, custom, counter)
  const choices = element('fieldset', 'min-w-0')
  choices.append(element('legend', 'mb-2 text-sm font-bold text-[#6e6e73]', 'Ideas para empezar'))
  const suggestions = element('div', 'grid grid-cols-2 gap-3 lg:grid-cols-3')
  const radios = SUGGESTIONS.map(([value, glyph, color]) => {
    const radio = element('input', 'sr-only peer')
    radio.type = 'radio'
    radio.name = 'idea-habito'
    radio.value = value
    radio.setAttribute('aria-label', value)
    const check = element('span', 'hidden text-accent peer-checked:block', '✓')
    check.setAttribute('aria-hidden', 'true')
    const choice = element('label', 'flex min-h-16 min-w-0 cursor-pointer items-center gap-2 rounded-[1.25rem] border-[3px] border-transparent bg-white p-2.5 shadow-sm has-checked:border-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent', radio,
      element('span', `grid h-9 w-9 shrink-0 place-items-center rounded-xl ${color}`, icon(glyph)),
      element('span', 'min-w-0 flex-1 text-xs font-extrabold text-[#1d1d1f]', value), check)
    suggestions.append(choice)
    return radio
  })
  choices.append(suggestions)
  const status = element('p', 'text-sm font-semibold text-[#6e6e73]')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  const error = element('p', 'text-sm font-bold text-red-700')
  error.id = 'habito-error'
  error.setAttribute('role', 'alert')
  const retry = element('button', 'min-h-11 font-bold text-accent underline', 'Reintentar')
  retry.type = 'button'
  retry.hidden = true
  const save = element('button', 'flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-accent px-6 text-[1.0625rem] font-extrabold text-white disabled:opacity-50', 'Guardar hábito')
  save.type = 'submit'
  const back = element('a', 'glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink')
  back.href = '/'
  back.dataset.link = ''
  back.setAttribute('aria-label', 'Volver al panel')
  back.append(icon('back'))
  const chooseSquad = element('a', 'inline-flex min-h-11 items-center font-bold text-accent', 'Ir a Mis escuadrones')
  chooseSquad.href = '/'
  chooseSquad.dataset.link = ''
  chooseSquad.hidden = true
  const notices = element('div', 'mb-4 space-y-2', status, error, retry, chooseSquad)
  const proof = element('section', 'flex items-start justify-between gap-3 rounded-[1.75rem] bg-white p-5 shadow-sm',
    element('div', '', element('h2', 'text-sm font-bold text-[#6e6e73]', 'Cómo lo demuestras'), element('p', 'mt-1 font-extrabold text-[#1d1d1f]', 'Con una foto antes de las 23:59.'), element('p', 'text-xs font-semibold text-[#6e6e73]', 'Tu escuadrón la vota y cuenta para la racha.')),
    element('span', 'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e6f3ff] text-[#0878c9]', icon('camera')))
  form.append(element('div', 'grid gap-4 lg:grid-cols-2', intro, customArea), choices,
    element('div', 'grid items-end gap-4 lg:grid-cols-2', proof, save))
  body.append(notices, form)

  let loading = true
  let saving = false
  let ready = false
  let edited = false
  let requestVersion = 0
  function sync() {
    // Preparar un hábito no requiere red; solo guardarlo requiere un escuadrón validado.
    choices.disabled = saving
    custom.disabled = saving
    counter.textContent = `${custom.value.length}/${HABIT_MAX_LENGTH}`
    save.disabled = loading || saving || !ready
    save.textContent = saving ? 'Guardando…' : 'Guardar hábito'
    form.setAttribute('aria-busy', String(loading || saving))
    radios.forEach((radio) => { radio.checked = radio.value === custom.value })
  }
  function populate(habit) {
    custom.value = habit?.opcion === 'otro' ? habit.texto_personalizado : PREDEFINED[habit?.opcion] ?? ''
    custom.removeAttribute('aria-invalid')
  }
  async function loadHabit() {
    if (!validSquadId) {
      loading = false
      status.textContent = 'Elige primero un escuadrón en Mis escuadrones para guardar tu hábito.'
      chooseSquad.hidden = false
      sync()
      return
    }
    const version = ++requestVersion
    loading = true
    ready = false
    retry.hidden = true
    chooseSquad.hidden = true
    error.textContent = ''
    status.textContent = 'Cargando hábito…'
    back.href = `/escuadrones/panel?id=${squadId}`
    sync()
    try {
      const squad = await api.getSquad(squadId)
      if (version !== requestVersion) return
      squadName.textContent = squad.nombre
      const habit = await api.getDailyHabit(squadId)
      if (version !== requestVersion) return
      // Una respuesta lenta no debe borrar lo que el usuario acaba de escribir.
      if (!edited) populate(habit)
      ready = true
      status.textContent = edited ? 'Tu hábito está listo para guardar.' : habit ? 'Hábito cargado.' : 'Todavía no has elegido un hábito en este escuadrón.'
    } catch (cause) {
      if (version !== requestVersion) return
      status.textContent = ''
      error.textContent = errorMessage(cause)
      retry.hidden = false
      chooseSquad.hidden = !(cause instanceof ApiError && [403, 404].includes(cause.status))
    } finally {
      if (version === requestVersion) { loading = false; sync() }
    }
  }
  choices.addEventListener('change', () => {
    edited = true
    custom.value = radios.find((radio) => radio.checked)?.value ?? custom.value
    if (ready) { error.textContent = ''; status.textContent = '' }
    custom.removeAttribute('aria-invalid'); sync()
  })
  custom.addEventListener('input', () => {
    edited = true
    if (ready) { error.textContent = ''; status.textContent = '' }
    custom.removeAttribute('aria-invalid'); sync()
  })
  retry.addEventListener('click', loadHabit)
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (loading || saving || !ready) return
    const text = custom.value.trim()
    error.textContent = ''
    status.textContent = ''
    if (!text || text.length > HABIT_MAX_LENGTH) {
      error.textContent = 'Elige una idea o escribe un hábito de entre 1 y 60 caracteres.'
      custom.setAttribute('aria-invalid', 'true')
      custom.focus()
      return
    }
    saving = true
    sync()
    try {
      const habit = await api.saveDailyHabit(squadId, habitPayload(text))
      populate(habit)
      status.textContent = 'Hábito guardado en tu escuadrón.'
      navigate?.(`/escuadrones/panel?id=${squadId}`)
    } catch (cause) {
      error.textContent = errorMessage(cause)
    } finally {
      saving = false
      sync()
    }
  })
  sync()
  void loadHabit()
  const page = appLayout({ active: 'habito', kicker: squadName, title: 'Tu hábito diario', leading: back, body, detail: true })
  if (validSquadId) {
    for (const link of page.querySelectorAll('a[href="/habito"]')) {
      link.href = `/habito?escuadron=${squadId}`
    }
  }
  return page
}
