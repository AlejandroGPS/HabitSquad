import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, login, logout, register } from './api.js'
import { guard, notFound, routes } from './routes.js'
import { clearSession, hasSession, saveSession } from './session.js'

vi.mock('./api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
  }
})

function mount(routePath, navigate = vi.fn()) {
  const route = routes.find((entry) => entry.path === routePath)
  const element = route.view({ navigate })
  document.body.replaceChildren(element)
  return { element, navigate }
}

function fillLogin(element, { email, password }) {
  element.querySelector('input[name="email"]').value = email
  element.querySelector('input[name="password"]').value = password
}

function submit(element) {
  element.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
}

describe('routes', () => {
  it.each(routes.map((route) => [route.path, route]))(
    '%s pinta una pantalla con su título',
    (_path, route) => {
      const element = route.view()
      const heading = route.path === '/escuadrones/votar' ? 'Prueba de Laura' : route.title
      expect(element.querySelector('h1').textContent).toBe(heading)
    },
  )

  it('las pantallas enlazan con el enrutador mediante data-link', () => {
    const home = routes.find((route) => route.path === '/').view()
    const hrefs = [...home.querySelectorAll('a[data-link]')].map((a) =>
      a.getAttribute('href'),
    )
    const paths = routes.map((route) => route.path)
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.every((href) => paths.includes(href))).toBe(true)
  })

  it('la pantalla de no encontrada tiene título y enlace al inicio', () => {
    const element = notFound.view()
    expect(element.querySelector('h1').textContent).toBe(notFound.title)
    expect(element.querySelector('a[data-link]').getAttribute('href')).toBe('/')
  })

  it('permite abrir la demo de votación con datos mock sin iniciar sesión', () => {
    clearSession()
    const voteRoute = routes.find((route) => route.path === '/escuadrones/votar')

    expect(guard(voteRoute)).toBeNull()
    expect(voteRoute.view().querySelector('h1').textContent).toBe('Prueba de Laura')
  })
})

describe('sesión', () => {
  beforeEach(() => {
    localStorage.clear()
    login.mockReset()
    register.mockReset()
    logout.mockReset()
  })

  it('sin sesión las rutas privadas llevan a /login', () => {
    const privateRoute = routes.find((route) => route.path === '/')
    expect(guard(privateRoute)).toBe('/login')
  })

  it('con sesión, /login y /registro llevan al inicio', () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })

    const loginRoute = routes.find((route) => route.path === '/login')
    const registroRoute = routes.find((route) => route.path === '/registro')

    expect(guard(loginRoute)).toBe('/')
    expect(guard(registroRoute)).toBe('/')
  })

  it('con sesión las rutas privadas no redirigen', () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })

    const privateRoute = routes.find((route) => route.path === '/')
    expect(guard(privateRoute)).toBeNull()
  })

  it('un login correcto guarda los tokens y abre el inicio', async () => {
    login.mockImplementation(async () => {
      saveSession({ access: 'access-token', refresh: 'refresh-token' })
    })
    const { element, navigate } = mount('/login')

    fillLogin(element, {
      email: ' Persona@Example.com ',
      password: 'secreta',
    })
    submit(element)

    await vi.waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'persona@example.com',
        password: 'secreta',
      })
      expect(hasSession()).toBe(true)
      expect(navigate).toHaveBeenCalledWith('/')
    })
  })

  it('traduce el error 401 del login', async () => {
    login.mockRejectedValue(new ApiError(401, { detail: 'No active account' }))
    const { element, navigate } = mount('/login')

    fillLogin(element, { email: 'persona@example.com', password: 'mala' })
    submit(element)

    await vi.waitFor(() => {
      expect(element.textContent).toContain(
        'El correo o la contraseña no son correctos.',
      )
    })
    expect(navigate).not.toHaveBeenCalled()
    expect(hasSession()).toBe(false)
  })

  it('un registro correcto guarda los tokens y abre el inicio', async () => {
    register.mockResolvedValue({ id: 1, email: 'persona@example.com' })
    login.mockImplementation(async () => {
      saveSession({ access: 'access-token', refresh: 'refresh-token' })
    })
    const { element, navigate } = mount('/registro')

    fillLogin(element, {
      email: ' Persona@Example.com ',
      password: 'S0mething!Secure-497',
    })
    submit(element)

    await vi.waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: 'persona@example.com',
        password: 'S0mething!Secure-497',
      })
      expect(login).toHaveBeenCalledWith({
        email: 'persona@example.com',
        password: 'S0mething!Secure-497',
      })
      expect(hasSession()).toBe(true)
      expect(navigate).toHaveBeenCalledWith('/')
    })
  })

  it('traduce el error 400 de email repetido en el registro', async () => {
    register.mockRejectedValue(
      new ApiError(400, { email: ['Ya existe una cuenta con este email.'] }),
    )
    const { element, navigate } = mount('/registro')

    fillLogin(element, {
      email: 'persona@example.com',
      password: 'S0mething!Secure-497',
    })
    submit(element)

    await vi.waitFor(() => {
      expect(element.textContent).toContain(
        'Ya existe una cuenta con este email.',
      )
    })
    expect(navigate).not.toHaveBeenCalled()
    expect(hasSession()).toBe(false)
  })

  it('traduce el error 429 del registro', async () => {
    register.mockRejectedValue(new ApiError(429, { detail: 'throttled' }))
    const { element, navigate } = mount('/registro')

    fillLogin(element, {
      email: 'persona@example.com',
      password: 'S0mething!Secure-497',
    })
    submit(element)

    await vi.waitFor(() => {
      expect(element.textContent).toContain(
        'Has superado el número de registros. Espera un rato y vuelve a probar.',
      )
    })
    expect(navigate).not.toHaveBeenCalled()
    expect(hasSession()).toBe(false)
  })

  it('traduce el error 429 del login', async () => {
    login.mockRejectedValue(new ApiError(429, { detail: 'throttled' }))
    const { element, navigate } = mount('/login')

    fillLogin(element, { email: 'persona@example.com', password: 'secreta' })
    submit(element)

    await vi.waitFor(() => {
      expect(element.textContent).toContain(
        'Has hecho demasiados intentos. Espera un rato y vuelve a probar.',
      )
    })
    expect(navigate).not.toHaveBeenCalled()
    expect(hasSession()).toBe(false)
  })

  it('cerrar sesión llama a logout y vuelve a /login', async () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    logout.mockResolvedValue(undefined)
    const { element, navigate } = mount('/')

    const logoutButton = [...element.querySelectorAll('button')].find(
      (button) => button.textContent === 'Cerrar sesión',
    )
    logoutButton.click()

    await vi.waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith('/login')
    })
  })
})
