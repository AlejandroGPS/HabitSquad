import { formAlert, notice, setSubmitPending, showFormAlert, submitButton } from '../components/forms.js'
import { accessLayout } from '../components/layout.js'
import { backLink } from '../components/navigation.js'

export function verificarCorreoScreen({ uid, token, onConfirm } = {}) {
  const { main, content } = accessLayout({
    title: 'Verificar correo',
    description: 'Confirma tu dirección para poder iniciar sesión.',
    bubble: '¡Ya casi estás!',
  })
  const panel = document.createElement('div')
  panel.className = 'mt-5 flex flex-col gap-4'
  panel.tabIndex = -1
  const invalidLink = 'El enlace de verificación no es válido o ha caducado.'
  const loginLink = backLink({ href: '/login', label: 'Ir a iniciar sesión' })
  const resendLink = backLink({
    href: '/reenviar-verificacion',
    label: 'Solicitar otro enlace',
  })

  if (uid && token) {
    const form = document.createElement('form')
    const submit = submitButton('Verificar mi correo')
    const alert = formAlert()
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (submit.disabled) return
      alert.remove()
      setSubmitPending(submit, true, 'Verificando…')
      try {
        await onConfirm({ uid, token })
        panel.replaceChildren(notice('Correo verificado. Ya puedes iniciar sesión.'), loginLink)
        panel.focus()
      } catch (error) {
        showFormAlert(alert, error.message, submit)
        setSubmitPending(submit, false, 'Verificando…')
      }
    })
    form.append(submit)
    panel.append(form)
  } else {
    panel.append(notice(invalidLink))
  }
  panel.append(loginLink, resendLink)
  content.append(panel)
  return main
}
