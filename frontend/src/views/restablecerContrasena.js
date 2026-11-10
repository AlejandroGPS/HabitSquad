import {
  clearFormAlert,
  formAlert,
  notice,
  passwordField,
  setSubmitPending,
  showFormAlert,
  submitButton,
} from '../components/forms.js'
import { accessLayout } from '../components/layout.js'
import { backLink } from '../components/navigation.js'

export function restablecerContrasenaScreen({ uid, token, onSubmit } = {}) {
  const { main, content } = accessLayout({
    title: 'Restablecer contraseña',
    description: 'Elige una nueva contraseña para tu cuenta.',
    bubble: '¡Te echo una mano!',
  })
  const panel = document.createElement('div')
  panel.className = 'mt-5 flex flex-col gap-4'
  panel.tabIndex = -1
  content.append(panel)

  const requestLink = backLink({ href: '/recuperar-contrasena', label: 'Solicitar otro enlace' })
  if (!uid || !token) {
    panel.append(notice('El enlace de recuperación no es válido.'), requestLink)
    return main
  }

  const form = document.createElement('form')
  form.className = 'flex min-w-0 flex-col gap-4'
  const password = passwordField({
    label: 'Nueva contraseña',
    id: 'reset-password',
    name: 'new_password',
    placeholder: 'Mínimo 8 caracteres',
    autocomplete: 'new-password',
  })
  const confirmation = passwordField({
    label: 'Repite la nueva contraseña',
    id: 'reset-password-confirmation',
    name: 'new_password_confirm',
    placeholder: 'Repite la contraseña',
    autocomplete: 'new-password',
  })
  password.input.required = true
  confirmation.input.required = true
  const submit = submitButton('Guardar contraseña')
  const alert = formAlert()

  form.addEventListener('input', () => clearFormAlert(alert))
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    clearFormAlert(alert)

    const newPassword = password.input.value
    if (newPassword !== confirmation.input.value) {
      showFormAlert(alert, 'Las contraseñas no coinciden.', submit)
      confirmation.input.focus()
      return
    }

    setSubmitPending(submit, true, 'Guardando…')
    try {
      await onSubmit({ uid, token, newPassword, confirmation: confirmation.input.value })
      panel.replaceChildren(
        notice('Contraseña actualizada. Ya puedes iniciar sesión.'),
        backLink({ href: '/login', label: 'Ir a iniciar sesión' }),
      )
      panel.focus()
    } catch (error) {
      showFormAlert(alert, error.message, submit)
    } finally {
      setSubmitPending(submit, false, 'Guardando…')
    }
  })

  form.append(password.wrapper, confirmation.wrapper, submit)
  panel.append(form, requestLink)
  return main
}
