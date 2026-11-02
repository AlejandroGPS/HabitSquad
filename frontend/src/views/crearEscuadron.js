import {
  clearFieldError,
  clearFormAlert,
  formAlert,
  labeledField,
  primaryButtonClass,
  secondaryButtonClass,
  setFieldError,
  setSubmitPending,
  showFormAlert,
  submitButton,
} from '../components/forms.js'
import { accessLayout } from '../components/layout.js'

const NAME_MAX_LENGTH = 100

function element(tag, className = '', text = '') {
  const node = document.createElement(tag)
  node.className = className
  if (text) node.textContent = text
  return node
}

function link(href, label, className) {
  const anchor = element('a', className, label)
  anchor.href = href
  anchor.dataset.link = ''
  return anchor
}

export function validateSquadName(value) {
  const name = String(value ?? '').trim()
  if (!name) return { ok: false, error: 'Ponle un nombre a tu escuadrón.' }
  if (name.length > NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `El nombre puede tener como máximo ${NAME_MAX_LENGTH} caracteres.`,
    }
  }
  return { ok: true, name }
}

export function escuadronCreadoScreen(squad) {
  const { main, content } = accessLayout({
    showAccountLinks: false,
    hideGreetingOnShortScreens: true,
    title: 'Escuadrón creado',
    description: 'Comparte el código con tus amigos o tu pareja.',
    bubble: '¡Ya tienes escuadrón!',
  })
  main.querySelector('h1').tabIndex = -1

  const codeBox = element(
    'section',
    'mt-5 rounded-2xl border-2 border-accent-line bg-accent-soft px-4 py-3 text-center',
  )
  codeBox.setAttribute('aria-label', 'Código de invitación')
  codeBox.append(
    element('p', 'text-[0.8125rem] font-extrabold text-ink-muted', 'Código de invitación'),
    element(
      'p',
      'ps-[0.3em] text-[2.25rem] leading-tight font-black tracking-[0.3em] text-accent select-all',
      squad.codigo_invitacion,
    ),
    element('p', 'truncate text-[0.9375rem] font-extrabold text-ink', squad.nombre),
  )

  const copyButton = element('button', `mt-3 ${secondaryButtonClass}`, 'Copiar código')
  copyButton.type = 'button'
  const copyStatus = element(
    'p',
    'mt-2 hidden text-center text-[0.8125rem] font-bold text-ink-muted',
  )
  copyStatus.setAttribute('role', 'status')
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(squad.codigo_invitacion)
      copyStatus.textContent = 'Código copiado.'
    } catch {
      copyStatus.textContent = 'No se ha podido copiar. Cópialo a mano.'
    }
    copyStatus.classList.remove('hidden')
  })

  const members = squad.miembros ?? []
  const membersBox = element('section', 'mt-4 rounded-2xl border-2 border-hairline bg-surface px-4 py-3')
  membersBox.append(
    element('h2', 'text-[0.9375rem] font-extrabold text-ink', `Miembros (${members.length})`),
  )
  const list = element('ul', 'mt-1 flex flex-col gap-1')
  for (const member of members) {
    const item = element('li', 'flex items-center justify-between gap-3 text-[0.9375rem] font-bold')
    item.append(element('span', '', member.usuario_id === squad.creador_id ? 'Tú' : 'Miembro'))
    if (member.es_administrador) {
      item.append(element('span', 'text-[0.8125rem] text-ink-muted', 'Administrador'))
    }
    list.append(item)
  }
  membersBox.append(
    list,
    element(
      'p',
      'mt-1 text-[0.8125rem] font-semibold text-ink-muted',
      'Los demás aparecerán aquí al unirse.',
    ),
  )

  content.append(
    codeBox,
    copyButton,
    copyStatus,
    membersBox,
    link(`/escuadrones/panel?id=${squad.id}`, 'Ir al panel', `mt-5 ${primaryButtonClass}`),
  )
  return main
}

export function crearEscuadronScreen({ onSubmit } = {}) {
  const { main, content } = accessLayout({
    showAccountLinks: false,
    title: 'Crea tu escuadrón',
    description: 'Ponle nombre y comparte el código con tu gente.',
    bubble: '¡Vamos a por la racha!',
  })

  const form = element('form', 'mt-5 flex min-w-0 flex-col gap-4')
  form.noValidate = true

  const name = labeledField({
    label: 'Nombre del escuadrón',
    id: 'nombre-escuadron',
    name: 'nombre',
    type: 'text',
    placeholder: 'Ej. Gym Bros',
    autocomplete: 'off',
  })
  name.input.maxLength = NAME_MAX_LENGTH

  const submit = submitButton('Crear escuadrón')
  const alert = formAlert()

  name.input.addEventListener('input', () => {
    clearFieldError(name.input, name.error)
    clearFormAlert(alert)
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    clearFormAlert(alert)

    const result = validateSquadName(name.input.value)
    if (!result.ok) {
      setFieldError(name.input, name.error, result.error)
      name.input.focus()
      return
    }
    clearFieldError(name.input, name.error)
    if (typeof onSubmit !== 'function') return

    setSubmitPending(submit, true, 'Creando…')
    let squad
    try {
      squad = await onSubmit(result.name)
    } catch (error) {
      showFormAlert(alert, error.message, submit)
      name.input.focus()
      return
    } finally {
      setSubmitPending(submit, false, 'Creando…')
    }

    if (!squad) return
    const created = escuadronCreadoScreen(squad)
    main.replaceWith(created)
    document.title = 'Escuadrón creado · HabitSquad'
    created.querySelector('h1').focus()
  })

  form.append(name.wrapper, submit)

  const alternative = element('div', 'mt-5 flex flex-col gap-2')
  alternative.append(
    element(
      'p',
      'text-center text-[0.8125rem] font-semibold text-ink-muted',
      '¿Te han pasado un código?',
    ),
    link('/escuadrones/unirse', 'Quiero unirme a uno', secondaryButtonClass),
  )

  content.append(form, alternative)
  return main
}
