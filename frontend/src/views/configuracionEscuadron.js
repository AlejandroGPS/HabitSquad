import '../configuracion.css'
import { appLayout } from '../components/appLayout.js'
import { accountMenu } from '../components/accountMenu.js'
import { iniciales, squadAvatar } from '../components/avatar.js'
import { pillLink } from '../components/buttons.js'
import { button, element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import { clearFieldError, labeledField, setFieldError } from '../components/forms.js'
import { settingsTabs } from '../components/configuracion/tabs.js'
import { squadNavigation, updateSquadNavigation } from '../components/panel/navigation.js'
import { ApiError, getProfile } from '../api.js'
import { squadSettingsApi } from '../configuracion-api.js'

const text = (value, className = '') => element('p', className, value)

function action(label, onClick, variant = 'primary', iconName) {
  return button(`settings-action settings-action--${variant}`, onClick, iconName && icon(iconName), label)
}

function row(iconName, title, description, control, tone = '') {
  return element('div', 'settings-row',
    element('div', 'settings-row-label', element('span', `settings-icon ${tone}`, icon(iconName)),
      element('div', 'min-w-0', element('h3', 'font-extrabold', title), description)), control)
}

export function configuracionEscuadronScreen({ api = squadSettingsApi, id, panelHref = '/escuadrones', onLogout, demo = false } = {}) {
  let saved
  let draft
  let activeTab = 0
  let busy = false
  let confirmation = null
  const root = element('div')
  const content = element('div', 'settings-content')
  const status = text('Cargando configuración…', 'settings-status')
  status.setAttribute('role', 'status')
  const error = text('', 'settings-error')
  error.setAttribute('role', 'alert')
  const panel = element('section', 'settings-panel')
  panel.id = 'settings-panel'
  panel.setAttribute('role', 'tabpanel')
  panel.tabIndex = 0
  const tabs = settingsTabs((index) => {
    if (busy) return
    activeTab = index
    confirmation = null
    status.textContent = ''
    error.textContent = ''
    renderPanel()
  })
  tabs.node.hidden = true
  const backLabel = panelHref.startsWith('/escuadrones/panel?') ? 'Volver al panel' : 'Mis escuadrones'
  const back = pillLink({ href: panelHref, variant: 'secondary', className: 'settings-back h-11 w-11 px-0' }, icon('back'))
  back.setAttribute('aria-label', backLabel)
  content.append(tabs.node, error, status, panel)
  const demoNote = text('Datos de ejemplo. Los cambios se conservan al navegar y se reinician al recargar.', 'settings-demo')
  const originId = new URL(panelHref, window.location.origin).searchParams.get('id')
  const navItems = squadNavigation(originId)
  const layout = appLayout({ active: 'configuracion', kicker: demo ? 'Escuadrón de ejemplo' : 'Escuadrón', title: 'Configuración del escuadrón',
    leading: back, trailing: accountMenu({ onLogout, loadProfile: demo ? undefined : getProfile }), body: content, detail: true, navItems })
  layout.classList.add('squad-settings')
  layout.querySelector('h1').classList.remove('truncate')
  root.append(layout)

  const dirty = () => saved && draft && (saved.nombre !== draft.nombre.trim() || saved.publico !== draft.publico || saved.capacidad !== draft.capacidad)
  const memberCount = () => saved.miembrosActuales ?? saved.miembros.length
  function resetDraft() { draft = { nombre: saved.nombre, publico: saved.publico, capacidad: saved.capacidad } }
  function summary() {
    return element('div', 'settings-summary', squadAvatar({ nombre: saved.nombre }), element('div', 'min-w-0',
      element('h2', 'font-black break-words', saved.nombre),
      text(`${saved.publico ? 'Público' : 'Privado'} · ${memberCount()} de ${saved.capacidad} miembros`, 'settings-description')))
  }
  function message(cause) {
    if (cause instanceof ApiError) {
      if (cause.status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
      if (cause.status === 404) return 'Este escuadrón ya no está disponible.'
      if (cause.status === 400) {
        const errors = ['nombre', 'es_publico', 'limite_miembros', 'non_field_errors', 'detail'].flatMap((field) => cause.data?.[field] ?? [])
        return errors.length ? errors.join(' ') : 'Revisa los datos de configuración.'
      }
      return 'No se ha podido guardar la configuración. Vuelve a intentarlo.'
    }
    return cause instanceof Error ? cause.message : 'No se ha podido guardar. Vuelve a intentarlo.'
  }
  function forbidden() {
    updateSquadNavigation(layout, originId, 'configuracion', false)
    tabs.node.hidden = true
    panel.removeAttribute('role')
    panel.removeAttribute('aria-labelledby')
    panel.replaceChildren(element('section', 'settings-card settings-empty', element('span', 'settings-icon', icon('lock')),
      element('h2', 'mt-4 text-xl font-black', 'Solo para el administrador'),
      text('Solo el administrador puede cambiar la configuración de este escuadrón.', 'settings-description mt-2'),
      pillLink({ href: panelHref, variant: 'secondary', className: 'mt-5' }, backLabel)))
  }
  async function perform(operation, success, { reset = false, deleted = false } = {}) {
    if (busy) return
    busy = true
    error.textContent = ''
    status.textContent = 'Guardando…'
    content.setAttribute('aria-busy', 'true')
    const focused = document.activeElement
    const controls = [...content.querySelectorAll('button, input')].map((control) => [control, control.disabled])
    controls.forEach(([control]) => { control.disabled = true })
    try {
      const updated = await operation()
      confirmation = null
      if (deleted) {
        saved = null
        tabs.node.hidden = true
        panel.removeAttribute('role')
        panel.removeAttribute('aria-labelledby')
        panel.replaceChildren(element('div', 'settings-card settings-empty', icon('check', 'mx-auto h-10 w-10 text-accent'),
          element('h2', 'mt-4 text-xl font-black', 'Escuadrón de ejemplo eliminado'),
          text('Recarga la página para empezar de nuevo con los datos de ejemplo.', 'settings-description mt-2'),
          pillLink({ href: '/escuadrones', variant: 'secondary', className: 'mt-5' }, 'Mis escuadrones')))
      } else {
        saved = { ...saved, ...updated }
        if (reset) resetDraft()
        // Una expulsión no descarta los cambios que quedan pendientes en General.
        if (demo) draft.capacidad = Math.max(draft.capacidad, saved.miembros.length, 2)
        layout.querySelector('header p').textContent = saved.nombre
        renderPanel()
      }
      status.textContent = success
    } catch (cause) {
      status.textContent = ''
      if (cause instanceof ApiError && cause.status === 403) { forbidden(); return }
      error.textContent = message(cause)
    } finally {
      busy = false
      content.setAttribute('aria-busy', 'false')
      controls.forEach(([control, disabled]) => { control.disabled = disabled })
      if (focused?.isConnected) focused.focus()
      else { panel.focus() }
    }
  }

  function general() {
    const name = labeledField({ label: 'Nombre del escuadrón', id: 'settings-name', name: 'nombre', type: 'text', placeholder: 'Nombre de tu escuadrón', autocomplete: 'off' })
    name.input.maxLength = 100
    name.input.className = 'settings-name-field'
    name.input.value = draft.nombre
    name.wrapper.querySelector('label').classList.add('sr-only')
    const counter = element('span', 'settings-counter')
    counter.setAttribute('aria-hidden', 'true')
    const inputBox = element('div', 'settings-name-input', name.input, counter)
    name.wrapper.insertBefore(inputBox, name.error)
    const visibilityNote = text('', 'settings-description')
    const visibility = element('div', 'settings-visibility')
    visibility.setAttribute('role', 'group')
    visibility.setAttribute('aria-label', 'Visibilidad del escuadrón')
    const privateButton = action('Privado', () => { draft.publico = false; sync() }, 'choice', 'lock')
    const publicButton = action('Público', () => { draft.publico = true; sync() }, 'choice', 'globe')
    visibility.append(privateButton, publicButton)
    const capacityNote = text('', 'settings-description')
    const capacity = element('output', 'settings-capacity-value')
    capacity.setAttribute('aria-label', 'Número de plazas')
    capacity.setAttribute('aria-live', 'polite')
    const less = action('', () => { draft.capacidad--; sync() }, 'step', 'minus')
    less.setAttribute('aria-label', 'Reducir plazas')
    const more = action('', () => { draft.capacidad++; sync() }, 'step', 'plus')
    more.setAttribute('aria-label', 'Aumentar plazas')
    const stepper = element('div', 'settings-stepper', less, capacity, more)
    const changes = text('', 'settings-description')
    changes.setAttribute('role', 'status')
    const discard = action('Descartar', () => { resetDraft(); error.textContent = ''; status.textContent = 'Cambios descartados.'; renderPanel(); panel.querySelector('input').focus() }, 'secondary')
    const save = action('Guardar cambios', () => {})
    save.type = 'submit'
    const form = element('form', 'settings-card', summary(),
      row('pencil', 'Nombre', text('Cómo os ven los demás', 'settings-description'), name.wrapper),
      row('globe', 'Visibilidad', visibilityNote, visibility, 'settings-icon--green'),
      row('users', 'Plazas', capacityNote, stepper, 'settings-icon--sky'),
      element('div', 'settings-footer', changes, element('div', 'settings-footer-actions', discard, save)))
    form.noValidate = true
    function sync() {
      counter.textContent = `${draft.nombre.length}/100`
      privateButton.setAttribute('aria-pressed', String(!draft.publico))
      publicButton.setAttribute('aria-pressed', String(draft.publico))
      visibilityNote.textContent = draft.publico ? 'Sale en el buscador y cualquiera puede unirse si hay plazas.' : 'Solo se puede entrar con el código de invitación.'
      capacity.value = String(draft.capacidad)
      const free = draft.capacidad - memberCount()
      capacityNote.textContent = `Sois ${memberCount()} · ${free <= 0 ? 'No quedan plazas libres' : `Quedan ${free} ${free === 1 ? 'plaza libre' : 'plazas libres'}`}`
      less.disabled = draft.capacidad <= (demo ? Math.max(2, saved.miembros.length) : 2)
      more.disabled = demo && draft.capacidad >= 10
      if (!demo && draft.capacidad < memberCount()) capacityNote.textContent += '. Nadie será expulsado; no habrá nuevas incorporaciones hasta que queden plazas.'
      changes.textContent = dirty() ? 'Tienes cambios sin guardar' : 'Todo está guardado'
      discard.disabled = save.disabled = !dirty()
    }
    name.input.addEventListener('input', () => {
      draft.nombre = name.input.value
      clearFieldError(name.input, name.error)
      error.textContent = ''
      status.textContent = ''
      sync()
    })
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      if (busy || !dirty()) return
      if (!draft.nombre.trim() || draft.nombre.trim().length > 100) {
        setFieldError(name.input, name.error, 'Escribe un nombre de entre 1 y 100 caracteres.')
        name.input.focus()
        return
      }
      void perform(() => api.update(id, { ...draft, nombre: draft.nombre.trim() }), 'Cambios guardados.', { reset: true })
    })
    sync()
    return form
  }

  function members() {
    const list = element('ul', 'settings-card settings-member-list')
    list.setAttribute('aria-label', 'Miembros del escuadrón')
    for (const member of saved.miembros) {
      const initials = iniciales(member.nickname.replace(/[._]/g, ' '))
      const avatar = element('span', 'settings-member-avatar', initials)
      avatar.setAttribute('aria-hidden', 'true')
      if (member.fotoUrl) {
        const photo = element('img', 'h-full w-full rounded-full object-cover')
        photo.src = member.fotoUrl
        photo.alt = ''
        photo.referrerPolicy = 'no-referrer'
        photo.addEventListener('error', () => avatar.replaceChildren(initials), { once: true })
        avatar.replaceChildren(photo)
      }
      const item = element('li', 'settings-member', avatar,
        element('div', 'min-w-0 flex-1', text(member.nickname, 'font-extrabold break-words'),
          text(member.esAdministrador ? `Administrador${member.esUsuario ? ' · Tú' : ''}` : 'Miembro', 'settings-description')))
      if (api.removeMember && !member.esAdministrador && !member.esUsuario) {
        const confirming = confirmation === member.id
        const remove = action(confirming ? `¿Expulsar a ${member.nickname}?` : 'Expulsar', () => {
          if (confirmation !== member.id) { confirmation = member.id; renderPanel(); panel.querySelector(`[data-remove="${member.id}"]`).focus(); return }
          void perform(() => api.removeMember(id, member.id), `${member.nickname} ha salido del escuadrón de ejemplo.`)
        }, confirming ? 'danger' : 'muted')
        remove.dataset.remove = member.id
        remove.setAttribute('aria-label', confirming ? `Confirmar expulsión de ${member.nickname}` : `Expulsar a ${member.nickname}`)
        const actions = element('div', 'settings-member-actions', remove)
        if (confirming) actions.append(action('Cancelar', () => { confirmation = null; renderPanel(); panel.querySelector(`[data-remove="${member.id}"]`).focus() }, 'secondary'))
        item.append(actions)
      }
      list.append(item)
    }
    for (let i = memberCount(); i < Math.min(saved.capacidad, memberCount() + 10); i++) {
      list.append(element('li', 'settings-member', element('span', 'settings-free-avatar', icon('plus')),
        element('div', '', text('Plaza libre', 'font-extrabold'), text('Entra quien use el código', 'settings-description'))))
    }
    if (!api.delete) return element('div', '', text(`Miembros · ${memberCount()} de ${saved.capacidad}`, 'settings-description mb-3'), list)
    const deleting = confirmation === 'delete'
    const deleteButton = action(deleting ? 'Confirmar eliminación' : 'Eliminar', () => {
      if (confirmation !== 'delete') { confirmation = 'delete'; renderPanel(); panel.querySelector('[data-delete]').focus(); return }
      void perform(() => api.delete(id), 'El escuadrón de ejemplo se ha eliminado.', { deleted: true })
    }, 'danger', 'trash')
    deleteButton.dataset.delete = ''
    const dangerActions = element('div', 'settings-member-actions', deleteButton)
    if (deleting) dangerActions.append(action('Cancelar', () => { confirmation = null; renderPanel(); panel.querySelector('[data-delete]').focus() }, 'secondary'))
    return element('div', '', text(`Miembros · ${saved.miembros.length} de ${saved.capacidad}`, 'settings-description mb-3'), list,
      confirmation && confirmation !== 'delete' && text('Al expulsar, pierde el acceso al panel. Su racha personal y sus fotos permanecen en su perfil.', 'settings-description mt-3'),
      element('section', 'settings-card settings-danger mt-4', row('trash', 'Eliminar escuadrón',
        text(deleting ? `¿Eliminar ${saved.nombre}? Se borran la racha y las fotos de todos. No se puede deshacer.` : 'Se borran la racha y las fotos de todos. No se puede deshacer.', 'settings-description'), dangerActions, 'settings-icon--danger')))
  }

  function invitations() {
    const free = Math.max(0, saved.capacidad - memberCount())
    const copied = text('', 'settings-description mt-3')
    copied.setAttribute('role', 'status')
    const copy = action('Copiar código', async () => {
      try { await navigator.clipboard.writeText(saved.codigo); copied.textContent = 'Código copiado.' }
      catch { copied.textContent = 'No se ha podido copiar. Selecciona el código y cópialo manualmente.' }
    }, 'primary', 'copy')
    const regenerating = confirmation === 'code'
    const regenerate = action(regenerating ? 'Confirmar nuevo código' : 'Generar otro código', () => {
      if (confirmation !== 'code') { confirmation = 'code'; renderPanel(); panel.querySelector('[data-regenerate]').focus(); return }
      void perform(() => api.regenerateInvitation(id), 'Nuevo código generado. El anterior ya no es válido.')
    }, 'secondary', 'refresh')
    regenerate.dataset.regenerate = ''
    const actions = element('div', 'settings-invite-actions', copy, api.regenerateInvitation && regenerate)
    if (regenerating) actions.append(action('Cancelar', () => { confirmation = null; renderPanel(); panel.querySelector('[data-regenerate]').focus() }, 'secondary'))
    const code = element('code', 'settings-code', saved.codigo)
    code.tabIndex = 0
    code.setAttribute('aria-label', `Código de invitación: ${saved.codigo}`)
    return element('section', 'settings-card', summary(),
      element('div', 'settings-invitation', element('span', 'settings-icon', icon('userPlus')),
        element('h3', 'mt-3 text-xl font-black', 'Invita a tu gente'),
        text('Comparte este código para que se unan a vuestro escuadrón.', 'settings-description mt-2'), code,
        text(free === 0 ? 'Escuadrón completo. Aumenta las plazas en General para invitar a alguien.' : `Quedan ${free} ${free === 1 ? 'plaza libre' : 'plazas libres'} de ${saved.capacidad}.`, 'settings-places'),
        actions, copied,
        api.regenerateInvitation && text(regenerating ? '¿Generar otro código? El actual dejará de servir. Tendrás que compartir el nuevo.' : 'Si generas otro código, el anterior dejará de servir.', 'settings-description mt-4')))
  }

  function renderPanel() {
    panel.setAttribute('aria-labelledby', `settings-tab-${activeTab}`)
    panel.replaceChildren([general, members, invitations][activeTab]())
  }
  async function load() {
    if (busy) return
    if (!id || (!demo && !/^[1-9]\d*$/.test(String(id)))) {
      status.textContent = 'Selecciona un escuadrón desde su panel para abrir la configuración.'
      return
    }
    busy = true
    error.textContent = ''
    status.textContent = 'Cargando configuración…'
    panel.replaceChildren()
    content.setAttribute('aria-busy', 'true')
    try {
      saved = await api.get(id)
      status.textContent = ''
      if (!saved.esAdministrador) {
        forbidden()
        return
      }
      updateSquadNavigation(layout, originId, 'configuracion', true)
      resetDraft()
      layout.querySelector('header p').textContent = saved.nombre
      tabs.node.hidden = false
      renderPanel()
      if (demo) content.append(demoNote)
    } catch (cause) {
      status.textContent = ''
      if (cause instanceof ApiError && cause.status === 403) { forbidden(); return }
      error.textContent = message(cause)
      panel.replaceChildren(action('Reintentar', load, 'secondary'))
    } finally {
      busy = false
      content.setAttribute('aria-busy', 'false')
    }
  }
  void load()
  return root
}
