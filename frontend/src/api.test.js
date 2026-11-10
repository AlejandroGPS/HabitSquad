import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  SESSION_EXPIRED_EVENT,
  authFetch,
  confirmPasswordReset,
  createSquad,
  joinSquad,
  login,
  logout,
  refreshSession,
  register,
} from './api.js'
import { getSession, hasSession, saveSession } from './session.js'

function jsonResponse(status, body = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function emptyResponse(status) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input')
    },
  }
}

describe('api', () => {
  let fetchMock

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('un registro correcto llama a POST /api/auth/register/', async () => {
    const userData = {
      id: 7,
      email: 'persona@example.com',
      date_joined: '2026-10-17T12:00:00Z',
    }
    fetchMock.mockResolvedValue(jsonResponse(201, userData))

    const result = await register({
      email: 'persona@example.com',
      password: 'S0mething!Secure-497',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'persona@example.com',
        password: 'S0mething!Secure-497',
      }),
    })
    expect(result).toEqual(userData)
  })

  it('envía el token y ambas contraseñas al confirmar la recuperación', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200))
    await confirmPasswordReset({
      uid: 'abc',
      token: 'token',
      newPassword: 'N3w!Secure-Password-497',
      confirmation: 'N3w!Secure-Password-497',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/password-reset/confirm/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: 'abc',
        token: 'token',
        new_password: 'N3w!Secure-Password-497',
        new_password_confirm: 'N3w!Secure-Password-497',
      }),
    })
  })

  it('un registro con 400 lanza ApiError con los datos de error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { email: ['Ya existe una cuenta con este email.'] }),
    )

    const error = await register({
      email: 'persona@example.com',
      password: 'S0mething!Secure-497',
    }).catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.data).toEqual({ email: ['Ya existe una cuenta con este email.'] })
  })

  it('un registro con 429 lanza ApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { detail: 'throttled' }))

    await expect(
      register({ email: 'persona@example.com', password: 'S0mething!Secure-497' }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 429 })
  })

  it('un login correcto guarda los tokens', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { access: 'access-token', refresh: 'refresh-token' }),
    )

    await login({ email: 'persona@example.com', password: 'secreta' })

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'persona@example.com',
        password: 'secreta',
      }),
    })
    expect(getSession()).toEqual({
      access: 'access-token',
      refresh: 'refresh-token',
    })
  })

  it('un login con 401 lanza ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { detail: 'No active account found' }),
    )

    const error = await login({
      email: 'persona@example.com',
      password: 'mala',
    }).catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(401)
    expect(error.data).toEqual({ detail: 'No active account found' })
    expect(hasSession()).toBe(false)
  })

  it('un login con 429 lanza ApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { detail: 'throttled' }))

    await expect(
      login({ email: 'persona@example.com', password: 'secreta' }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 429 })
    expect(hasSession()).toBe(false)
  })

  it('cerrar sesión borra los tokens y revoca el refresh', async () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    fetchMock.mockResolvedValue(emptyResponse(204))

    await logout()

    expect(hasSession()).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: 'refresh-token' }),
    })
  })

  it('cerrar sesión borra los tokens aunque falle la petición', async () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    fetchMock.mockResolvedValue(jsonResponse(500, { detail: 'error' }))

    await logout()

    expect(hasSession()).toBe(false)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('cerrar sesión sin tokens no llama a la API', async () => {
    await logout()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renueva el access y guarda los tokens nuevos', async () => {
    saveSession({ access: 'old-access', refresh: 'old-refresh' })
    fetchMock.mockResolvedValue(
      jsonResponse(200, { access: 'new-access', refresh: 'new-refresh' }),
    )

    await refreshSession()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: 'old-refresh' }),
    })
    expect(getSession()).toEqual({
      access: 'new-access',
      refresh: 'new-refresh',
    })
  })

  it('renueva el access una sola vez con peticiones concurrentes', async () => {
    saveSession({ access: 'old-access', refresh: 'old-refresh' })
    let refreshCalls = 0
    fetchMock.mockImplementation(async (path) => {
      if (path !== '/api/auth/token/refresh/') {
        throw new Error(`Petición inesperada: ${path}`)
      }
      refreshCalls += 1
      await new Promise((resolve) => setTimeout(resolve, 20))
      return jsonResponse(200, {
        access: 'new-access',
        refresh: 'new-refresh',
      })
    })

    await Promise.all([refreshSession(), refreshSession()])

    expect(refreshCalls).toBe(1)
    expect(getSession()).toEqual({
      access: 'new-access',
      refresh: 'new-refresh',
    })
  })

  it('si la renovación falla, cierra la sesión y emite el evento', async () => {
    saveSession({ access: 'old-access', refresh: 'old-refresh' })
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: 'Token is invalid' }))
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)

    await expect(refreshSession()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    })

    expect(hasSession()).toBe(false)
    expect(onExpired).toHaveBeenCalledTimes(1)
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  })

  it('authFetch envía el access token', async () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))

    const response = await authFetch('/api/escuadrones/')

    expect(response.status).toBe(200)
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.get('Authorization')).toBe('Bearer access-token')
  })

  it('authFetch sin sesión cierra la sesión y lanza 401', async () => {
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)

    await expect(authFetch('/api/escuadrones/')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(onExpired).toHaveBeenCalledTimes(1)
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  })

  it('authFetch renueva el access ante un 401 y reintenta', async () => {
    saveSession({ access: 'old-access', refresh: 'old-refresh' })
    let resourceCalls = 0
    fetchMock.mockImplementation(async (path, options) => {
      if (path === '/api/escuadrones/') {
        resourceCalls += 1
        if (resourceCalls === 1) {
          expect(options.headers.get('Authorization')).toBe('Bearer old-access')
          return jsonResponse(401)
        }
        expect(options.headers.get('Authorization')).toBe('Bearer new-access')
        return jsonResponse(200, { id: 1 })
      }
      if (path === '/api/auth/token/refresh/') {
        return jsonResponse(200, {
          access: 'new-access',
          refresh: 'new-refresh',
        })
      }
      throw new Error(`Petición inesperada: ${path}`)
    })

    const response = await authFetch('/api/escuadrones/')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 1 })
    expect(getSession()).toEqual({
      access: 'new-access',
      refresh: 'new-refresh',
    })
    expect(resourceCalls).toBe(2)
  })

  it('createSquad envía el nombre autenticado y devuelve 201', async () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    const escuadron = {
      id: 1,
      nombre: 'Gym Bros',
      codigo_invitacion: 'X8K9QL',
      creador_id: 7,
      miembros: [{ usuario_id: 7, es_administrador: true }],
    }
    fetchMock.mockResolvedValue(jsonResponse(201, escuadron))

    await expect(createSquad('Gym Bros')).resolves.toEqual(escuadron)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/escuadrones/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ nombre: 'Gym Bros' }),
      }),
    )
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.get('Authorization')).toBe(
      'Bearer access-token',
    )
  })

  it('createSquad propaga un error 400 de la API', async () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    const payload = {
      nombre: ['Este campo no puede estar en blanco.'],
    }
    fetchMock.mockResolvedValue(jsonResponse(400, payload))

    await expect(createSquad('')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      data: payload,
    })
  })

  it('joinSquad envía el código autenticado y devuelve el escuadrón', async () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    const escuadron = {
      id: 1,
      nombre: 'Madrugadores',
      codigo_invitacion: 'X8K9QL',
    }
    fetchMock.mockResolvedValue(jsonResponse(201, escuadron))

    await expect(joinSquad('X8K9QL')).resolves.toEqual(escuadron)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/escuadrones/unirse/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ codigo_invitacion: 'X8K9QL' }),
      }),
    )
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.get('Authorization')).toBe('Bearer access-token')
  })

  it('joinSquad propaga los errores devueltos por la API', async () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    fetchMock.mockResolvedValue(
      jsonResponse(404, { detail: 'No se ha encontrado un escuadrón con ese código' }),
    )

    await expect(joinSquad('X8K9QL')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      data: { detail: 'No se ha encontrado un escuadrón con ese código' },
    })
  })
})
