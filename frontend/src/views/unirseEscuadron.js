import { submitButton, setSubmitPending } from '../components/forms.js'
import { accessLayout } from '../components/layout.js'
import { backLink } from '../components/navigation.js'

const CODE_LENGTH = 6
const INCOMPLETE_CODE_MESSAGE =
  'Introduce el código completo de 6 caracteres.'
const JOIN_FAILED_MESSAGE =
  'No se ha podido unir al escuadrón. Inténtalo de nuevo.'

const boxClass = [
  'aspect-square w-full min-w-0 rounded-xl border-2 border-transparent',
  'bg-[#f2f2f7] p-0 text-center text-2xl leading-none font-extrabold',
  'text-ink uppercase outline-none transition-[border-color,box-shadow] duration-200',
  'focus:border-accent-line focus:ring-4 focus:ring-accent/15',
  'aria-invalid:border-red-400 aria-invalid:text-red-600',
  'aria-invalid:focus:border-red-400 aria-invalid:focus:ring-red-500/15',
].join(' ')

function alphanumeric(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function unirseEscuadronScreen({ onSubmit, codigo = '' } = {}) {
  const { main, content } = accessLayout({
    title: 'Únete a un escuadrón',
    description: 'Escribe el código de invitación de 6 caracteres.',
    bubble: '¿Te han pasado un código?',
    showAccountLinks: false,
    cardClassName: 'glass w-full max-w-[27rem] rounded-[2rem] p-6 sm:p-7',
  })

  const form = document.createElement('form')
  form.className = 'mt-5 flex min-w-0 flex-col gap-4'
  form.noValidate = true

  const label = document.createElement('div')
  label.className = 'flex min-w-0 flex-col gap-2'

  const caption = document.createElement('span')
  caption.id = 'codigo-invitacion-label'
  caption.className = 'text-[0.875rem] font-extrabold text-ink'
  caption.textContent = 'Código de invitación'

  const boxes = document.createElement('div')
  boxes.className = 'grid w-full min-w-0 grid-cols-6 gap-2'
  boxes.setAttribute('role', 'group')
  boxes.setAttribute('aria-labelledby', caption.id)

  const inputs = []
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    const input = document.createElement('input')
    input.type = 'text'
    input.maxLength = 1
    input.inputMode = 'text'
    input.autocomplete = index === 0 ? 'one-time-code' : 'off'
    input.spellcheck = false
    input.setAttribute('autocapitalize', 'characters')
    input.setAttribute('aria-label', `Carácter ${index + 1} del código`)
    input.id = `codigo-invitacion-${index + 1}`
    input.setAttribute('aria-invalid', 'false')
    input.className = boxClass
    input.addEventListener('focus', () => input.select())
    inputs.push(input)
    boxes.append(input)
  }

  for (const [index, char] of [...alphanumeric(codigo)].slice(0, CODE_LENGTH).entries()) {
    inputs[index].value = char
  }

  label.append(caption, boxes)

  const errorMessage = document.createElement('p')
  errorMessage.id = 'codigo-invitacion-error'
  errorMessage.className =
    'hidden rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] leading-snug font-bold text-pretty text-red-700'
  errorMessage.setAttribute('role', 'alert')
  errorMessage.setAttribute('aria-live', 'polite')

  const successMessage = document.createElement('p')
  successMessage.className =
    'hidden rounded-2xl border-2 border-green-200 bg-green-50 px-4 py-3 text-[0.875rem] leading-snug font-bold text-green-800'
  successMessage.setAttribute('role', 'status')
  successMessage.setAttribute('aria-live', 'polite')
  const panelLink = document.createElement('a')
  panelLink.className = 'min-h-11 font-bold text-accent underline'
  panelLink.textContent = 'Ir al panel'
  panelLink.dataset.link = ''
  panelLink.hidden = true

  function showError(message) {
    const text = String(message ?? '').trim()
    if (!text) return
    successMessage.textContent = ''
    successMessage.classList.add('hidden')
    errorMessage.textContent = text
    errorMessage.classList.remove('hidden')
    boxes.setAttribute('aria-describedby', errorMessage.id)
    for (const input of inputs) {
      input.setAttribute('aria-invalid', 'true')
      input.setAttribute('aria-describedby', errorMessage.id)
    }
  }

  function clearError() {
    panelLink.hidden = true
    errorMessage.textContent = ''
    errorMessage.classList.add('hidden')
    successMessage.textContent = ''
    successMessage.classList.add('hidden')
    boxes.removeAttribute('aria-describedby')
    for (const input of inputs) {
      input.setAttribute('aria-invalid', 'false')
      input.removeAttribute('aria-describedby')
    }
  }

  function showSuccess(squad) {
    if (!squad || typeof squad.nombre !== 'string') return
    clearError()
    successMessage.textContent = `Te has unido a «${squad.nombre}».`
    successMessage.classList.remove('hidden')
    if (squad.id) {
      panelLink.href = `/escuadrones/panel?id=${squad.id}`
      panelLink.hidden = false
    }
  }

  function writeFrom(start, chars) {
    for (let offset = 0; offset < chars.length; offset += 1) {
      const target = start + offset
      if (target >= inputs.length) break
      inputs[target].value = chars[offset]
    }
    const next = Math.min(start + chars.length, inputs.length - 1)
    inputs[next].focus()
  }

  for (const [index, input] of inputs.entries()) {
    input.addEventListener('input', () => {
      clearError()
      const chars = alphanumeric(input.value)
      if (chars.length > 1) {
        writeFrom(index, chars)
        return
      }
      input.value = chars
      if (chars && index < inputs.length - 1) inputs[index + 1].focus()
    })

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace') {
        clearError()
        if (!input.value && index > 0) {
          event.preventDefault()
          inputs[index - 1].focus()
          inputs[index - 1].value = ''
        }
        return
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        inputs[index - 1].focus()
      } else if (event.key === 'ArrowRight' && index < inputs.length - 1) {
        event.preventDefault()
        inputs[index + 1].focus()
      }
    })

    input.addEventListener('paste', (event) => {
      event.preventDefault()
      clearError()
      const pasted = alphanumeric(
        (event.clipboardData || window.clipboardData)?.getData('text') ?? '',
      )
      if (!pasted) return
      const start = pasted.length >= inputs.length ? 0 : index
      writeFrom(start, pasted)
    })
  }

  const submit = submitButton('Unirme al escuadrón')

  form.append(label, errorMessage, successMessage, panelLink, submit)

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const code = inputs.map((input) => input.value).join('')

    if (code.length < CODE_LENGTH) {
      showError(INCOMPLETE_CODE_MESSAGE)
      const empty = inputs.find((input) => input.value === '')
      empty?.focus()
      return
    }

    if (typeof onSubmit !== 'function') return

    const result = onSubmit(code, { showError, clearError })
    if (!result || typeof result.then !== 'function') return

    setSubmitPending(submit, true, 'Uniéndote…')
    result.then(
      (squad) => {
        setSubmitPending(submit, false, 'Uniéndote…')
        showSuccess(squad)
      },
      (error) => {
        setSubmitPending(submit, false, 'Uniéndote…')
        const message =
          error instanceof Error && error.message
            ? error.message
            : JOIN_FAILED_MESSAGE
        showError(message)
      },
    )
  })

  content.append(
    form,
    backLink({
      href: '/escuadrones/nuevo',
      label: '¿No tienes código? Crea tu escuadrón',
    }),
  )
  return main
}
