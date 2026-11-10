import {
  clearFieldError,
  clearFormAlert,
  formAlert,
  labeledField,
  notice,
  setFieldError,
  setSubmitPending,
  showFormAlert,
  submitButton,
} from '../components/forms.js'
import { accessLayout } from '../components/layout.js'
import { backLink } from '../components/navigation.js'
import { validateEmail } from './login.js'

function emailLinkScreen({ onSubmit, title, description, emailId } = {}) {
  const { main, content } = accessLayout({
    title,
    description,
    bubble: '¡Te echo una mano!',
  })

  const form = document.createElement('form')
  form.className = 'mt-5 flex min-w-0 flex-col gap-4'
  form.noValidate = true

  const email = labeledField({
    label: 'Correo',
    id: emailId,
    name: 'email',
    type: 'email',
    placeholder: 'tu@correo.com',
    autocomplete: 'email',
  })

  const submit = submitButton('Enviar enlace')
  const alert = formAlert()

  email.input.addEventListener('input', () => {
    clearFieldError(email.input, email.error)
    clearFormAlert(alert)
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    clearFormAlert(alert)

    const result = validateEmail(email.input.value)
    if (!result.ok) {
      setFieldError(email.input, email.error, result.error)
      email.input.focus()
      return
    }
    clearFieldError(email.input, email.error)
    if (typeof onSubmit !== 'function') return

    setSubmitPending(submit, true, 'Enviando…')
    try {
      await onSubmit(result.email)
    } catch (error) {
      showFormAlert(alert, error.message, submit)
      return
    } finally {
      setSubmitPending(submit, false, 'Enviando…')
    }

    const sent = document.createElement('div')
    sent.className = 'mt-5'
    sent.append(
      notice(
        `Si hay una cuenta con ${result.email}, te hemos enviado un enlace. ` +
          'Revisa también la carpeta de spam.',
      ),
    )
    form.replaceWith(sent)
  })

  form.append(email.wrapper, submit)
  content.append(form, backLink({ href: '/login', label: 'Volver a iniciar sesión' }))
  return main
}

export function recuperarContrasenaScreen({ onSubmit } = {}) {
  return emailLinkScreen({
    onSubmit,
    title: 'Recuperar contraseña',
    description: 'Te enviaremos un enlace para crear una contraseña nueva.',
    emailId: 'recuperar-email',
  })
}

export function reenviarVerificacionScreen({ onSubmit } = {}) {
  return emailLinkScreen({
    onSubmit,
    title: 'Reenviar correo de verificación',
    description: 'Te enviaremos otro enlace si tu cuenta está pendiente de verificación.',
    emailId: 'reenviar-email',
  })
}
