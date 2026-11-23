import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../routes.js'
import { hasSession } from '../session.js'

const credentials = {
  email: 'persona@example.com',
  nickname: 'HabitHero',
  password: '  S0mething!Secure-497  ',
  password_confirm: '  S0mething!Secure-497  ',
}

function mountRegistration() {
  const screen = routes.find(({ path }) => path === '/registro').view()
  document.body.replaceChildren(screen)
  for (const [name, value] of Object.entries(credentials)) {
    screen.querySelector(`[name="${name}"]`).value = value
  }
  screen.querySelector('[name="email"]').value = '  Persona@Example.com  '
  screen.querySelector('[name="nickname"]').value = '  HabitHero  '
  return screen
}

function submit(screen) {
  screen.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
}

describe('registro conectado a la API', () => {
  let fetchMock

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    document.body.replaceChildren()
  })

  it('envía el contrato completo y pide verificar el correo sin iniciar sesión', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      id: 7, email: credentials.email, nickname: credentials.nickname,
      date_joined: '2026-11-19T12:00:00Z',
    }), { status: 201 }))
    const screen = mountRegistration()
    submit(screen)

    await vi.waitFor(() => expect(screen.querySelector('form')).toBeNull())
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
    expect(screen.querySelector('[role="status"]').textContent).toContain('verifica tu dirección')
    expect(screen.querySelector('a[href="/login"]')).not.toBeNull()
    expect(screen.querySelector('a[href="/reenviar-verificacion"]')).not.toBeNull()
    expect(hasSession()).toBe(false)
  })

  it.each([
    ['nickname', ['Ya existe una cuenta con este nickname.']],
    ['password_confirm', ['Las contraseñas no coinciden.']],
    ['password', ['Esta contraseña es demasiado común.']],
    ['email', ['Ya existe una cuenta con este email.']],
    ['nickname', 'Este campo no puede estar en blanco.'],
  ])('muestra y permite corregir el error de %s del backend', async (name, messages) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ [name]: messages }), { status: 400 }))
    const screen = mountRegistration()
    submit(screen)

    const input = screen.querySelector(`[name="${name}"]`)
    const error = screen.querySelector(`#${input.id}-error`)
    const message = Array.isArray(messages) ? messages[0] : messages
    await vi.waitFor(() => expect(error.textContent).toBe(message))
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(error.id)
    expect(document.activeElement).toBe(input)
    expect(screen.querySelector('[type="submit"]').disabled).toBe(false)
    expect(screen.querySelector('[role="status"]')).toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(hasSession()).toBe(false)

    input.dispatchEvent(new Event('input'))
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(error.classList.contains('hidden')).toBe(true)
  })

  it.each([
    [429, { detail: 'throttled' }, 'Has superado el número de registros.'],
    [500, null, 'No se ha podido crear la cuenta.'],
    [400, { non_field_errors: ['La contraseña no es válida.'] }, 'La contraseña no es válida.'],
  ])('muestra el error general %s y permite reintentar', async (status, body, message) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
    const screen = mountRegistration()
    submit(screen)
    await vi.waitFor(() => expect(screen.textContent).toContain(message))
    expect(screen.querySelector('[type="submit"]').disabled).toBe(false)
    expect(screen.querySelector('form')).not.toBeNull()
    expect(hasSession()).toBe(false)
  })

  it('permite reintentar tras un fallo de conexión', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const screen = mountRegistration()
    submit(screen)
    await vi.waitFor(() => expect(screen.textContent).toContain('Comprueba tu conexión'))
    expect(screen.querySelector('[type="submit"]').disabled).toBe(false)
    expect(hasSession()).toBe(false)
  })
})
