import {
  clearFieldError,
  clearFormAlert,
  formAlert,
  labeledField,
  notice,
  passwordField,
  setFieldError,
  setSubmitPending,
  showFormAlert,
  submitButton,
} from '../components/forms.js'
import { accessLayout } from '../components/layout.js'
import { backLink, passwordRecoveryLink } from '../components/navigation.js'
import { validateLogin } from './login.js'
import { validateRegistration } from './registro.js'

const COPY = {
  login: {
    title: 'Iniciar sesión',
    description: 'Cumple tu hábito. Que no caiga la racha.',
    bubble: '¡Tu escuadrón te espera!',
    submit: 'Entrar',
    pending: 'Entrando…',
  },
  register: {
    title: 'Registrarme',
    description: 'Un hábito al día, una racha compartida.',
    bubble: '¡Únete a la racha!',
    submit: 'Crear cuenta',
    pending: 'Creando cuenta…',
  },
}

function accesoScreen({ mode, onSubmit, notice: noticeMessage } = {}) {
  const isLogin = mode === 'login'
  const copy = COPY[mode]
  const { main, content } = accessLayout({
    active: mode,
    title: copy.title,
    description: copy.description,
    bubble: copy.bubble,
  })

  const form = document.createElement('form')
  form.className = 'mt-5 flex min-w-0 flex-col gap-4'
  form.noValidate = true

  const email = labeledField({
    label: 'Correo',
    id: isLogin ? 'login-email' : 'registro-email',
    name: 'email',
    type: 'email',
    placeholder: 'tu@correo.com',
    autocomplete: isLogin ? 'username' : 'email',
  })
  const password = passwordField({
    label: 'Contraseña',
    id: isLogin ? 'login-password' : 'registro-password',
    name: 'password',
    placeholder: isLogin ? 'Tu contraseña' : 'Mínimo 8 caracteres',
    autocomplete: isLogin ? 'current-password' : 'new-password',
  })

  const submit = submitButton(copy.submit)
  const alert = formAlert()

  const note = document.createElement('p')
  note.className =
    'mt-4 text-center text-[0.8125rem] font-semibold text-pretty text-ink-muted [@media(max-height:680px)]:hidden'
  note.textContent = 'Después podrás crear un escuadrón o unirte a uno.'

  function clearField(field) {
    clearFieldError(field.input, field.error)
    clearFormAlert(alert)
  }

  email.input.addEventListener('input', () => clearField(email))
  password.input.addEventListener('input', () => clearField(password))

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    clearFormAlert(alert)

    const values = {
      email: email.input.value,
      password: password.input.value,
    }
    const result = isLogin ? validateLogin(values) : validateRegistration(values)

    for (const field of [email, password]) {
      const message = result.errors[field.input.name]
      if (message) setFieldError(field.input, field.error, message)
      else clearFieldError(field.input, field.error)
    }

    if (!result.ok) {
      const firstInvalid = result.errors.email ? email.input : password.input
      firstInvalid.focus()
      return
    }

    if (typeof onSubmit !== 'function') return

    setSubmitPending(submit, true, copy.pending)
    try {
      await onSubmit({ email: result.email, password: result.password })
      if (!isLogin) {
        const confirmation = document.createElement('div')
        confirmation.className = 'mt-5 flex flex-col'
        confirmation.tabIndex = -1
        confirmation.append(
          notice('Cuenta creada. Revisa tu correo y verifica tu dirección antes de iniciar sesión.'),
          backLink({ href: '/login', label: 'Ir a iniciar sesión' }),
          backLink({ href: '/reenviar-verificacion', label: 'Reenviar correo de verificación' }),
        )
        form.replaceWith(confirmation)
        confirmation.focus()
      }
    } catch (error) {
      const fieldErrors = error?.cause?.data
      if (fieldErrors && typeof fieldErrors === 'object') {
        const emailErr = Array.isArray(fieldErrors.email)
          ? fieldErrors.email[0]
          : fieldErrors.email
        const passErr = Array.isArray(fieldErrors.password)
          ? fieldErrors.password[0]
          : fieldErrors.password
        if (emailErr) setFieldError(email.input, email.error, String(emailErr).trim())
        if (passErr) setFieldError(password.input, password.error, String(passErr).trim())
        if (emailErr) {
          email.input.focus()
        } else if (passErr) {
          password.input.focus()
          password.input.select?.()
        }
      }
      showFormAlert(alert, error.message, submit)
      if (isLogin) {
        password.input.focus()
        password.input.select()
      }
    } finally {
      setSubmitPending(submit, false, copy.pending)
    }
  })

  form.append(email.wrapper, password.wrapper)
  if (isLogin) form.append(passwordRecoveryLink())
  form.append(submit)

  if (noticeMessage) {
    const noticeWrapper = document.createElement('div')
    noticeWrapper.className = 'mt-5'
    noticeWrapper.append(notice(noticeMessage))
    content.append(noticeWrapper)
  }
  content.append(form, note)
  if (isLogin) {
    content.append(
      backLink({ href: '/reenviar-verificacion', label: 'Reenviar correo de verificación' }),
    )
  }
  return main
}

export function loginScreen(options = {}) {
  return accesoScreen({ ...options, mode: 'login' })
}

export function registroScreen(options = {}) {
  return accesoScreen({ ...options, mode: 'register' })
}
