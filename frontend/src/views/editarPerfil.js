import { changeProfilePassword, getProfile, requestProfileEmail, updateProfile, uploadProfilePhoto } from '../api.js'
import { button, element } from '../components/dom.js'
import { clearFieldError, labeledField, passwordField, setFieldError } from '../components/forms.js'
import { icon } from '../components/icons.js'
import { selectorHora } from '../components/selectorHora.js'
import { loadProfileInto, profileAvatar, profileCard, profileError, profileLink, profileShell, PROFILE_BUTTON, PROFILE_SOFT_BUTTON } from '../components/perfil.js'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

function field(label, name, type = 'text', autocomplete = '') {
  return (type === 'password' ? passwordField : labeledField)({ label, id: `perfil-${name}`, name, type, autocomplete, placeholder: '' })
}

function editableForm(fields, label, action, validate = () => ({})) {
  const form = element('form', 'mt-5 flex flex-col gap-4', ...Object.values(fields).map(({ wrapper }) => wrapper))
  form.noValidate = true
  const status = element('p', 'text-sm font-bold text-[#248a3d] empty:hidden')
  status.setAttribute('role', 'status')
  const alert = element('p', 'text-sm font-bold text-[#d70015] empty:hidden')
  alert.setAttribute('role', 'alert')
  const submit = element('button', `${PROFILE_BUTTON} self-end`, label)
  submit.type = 'submit'
  form.append(status, alert, submit)
  form.addEventListener('input', () => { status.textContent = ''; alert.textContent = '' })
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    status.textContent = ''
    alert.textContent = ''
    for (const { input, error } of Object.values(fields)) clearFieldError(input, error)
    const values = Object.fromEntries(Object.entries(fields).map(([name, { input }]) => [name, input.value]))
    const errors = validate(values)
    if (Object.keys(errors).length) {
      for (const [name, message] of Object.entries(errors)) setFieldError(fields[name].input, fields[name].error, message)
      fields[Object.keys(errors)[0]].input.focus()
      return
    }
    submit.disabled = true
    submit.textContent = 'Guardando…'
    form.setAttribute('aria-busy', 'true')
    // Evita editar valores mientras la petición que los guarda está en curso.
    for (const { input } of Object.values(fields)) input.disabled = true
    for (const control of form.querySelectorAll('button[type="button"]')) control.disabled = true
    try {
      status.textContent = await action(values)
    } catch (cause) {
      let fieldError = false
      if (cause.status === 400) {
        for (const [name, { input, error }] of Object.entries(fields)) {
          const message = cause.data?.[name]
          if (message) { setFieldError(input, error, Array.isArray(message) ? message[0] : message); fieldError = true }
        }
      }
      if (!fieldError) alert.textContent = profileError(cause)
    } finally {
      for (const { input } of Object.values(fields)) input.disabled = false
      for (const control of form.querySelectorAll('button[type="button"]')) control.disabled = false
      submit.disabled = false
      submit.textContent = label
      form.setAttribute('aria-busy', 'false')
      form.querySelector('[aria-invalid="true"]')?.focus()
    }
  })
  return form
}

function photoEditor(profile, api, onSaved) {
  let selected = null
  let previewUrl = null
  const portrait = element('div', '', profileAvatar(profile))
  const status = element('p', 'text-sm font-bold empty:hidden')
  status.setAttribute('role', 'status')
  const alert = element('p', 'text-sm font-bold text-[#d70015] empty:hidden')
  alert.setAttribute('role', 'alert')
  const save = button(`${PROFILE_BUTTON} self-start`, async () => {
    if (!selected || save.disabled) return
    setPending(true)
    alert.textContent = ''
    try {
      const result = await api.uploadProfilePhoto(selected)
      profile.foto_url = result.foto_url
      selected = null
      cleanup()
      portrait.replaceChildren(profileAvatar(profile))
      status.textContent = 'Foto de perfil actualizada.'
      onSaved(profile)
    } catch (cause) { alert.textContent = profileError(cause) }
    finally { setPending(false); save.disabled = !selected; discard.hidden = !selected }
  }, 'Guardar foto')
  save.disabled = true
  const discard = button(PROFILE_SOFT_BUTTON, () => {
    selected = null
    cleanup()
    portrait.replaceChildren(profileAvatar(profile))
    status.textContent = ''
    alert.textContent = ''
    save.disabled = true
    discard.hidden = true
  }, 'Descartar foto')
  discard.hidden = true
  const inputs = []
  const picks = []
  function cleanup() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
  function setPending(pending) {
    for (const control of [...inputs, ...picks, save, discard]) control.disabled = pending
    save.textContent = pending ? 'Subiendo…' : 'Guardar foto'
  }
  function picker(capture) {
    const input = element('input')
    input.hidden = true
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.tabIndex = -1
    input.setAttribute('aria-label', capture ? 'Foto desde la cámara' : 'Foto de la galería')
    if (capture) input.setAttribute('capture', 'user')
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      input.value = ''
      if (!file) return
      alert.textContent = ''
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > MAX_PHOTO_BYTES) {
        alert.textContent = 'Elige una imagen JPEG, PNG o WebP de hasta 5 MB.'
        return
      }
      cleanup()
      selected = file
      previewUrl = URL.createObjectURL(file)
      const currentPreview = previewUrl
      portrait.replaceChildren(profileAvatar({ ...profile, foto_url: previewUrl }))
      // La imagen ya se ha decodificado cuando carga: no conservamos la URL del archivo al salir.
      const releasePreview = () => {
        URL.revokeObjectURL(currentPreview)
        if (previewUrl === currentPreview) previewUrl = null
      }
      portrait.querySelector('img').addEventListener('load', releasePreview, { once: true })
      portrait.querySelector('img').addEventListener('error', releasePreview, { once: true })
      status.textContent = 'Vista previa. Pulsa Guardar foto para aplicar el cambio.'
      save.disabled = false
      discard.hidden = false
    })
    const pick = button(capture ? PROFILE_BUTTON : PROFILE_SOFT_BUTTON, () => input.click(), icon(capture ? 'camera' : 'image'), capture ? 'Hacer foto' : 'Elegir de la galería')
    inputs.push(input)
    picks.push(pick)
    return element('div', '', input, pick)
  }
  const result = element('div', 'mt-5 flex flex-col gap-4',
    element('div', 'flex flex-wrap items-center gap-5', portrait, element('div', 'flex flex-col gap-2', picker(true), picker(false))),
    element('p', 'text-sm font-semibold text-ink-muted', 'JPEG, PNG o WebP. Máximo 5 MB.'), status, alert,
    element('div', 'flex flex-wrap gap-2', save, discard))
  return result
}

export function editarPerfilScreen({ onLogout, api = { getProfile, updateProfile, uploadProfilePhoto, requestProfileEmail, changeProfilePassword } } = {}) {
  const shell = profileShell('Editar perfil', onLogout)
  shell.content.querySelector('h1').before(profileLink('/perfil', [icon('back'), 'Volver al perfil'], 'mb-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/60 px-4 font-bold text-accent focus-visible:outline-2 focus-visible:outline-accent'))
  loadProfileInto(shell, api.getProfile, (profile) => {
    const nickname = field('Nombre de usuario', 'nickname', 'text', 'nickname')
    nickname.input.value = profile.nickname
    const savedName = element('p', 'mt-4 text-sm font-bold text-ink-muted', `Tu nombre actual: ${profile.nickname}. La disponibilidad se comprueba al guardar.`)
    const identity = profileCard('Foto y nombre', 'Así te ven en el panel de tus escuadrones.',
      photoEditor(profile, api, shell.updateAccount),
      editableForm({ nickname }, 'Guardar nombre', async (values) => {
        const updated = await api.updateProfile({ nickname: values.nickname.trim() })
        profile.nickname = updated.nickname
        nickname.input.value = updated.nickname
        savedName.textContent = `Tu nombre actual: ${updated.nickname}.`
        shell.updateAccount(profile)
        return 'Nombre de usuario actualizado.'
      }, ({ nickname }) => nickname.trim() ? {} : { nickname: 'Escribe un nombre de usuario.' }), savedName)
    identity.id = 'foto'

    const time = field('Hora del aviso', 'hora_aviso', 'time')
    time.input.value = profile.hora_aviso
    const timeLabel = time.wrapper.querySelector('label')
    timeLabel.className = 'text-sm font-extrabold'
    time.input.hidden = true
    const timePicker = selectorHora(time.input)
    timeLabel.htmlFor = timePicker.trigger.id
    const timeRow = element('div', 'flex flex-wrap items-center gap-3 rounded-2xl bg-[#f3f1f8] p-3',
      element('span', 'grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff1e6] text-[#c93400]', icon('bell')),
      element('div', 'min-w-0 flex-1', timeLabel,
        element('p', 'text-sm font-semibold text-ink-muted', 'Por defecto, a las 20:00')),
      element('div', 'ms-auto shrink-0', time.input, timePicker.trigger),
    )
    time.wrapper.replaceChildren(timeRow, time.error, timePicker.dialog)
    const unsaved = element('p', 'text-sm font-bold')
    unsaved.setAttribute('role', 'status')
    const shortcuts = ['19:00', '20:00', '21:00', '22:00'].map((hour) => button('min-h-11 rounded-xl bg-[#f3f1f8] px-2 font-extrabold transition-[background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60', () => { time.input.value = hour; time.input.dispatchEvent(new Event('input', { bubbles: true })) }, hour))
    function updateTimeState() {
      timePicker.sync()
      const changed = time.input.value !== profile.hora_aviso
      unsaved.textContent = changed ? `Sin guardar: sigue a las ${profile.hora_aviso}.` : `Hora guardada: ${profile.hora_aviso}.`
      unsaved.classList.toggle('text-[#c93400]', changed)
      unsaved.classList.toggle('text-ink-muted', !changed)
      shortcuts.forEach((control) => {
        const active = control.textContent === time.input.value
        control.setAttribute('aria-pressed', String(active))
        control.classList.toggle('bg-[#f3f1f8]', !active)
        control.classList.toggle('bg-accent', active)
        control.classList.toggle('text-white', active)
        control.classList.toggle('shadow-[0_4px_8px_rgb(91_50_234/0.2)]', active)
        control.disabled = time.input.disabled
      })
    }
    time.input.addEventListener('input', updateTimeState)
    updateTimeState()
    const reminderForm = editableForm({ hora_aviso: time }, 'Guardar hora', async (values) => {
      const updated = await api.updateProfile(values)
      profile.hora_aviso = updated.hora_aviso
      time.input.value = updated.hora_aviso
      updateTimeState()
      return 'Hora del aviso guardada.'
    }, ({ hora_aviso }) => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora_aviso) ? {} : { hora_aviso: 'Indica la hora en formato HH:MM.' })
    time.wrapper.after(element('div', 'grid grid-cols-4 gap-2', ...shortcuts))
    const saveTime = reminderForm.querySelector('button[type="submit"]')
    reminderForm.append(element('div', 'flex flex-wrap items-center justify-between gap-3', unsaved, saveTime))
    const reminder = profileCard('Recordatorio', 'Elige la hora del aviso si falta tu prueba diaria.',
      reminderForm)
    reminder.id = 'recordatorio'

    const email = field('Correo nuevo', 'email', 'email', 'email')
    const pending = element('div', 'mt-4 rounded-2xl border-2 border-accent-line bg-accent-soft p-4')
    function showPending() {
      pending.hidden = !profile.email_pendiente
      pending.replaceChildren(element('p', 'font-black', 'Falta confirmarlo'), element('p', 'mt-1 break-words font-semibold', `Abre el enlace enviado a ${profile.email_pendiente ?? ''}. Hasta entonces sigues entrando con ${profile.email}.`))
      if (profile.email_pendiente) pending.append(button('mt-2 min-h-11 font-extrabold text-accent underline disabled:opacity-50', async (event) => {
        const control = event.currentTarget
        control.disabled = true
        try {
          await api.requestProfileEmail(profile.email_pendiente)
          resendStatus.textContent = 'Enlace reenviado. Revisa tu correo.'
        } catch (cause) { resendStatus.textContent = profileError(cause) }
        finally { control.disabled = false }
      }, 'Reenviar enlace'), resendStatus)
    }
    const resendStatus = element('p', 'mt-2 text-sm font-bold empty:hidden')
    resendStatus.setAttribute('role', 'status')
    showPending()
    const mailCard = profileCard('Correo', `Ahora entras con ${profile.email}.`,
      editableForm({ email }, 'Enviar enlace de verificación', async (values) => {
        const result = await api.requestProfileEmail(values.email)
        profile.email_pendiente = result.email_pendiente
        email.input.value = ''
        resendStatus.textContent = ''
        showPending()
        return 'Enlace enviado al correo nuevo. Confírmalo para aplicar el cambio.'
      }, ({ email }) => !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? { email: 'Escribe un correo válido.' } : email.trim().toLowerCase() === profile.email.toLowerCase() ? { email: 'Escribe un correo diferente al actual.' } : {}), pending)
    mailCard.id = 'correo'

    const passwordFields = {
      password_actual: field('Contraseña actual', 'password_actual', 'password', 'current-password'),
      password: field('Nueva contraseña', 'password', 'password', 'new-password'),
      password_confirm: field('Repite la nueva contraseña', 'password_confirm', 'password', 'new-password'),
    }
    const passwords = profileCard('Contraseña', 'Mínimo 8 caracteres y no solo números. Al cambiarla, la anterior deja de servir.',
      editableForm(passwordFields, 'Cambiar contraseña', async (values) => {
        await api.changeProfilePassword(values)
        for (const { input } of Object.values(passwordFields)) { input.value = ''; input.type = 'password' }
        for (const control of passwords.querySelectorAll('[aria-pressed]')) { control.setAttribute('aria-pressed', 'false'); control.setAttribute('aria-label', 'Mostrar la contraseña'); control.textContent = 'Mostrar' }
        return 'Contraseña actualizada. Usa la nueva la próxima vez que inicies sesión.'
      }, (values) => {
        const errors = {}
        if (!values.password_actual) errors.password_actual = 'Escribe tu contraseña actual.'
        if (values.password.length < 8 || /^\d+$/.test(values.password)) errors.password = 'Usa al menos 8 caracteres y no solo números.'
        if (values.password_confirm !== values.password || !values.password_confirm) errors.password_confirm = 'Las contraseñas no coinciden.'
        return errors
      }))
    passwords.id = 'contrasena'
    const grid = element('div', 'grid items-start gap-4 lg:grid-cols-2',
      element('div', 'flex min-w-0 flex-col gap-4', identity, reminder),
      element('div', 'flex min-w-0 flex-col gap-4', mailCard, passwords))
    // El fragmento puede apuntar a una sección que aún no existía durante la carga.
    requestAnimationFrame(() => {
      const target = [identity, reminder, mailCard, passwords].find((card) => `#${card.id}` === window.location.hash)
      if (target?.isConnected) target.scrollIntoView?.({ block: 'start' })
    })
    return grid
  })
  return shell.root
}
