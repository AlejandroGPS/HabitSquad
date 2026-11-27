import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api.js'
import { guard, routes } from '../routes.js'
import { perfilScreen } from './perfil.js'
import { editarPerfilScreen } from './editarPerfil.js'
import { confirmarCorreoPerfilScreen } from './confirmarCorreoPerfil.js'

const profile = { id: 1, nickname: 'Ana', email: 'ana@example.com', email_pendiente: null, foto_url: null, hora_aviso: '20:00' }
let api
beforeEach(() => {
  api = {
    getProfile: vi.fn(async () => ({ ...profile })),
    updateProfile: vi.fn(async (changes) => ({ ...profile, ...changes })),
    uploadProfilePhoto: vi.fn(async () => ({ foto_url: 'https://example.com/foto.png' })),
    requestProfileEmail: vi.fn(async (email) => ({ email_pendiente: email.trim().toLowerCase() })),
    changeProfilePassword: vi.fn(async () => ({})),
    listSquads: vi.fn(async () => []),
    getSquad: vi.fn(),
  }
  URL.createObjectURL = vi.fn(() => 'blob:foto')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks() })

async function edit() {
  const root = editarPerfilScreen({ api })
  document.body.replaceChildren(root)
  await vi.waitFor(() => expect(root.querySelector('[name="nickname"]')).not.toBeNull())
  return root
}
function submit(root, name) {
  root.querySelector(`[name="${name}"]`).closest('form').dispatchEvent(new Event('submit', { cancelable: true }))
}
function fill(root, name, value) {
  const input = root.querySelector(`[name="${name}"]`)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('perfil conectado', () => {
  it('protege perfil y edición; la confirmación es pública', () => {
    for (const path of ['/perfil', '/perfil/editar']) expect(guard(routes.find((route) => route.path === path))).toContain('/login')
    expect(guard(routes.find((route) => route.path === '/perfil/email/confirmar'))).toBeNull()
    expect(guard(routes.find((route) => route.path === '/perfil/confirmar-email'))).toBeNull()
  })
  it('muestra identidad real y hábitos sin inventar estadísticas', async () => {
    api.listSquads.mockResolvedValue([{ id: 7, nombre: 'Lectores' }])
    api.getSquad.mockResolvedValue({ id: 7, nombre: 'Lectores', miembros: [{ es_usuario: true, habito: { opcion: 'leer' }, prueba_hoy: { estado: 'cumplido' } }] })
    const root = perfilScreen({ api })
    document.body.replaceChildren(root)
    await vi.waitFor(() => expect(root.textContent).toContain('Cumplido hoy'))
    expect(root.textContent).toContain('ana@example.com')
    expect(root.textContent).toContain('Hoy')
    expect(root.textContent).toContain('Leer')
    expect(root.textContent).not.toContain('días de racha')
    expect(root.querySelector('a[href="/perfil/editar"]')).not.toBeNull()
    expect(root.querySelector('a[href="/escuadrones/panel?id=7"]')).not.toBeNull()
  })
  it('junta la mejor racha, el hábito de hoy y la semana sin tapar el resto', async () => {
    const semana = [23, 24, 25, 26, 27, 28, 29].map((dia, indice) => ({
      fecha: `2026-11-${dia}`,
      estado: indice < 4 ? 'cumplido' : null,
    }))
    api.listSquads.mockResolvedValue([{ id: 7, nombre: 'Los Inquebrantables' }, { id: 8, nombre: 'Mañanas' }])
    api.getSquad.mockImplementation(async (id) => id === 7 ? {
      id: 7,
      nombre: 'Los Inquebrantables',
      racha: 12,
      miembros: [{ es_usuario: true, habito: { opcion: 'leer' }, prueba_hoy: null, semana }],
    } : {
      id: 8,
      nombre: 'Mañanas',
      racha: 5,
      miembros: [{ es_usuario: true, habito: { opcion: 'gimnasio' }, prueba_hoy: { estado: 'pendiente' } }],
    })
    const root = perfilScreen({ api, ahora: new Date('2026-11-27T12:00:00') })
    document.body.replaceChildren(root)
    await vi.waitFor(() => expect(root.textContent).toContain('12 días de racha · Los Inquebrantables'))
    const hoy = [...root.querySelectorAll('section')].find((section) => section.querySelector('h2')?.textContent === 'Hoy')
    expect(hoy.textContent).toContain('Leer')
    expect(hoy.textContent).toContain('Sin prueba')
    expect(hoy.querySelector('a').getAttribute('href')).toBe('/prueba?escuadron=7')
    expect(hoy.querySelector('[aria-label="Esta semana"]').textContent).toContain('V27')
    expect(root.textContent).toContain('Ir al gimnasio')
    expect(root.textContent).toContain('Pendiente')
    expect(root.textContent).toContain('Cambiar contraseña')
  })
  it('mantiene una racha ya conocida si el escuadrón no trae la suya', async () => {
    api.listSquads.mockResolvedValue([{ id: 7, nombre: 'Lectores' }])
    api.getSquad.mockResolvedValue({ id: 7, nombre: 'Lectores', miembros: [{ es_usuario: true, habito: null }] })
    const root = perfilScreen({ api, racha: 4 })
    document.body.replaceChildren(root)
    await vi.waitFor(() => expect(root.textContent).toContain('Sin hábito'))
    expect(root.textContent).toContain('4 días de racha')
    expect(root.textContent).not.toContain('4 días de racha ·')
  })
  it('permite reintentar tras un 501 sin mostrar formularios vacíos', async () => {
    api.getProfile.mockRejectedValueOnce(new ApiError(501))
    const root = editarPerfilScreen({ api })
    document.body.replaceChildren(root)
    await vi.waitFor(() => expect(root.textContent).toContain('El perfil todavía no está disponible'))
    expect(root.querySelector('form')).toBeNull()
    root.querySelector('main button').click()
    await vi.waitFor(() => expect(root.querySelector('form')).not.toBeNull())
  })
  it('separa los fallos de los hábitos de la carga del perfil', async () => {
    api.listSquads.mockRejectedValue(new Error('offline'))
    const root = perfilScreen({ api })
    document.body.replaceChildren(root)
    await vi.waitFor(() => expect(root.textContent).toContain('No se han podido cargar tus hábitos.'))
    expect(root.textContent).toContain('ana@example.com')
  })
  it('el menú de la cuenta marca el perfil también después de cargar la foto, y en la edición', async () => {
    window.history.replaceState(null, '', '/perfil')
    const root = perfilScreen({ api: { ...api, getProfile: vi.fn(async () => ({ ...profile, foto_url: 'https://example.com/ana.png' })) } })
    document.body.replaceChildren(root)
    await vi.waitFor(() => expect(root.querySelector('header img[src="https://example.com/ana.png"]')).not.toBeNull())
    expect(root.querySelectorAll('header')).toHaveLength(1)
    expect(root.querySelector('header [aria-label="Tu cuenta"]').className).toContain('ring-accent')
    expect([...root.querySelectorAll('header [aria-current]')].map((node) => node.textContent)).toEqual(['Ver perfil'])
    expect(root.querySelector('header a[data-zona="escuadrones"]')).not.toBeNull()

    window.history.replaceState(null, '', '/perfil/editar')
    const edicion = await edit()
    expect(edicion.querySelector('header [aria-current="true"]').textContent).toBe('Ver perfil')
    window.history.replaceState(null, '', '/')
  })
})

describe('edición de perfil', () => {
  it('no guarda automáticamente y envía solo el nombre normalizado', async () => {
    const root = await edit()
    fill(root, 'nickname', '  OtraAna  ')
    expect(api.updateProfile).not.toHaveBeenCalled()
    submit(root, 'nickname')
    await vi.waitFor(() => expect(root.textContent).toContain('Nombre de usuario actualizado.'))
    expect(api.updateProfile).toHaveBeenCalledWith({ nickname: 'OtraAna' })
  })
  it('conserva el nombre guardado si está ocupado', async () => {
    api.updateProfile.mockRejectedValue(new ApiError(400, { nickname: ['Ese nombre ya lo usa otra persona.'] }))
    const root = await edit()
    fill(root, 'nickname', 'Ocupado')
    submit(root, 'nickname')
    await vi.waitFor(() => expect(root.textContent).toContain('Ese nombre ya lo usa otra persona.'))
    expect(root.textContent).toContain('Tu nombre actual: Ana')
    expect(root.querySelector('[name="nickname"]').getAttribute('aria-invalid')).toBe('true')
  })
  it('rechaza el nombre vacío antes de llamar a la API', async () => {
    const root = await edit()
    fill(root, 'nickname', '   ')
    submit(root, 'nickname')
    expect(api.updateProfile).not.toHaveBeenCalled()
    expect(root.textContent).toContain('Escribe un nombre de usuario.')
  })
  it('los atajos no persisten hasta guardar y actualizan la hora guardada', async () => {
    const root = await edit()
    ;[...root.querySelectorAll('button')].find((control) => control.textContent === '21:00').click()
    expect(root.textContent).toContain('Sin guardar: sigue a las 20:00.')
    expect(api.updateProfile).not.toHaveBeenCalled()
    submit(root, 'hora_aviso')
    await vi.waitFor(() => expect(root.textContent).toContain('Hora del aviso guardada.'))
    expect(api.updateProfile).toHaveBeenCalledWith({ hora_aviso: '21:00' })
    expect(root.textContent).toContain('Hora guardada: 21:00.')
  })
  it('no cambia el email de login hasta que se confirme', async () => {
    const root = await edit()
    fill(root, 'email', 'nuevo@example.com')
    submit(root, 'email')
    await vi.waitFor(() => expect(root.textContent).toContain('Falta confirmarlo'))
    expect(root.textContent).toContain('Ahora entras con ana@example.com.')
    expect(root.textContent).toContain('nuevo@example.com')
    ;[...root.querySelectorAll('button')].find((control) => control.textContent === 'Reenviar enlace').click()
    await vi.waitFor(() => expect(api.requestProfileEmail).toHaveBeenCalledTimes(2))
    expect(api.requestProfileEmail).toHaveBeenLastCalledWith('nuevo@example.com')
  })
  it('no envía contraseñas distintas', async () => {
    const root = await edit()
    fill(root, 'password_actual', 'Anterior123')
    fill(root, 'password', 'Nueva123456')
    fill(root, 'password_confirm', 'Diferente123')
    submit(root, 'password')
    expect(api.changeProfilePassword).not.toHaveBeenCalled()
    expect(root.textContent).toContain('Las contraseñas no coinciden.')
  })
  it('evita envíos duplicados y limpia las contraseñas al completar', async () => {
    let resolve
    api.changeProfilePassword.mockReturnValue(new Promise((ok) => { resolve = ok }))
    const root = await edit()
    for (const name of ['password_actual', 'password', 'password_confirm']) fill(root, name, ' Con espacios 123 ')
    submit(root, 'password')
    submit(root, 'password')
    expect(api.changeProfilePassword).toHaveBeenCalledOnce()
    expect(api.changeProfilePassword.mock.calls[0][0].password).toBe(' Con espacios 123 ')
    resolve({})
    await vi.waitFor(() => expect(root.querySelector('[name="password"]').value).toBe(''))
  })
  it('valida la foto, muestra vista previa y solo la sube al guardar', async () => {
    const root = await edit()
    const input = root.querySelector('input[type="file"]')
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['bad'], 'foto.svg', { type: 'image/svg+xml' })] })
    input.dispatchEvent(new Event('change'))
    expect(root.textContent).toContain('Elige una imagen JPEG, PNG o WebP de hasta 5 MB.')
    const photo = new File(['png'], 'foto.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { configurable: true, value: [photo] })
    input.dispatchEvent(new Event('change'))
    expect(root.querySelector('img[src="blob:foto"]')).not.toBeNull()
    expect(api.uploadProfilePhoto).not.toHaveBeenCalled()
    ;[...root.querySelectorAll('button')].find((control) => control.textContent === 'Guardar foto').click()
    await vi.waitFor(() => expect(root.textContent).toContain('Foto de perfil actualizada.'))
    expect(api.uploadProfilePhoto).toHaveBeenCalledWith(photo)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto')
  })
  it('rechaza fotos mayores de 5 MB', async () => {
    const root = await edit()
    const photo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
    Object.defineProperty(photo, 'size', { value: 5 * 1024 * 1024 + 1 })
    const input = root.querySelector('input[type="file"]')
    Object.defineProperty(input, 'files', { value: [photo] })
    input.dispatchEvent(new Event('change'))
    expect(api.uploadProfilePhoto).not.toHaveBeenCalled()
    expect(root.textContent).toContain('hasta 5 MB')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})

describe('confirmación de correo nuevo', () => {
  it('no consume enlaces incompletos', () => {
    const onConfirm = vi.fn()
    const root = confirmarCorreoPerfilScreen({ uid: 'MQ', onConfirm })
    expect(root.textContent).toContain('incompleto')
    expect(root.querySelector('form')).toBeNull()
    expect(onConfirm).not.toHaveBeenCalled()
  })
  it('envía uid y token y muestra el correo confirmado', async () => {
    const onConfirm = vi.fn(async () => ({ email: 'nuevo@example.com' }))
    const root = confirmarCorreoPerfilScreen({ uid: 'MQ', token: 'token', onConfirm })
    root.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(root.textContent).toContain('Ya puedes iniciar sesión con nuevo@example.com.'))
    expect(onConfirm).toHaveBeenCalledWith({ uid: 'MQ', token: 'token' })
  })
})
