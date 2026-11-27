import { element } from '../components/dom.js'
import { accessLayout } from '../components/layout.js'
import { profileError, profileLink, PROFILE_BUTTON } from '../components/perfil.js'

export function confirmarCorreoPerfilScreen({ uid, token, onConfirm } = {}) {
  const { main, content } = accessLayout({
    title: 'Confirmar correo nuevo',
    description: 'Confirma el cambio para empezar a entrar con tu nueva dirección.',
    bubble: '¡Tu cuenta, al día!',
  })
  const panel = element('div', 'mt-5 flex flex-col gap-4')
  const status = element('p', 'font-bold')
  status.setAttribute('role', 'status')
  const alert = element('p', 'font-bold text-[#d70015] empty:hidden')
  alert.setAttribute('role', 'alert')
  if (uid && token) {
    const form = element('form')
    const submit = element('button', `${PROFILE_BUTTON} w-full`, 'Confirmar correo nuevo')
    submit.type = 'submit'
    form.append(submit)
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (submit.disabled) return
      submit.disabled = true
      alert.textContent = ''
      status.textContent = 'Confirmando…'
      try {
        const result = await onConfirm({ uid, token })
        status.textContent = `Correo actualizado. Ya puedes iniciar sesión con ${result.email}.`
        form.remove()
      } catch (cause) {
        status.textContent = ''
        alert.textContent = cause.status === 400 ? 'El enlace de cambio de correo no es válido o ha caducado.' : profileError(cause)
        submit.disabled = false
      }
    })
    panel.append(form)
  } else {
    alert.textContent = 'El enlace de cambio de correo no es válido o está incompleto.'
  }
  panel.append(status, alert, profileLink('/perfil', 'Volver a mi perfil'), profileLink('/login', 'Ir a iniciar sesión'))
  content.append(panel)
  return main
}
