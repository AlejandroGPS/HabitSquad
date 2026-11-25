const fieldClass = [
  'h-12 w-full min-w-0 rounded-2xl border-2 border-hairline bg-surface px-4',
  'text-[1rem] font-bold text-ink outline-none transition-[border-color,box-shadow] duration-200',
  'placeholder:font-semibold placeholder:text-ink-muted/70',
  'focus:border-accent-line focus:ring-4 focus:ring-accent/15',
  'aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/15',
].join(' ')

function fieldError(id) {
  const error = document.createElement('p')
  error.id = id
  error.className = 'hidden text-[0.8125rem] leading-snug font-bold text-red-600'
  error.setAttribute('role', 'alert')
  error.setAttribute('aria-live', 'polite')
  return error
}

export function setFieldError(input, error, message) {
  error.textContent = message
  error.classList.remove('hidden')
  input.setAttribute('aria-invalid', 'true')
  input.setAttribute('aria-describedby', error.id)
}

export function clearFieldError(input, error) {
  error.textContent = ''
  error.classList.add('hidden')
  input.setAttribute('aria-invalid', 'false')
  input.removeAttribute('aria-describedby')
}

export function labeledField({ label, id, name, type, placeholder, autocomplete }) {
  const wrapper = document.createElement('div')
  wrapper.className = 'flex min-w-0 flex-col gap-1.5'

  const labelElement = document.createElement('label')
  labelElement.htmlFor = id
  labelElement.className = 'text-[0.875rem] font-extrabold text-ink'
  labelElement.textContent = label

  const input = document.createElement('input')
  input.id = id
  input.type = type
  input.name = name
  input.placeholder = placeholder
  input.autocomplete = autocomplete
  input.spellcheck = false
  if (type === 'email') input.inputMode = 'email'
  input.setAttribute('aria-invalid', 'false')
  input.className = fieldClass

  const error = fieldError(`${id}-error`)
  wrapper.append(labelElement, input, error)
  return { wrapper, input, error }
}

function addPasswordToggle(input) {
  input.classList.add('pe-24')

  const row = document.createElement('div')
  row.className = 'relative min-w-0'
  input.replaceWith(row)

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = [
    'absolute inset-y-0 end-0 flex min-w-20 cursor-pointer items-center justify-center rounded-r-2xl px-3',
    'text-[0.9375rem] font-extrabold text-accent transition-colors hover:text-accent-hover',
    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
  ].join(' ')
  toggle.setAttribute('aria-pressed', 'false')
  toggle.setAttribute('aria-label', 'Mostrar la contraseña')
  toggle.textContent = 'Mostrar'
  toggle.addEventListener('click', () => {
    const visible = input.type === 'password'
    input.type = visible ? 'text' : 'password'
    toggle.textContent = visible ? 'Ocultar' : 'Mostrar'
    toggle.setAttribute('aria-pressed', String(visible))
    toggle.setAttribute(
      'aria-label',
      visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña',
    )
    input.focus()
  })

  row.append(input, toggle)
}

function addCapsLockHint({ input, error }) {
  const hint = document.createElement('p')
  hint.className = 'hidden text-[0.8125rem] leading-snug font-bold text-ink-muted'
  hint.setAttribute('aria-live', 'polite')

  function update(event) {
    const capsLock = event.getModifierState?.('CapsLock') ?? false
    hint.textContent = capsLock ? 'Tienes activadas las mayúsculas.' : ''
    hint.classList.toggle('hidden', !capsLock)
  }

  input.addEventListener('keydown', update)
  input.addEventListener('keyup', update)
  input.addEventListener('blur', () => {
    hint.textContent = ''
    hint.classList.add('hidden')
  })
  error.before(hint)
}

export function passwordField(options) {
  const field = labeledField({ ...options, type: 'password' })
  addPasswordToggle(field.input)
  addCapsLockHint(field)
  return field
}

export const primaryButtonClass = [
  'flex h-12 w-full min-w-0 cursor-pointer items-center justify-center rounded-2xl',
  'border-b-4 border-accent-press bg-accent px-4',
  'text-[0.9375rem] font-extrabold tracking-[0.06em] text-white uppercase',
  'transition-[transform,border-width,background-color] duration-75 hover:bg-accent-hover',
  'active:mb-1 active:translate-y-1 active:border-b-0',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  'disabled:cursor-wait disabled:opacity-60',
].join(' ')

export const secondaryButtonClass = [
  'flex h-12 w-full min-w-0 cursor-pointer items-center justify-center rounded-2xl',
  'border-2 border-b-4 border-hairline bg-white/85 px-4',
  'text-[0.9375rem] font-extrabold tracking-[0.06em] text-accent uppercase',
  'transition-[transform,border-width,background-color] duration-75 hover:bg-white',
  'active:mb-0.5 active:translate-y-0.5 active:border-b-2',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  'disabled:cursor-default disabled:opacity-60',
].join(' ')

export function submitButton(label) {
  const button = document.createElement('button')
  button.type = 'submit'
  button.className = `mt-2 ${primaryButtonClass}`
  button.textContent = label
  button.dataset.label = label
  return button
}

export function setSubmitPending(button, pending, pendingLabel) {
  button.disabled = pending
  button.textContent = pending ? pendingLabel : button.dataset.label
}

export function formAlert() {
  const alert = document.createElement('p')
  alert.className =
    'rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-[0.9375rem] leading-snug font-bold text-pretty text-red-700'
  alert.setAttribute('role', 'alert')
  return alert
}

export function showFormAlert(alert, message, anchor) {
  alert.textContent = message
  anchor.before(alert)
}

export function clearFormAlert(alert) {
  alert.remove()
}

export function notice(message) {
  const element = document.createElement('p')
  element.className =
    'rounded-2xl border-2 border-accent-line bg-accent-soft px-4 py-3 text-[0.9375rem] leading-snug font-bold text-pretty text-ink'
  element.setAttribute('role', 'status')
  element.textContent = message
  return element
}
