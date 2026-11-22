import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getProfile, updateProfile, uploadProfilePhoto, requestProfileEmail, confirmProfileEmail, changeProfilePassword } from './api.js'
import { saveSession } from './session.js'
import { editarPerfilScreen } from './views/editarPerfil.js'

const response = (status, data) => ({ ok: status < 400, status, json: async () => data })
beforeEach(() => {
  saveSession({ access: 'access', refresh: 'refresh' })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { nickname: 'Ana' })))
})
afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); localStorage.clear() })

describe('contrato de perfil', () => {
  it('la pantalla real carga el perfil y guarda mediante el cliente API por defecto', async () => {
    const profile = { id: 1, nickname: 'Ana', email: 'ana@example.com', foto_url: null, email_pendiente: null, hora_aviso: '20:00' }
    fetch.mockResolvedValueOnce(response(200, profile)).mockResolvedValueOnce(response(200, { ...profile, nickname: 'NuevaAna' }))
    const root = editarPerfilScreen()
    document.body.replaceChildren(root)
    await vi.waitFor(() => expect(root.querySelector('[name="nickname"]')?.value).toBe('Ana'))
    const input = root.querySelector('[name="nickname"]')
    input.value = ' NuevaAna '
    input.closest('form').dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(root.textContent).toContain('Nombre de usuario actualizado.'))
    expect(fetch.mock.calls.map(([path]) => path)).toEqual(['/api/perfil/', '/api/perfil/'])
    expect(fetch.mock.calls[1][1].method).toBe('PATCH')
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ nickname: 'NuevaAna' })
  })
  it('consulta con JWT y propaga la respuesta', async () => {
    expect(await getProfile()).toEqual({ nickname: 'Ana' })
    expect(fetch.mock.calls[0][0]).toBe('/api/perfil/')
    expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer access')
  })
  it.each([{ nickname: 'Nuevo' }, { hora_aviso: '21:30' }])('actualiza solo los campos enviados %j', async (changes) => {
    await updateProfile(changes)
    const [path, options] = fetch.mock.calls[0]
    expect(path).toBe('/api/perfil/')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body)).toEqual(changes)
  })
  it('sube multipart sin fijar Content-Type', async () => {
    const photo = new File(['foto'], 'foto.png', { type: 'image/png' })
    await uploadProfilePhoto(photo)
    const [path, options] = fetch.mock.calls[0]
    expect(path).toBe('/api/perfil/foto/')
    expect(options.body.get('foto')).toBe(photo)
    expect(options.headers.has('Content-Type')).toBe(false)
  })
  it('normaliza el correo nuevo', async () => {
    await requestProfileEmail('  NUEVO@EXAMPLE.COM  ')
    expect(fetch.mock.calls[0][0]).toBe('/api/perfil/email/')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: 'nuevo@example.com' })
  })
  it('confirma sin sesión ni JWT', async () => {
    localStorage.clear()
    await confirmProfileEmail({ uid: 'MQ', token: 'un-token' })
    const [path, options] = fetch.mock.calls[0]
    expect(path).toBe('/api/perfil/email/confirm/')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(options.body)).toEqual({ uid: 'MQ', token: 'un-token' })
  })
  it('envía las contraseñas sin recortar espacios', async () => {
    const passwords = { password_actual: ' anterior ', password: ' nueva contraseña ', password_confirm: ' nueva contraseña ' }
    await changeProfilePassword(passwords)
    expect(fetch.mock.calls[0][0]).toBe('/api/perfil/password/')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(passwords)
  })
  it('renueva el JWT y reintenta la consulta', async () => {
    fetch.mockResolvedValueOnce(response(401, {})).mockResolvedValueOnce(response(200, { access: 'renovado', refresh: 'otro' }))
    await getProfile()
    expect(fetch.mock.calls[1][0]).toBe('/api/auth/token/refresh/')
    expect(fetch.mock.calls[2][1].headers.get('Authorization')).toBe('Bearer renovado')
  })
  it.each([400, 501])('propaga el error %s con su cuerpo', async (status) => {
    fetch.mockResolvedValueOnce(response(status, { detail: 'Error' }))
    await expect(getProfile()).rejects.toMatchObject({ status, data: { detail: 'Error' }, name: ApiError.name })
  })
})
