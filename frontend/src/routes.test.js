import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  confirmEmailVerification,
  confirmPasswordReset,
  login,
  logout,
  register,
  requestEmailVerification,
} from './api.js'
import { guard, notFound, routes } from './routes.js'
import { hasSession, saveSession } from './session.js'

vi.mock('./api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmEmailVerification: vi.fn(),
    confirmPasswordReset: vi.fn(),
    requestEmailVerification: vi.fn(),
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
    (path, route) => {
      const element = route.view()
      const heading = element.querySelector('h1').textContent
      expect(heading).toBe(['/', '/presentacion'].includes(path) ? 'Cumple tu hábito. Que no caiga la racha.' : route.title)
    },
  )

  it('las pantallas enlazan con el enrutador mediante data-link', () => {
    const home = routes.find((route) => route.path === '/').view()
    const hrefs = [...home.querySelectorAll('a[data-link]')].map(
      (a) => new URL(a.getAttribute('href'), window.location.origin).pathname,
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
})

describe('sesión', () => {
  beforeEach(() => {
    localStorage.clear()
    login.mockReset()
    register.mockReset()
    logout.mockReset()
    confirmEmailVerification.mockReset()
    confirmPasswordReset.mockReset()
    requestEmailVerification.mockReset()
    window.history.replaceState({}, '', '/')
  })

  it('sin sesión las rutas privadas llevan a /login', () => {
    const privateRoute = routes.find((route) => route.path === '/escuadrones/nuevo')
    expect(guard(privateRoute)).toBe('/login')
  })

  it('sin sesión el inicio muestra la página de presentación', () => {
    const home = routes.find((route) => route.path === '/')

    expect(guard(home)).toBeNull()
    expect(home.view().querySelector('h1').textContent).toBe('Cumple tu hábito. Que no caiga la racha.')
  })

  it('con sesión el inicio muestra la pantalla de la app', () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    const home = routes.find((route) => route.path === '/')

    expect(guard(home)).toBeNull()
    expect(home.view().querySelector('h1').textContent).toBe('Mis escuadrones')
  })

  it('con sesión, /presentacion sigue mostrando la portada', () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    const presentacion = routes.find((route) => route.path === '/presentacion')

    expect(guard(presentacion)).toBeNull()
    expect(presentacion.view().querySelector('#como-funciona')).not.toBeNull()
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

    const privateRoute = routes.find((route) => route.path === '/escuadrones/nuevo')
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
        'El correo o la contraseña no son correctos, o falta verificar el correo.',
      )
    })
    expect(navigate).not.toHaveBeenCalled()
    expect(hasSession()).toBe(false)
  })

  it('un registro correcto pide verificar el correo antes de iniciar sesión', async () => {
    register.mockResolvedValue({ id: 1, email: 'persona@example.com' })
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
      expect(element.querySelector('[role="status"]').textContent).toContain('Cuenta creada')
    })
    expect(login).not.toHaveBeenCalled()
    expect(hasSession()).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('restablece la contraseña desde el enlace del correo', async () => {
    window.history.replaceState({}, '', '/reset-password?uid=abc&token=123')
    confirmPasswordReset.mockResolvedValue(undefined)
    const { element } = mount('/reset-password')
    const newPassword = 'N3w!Secure-Password-497'
    element.querySelector('[name="new_password"]').value = newPassword
    element.querySelector('[name="new_password_confirm"]').value = newPassword
    submit(element)

    await vi.waitFor(() => {
      expect(confirmPasswordReset).toHaveBeenCalledWith({
        uid: 'abc', token: '123', newPassword, confirmation: newPassword,
      })
      expect(element.querySelector('[role="status"]').textContent).toContain('Contraseña actualizada')
    })
    expect(element.querySelector('form')).toBeNull()
  })

  it('permite solicitar otro enlace de recuperación si el anterior ha caducado', async () => {
    window.history.replaceState({}, '', '/reset-password?uid=abc&token=expired')
    const message = 'El enlace de recuperación no es válido o ha expirado.'
    confirmPasswordReset.mockRejectedValue(new ApiError(400, { token: [message] }))
    const { element } = mount('/reset-password')
    element.querySelector('[name="new_password"]').value = 'N3w!Secure-Password-497'
    element.querySelector('[name="new_password_confirm"]').value = 'N3w!Secure-Password-497'
    submit(element)

    await vi.waitFor(() => {
      expect(element.textContent).toContain(message)
    })
    expect(element.querySelector('a[href="/recuperar-contrasena"]').textContent).toBe('Solicitar otro enlace')
  })

  it('confirma el enlace recibido y ofrece iniciar sesión', async () => {
    window.history.replaceState({}, '', '/verify-email?uid=abc&token=123')
    confirmEmailVerification.mockResolvedValue(undefined)
    const { element } = mount('/verify-email')
    submit(element)

    await vi.waitFor(() => {
      expect(confirmEmailVerification).toHaveBeenCalledWith({ uid: 'abc', token: '123' })
      expect(element.querySelector('[role="status"]').textContent).toContain('Correo verificado')
    })
    expect(login).not.toHaveBeenCalled()
  })

  it('permite pedir otro enlace si la verificación ha caducado', async () => {
    window.history.replaceState({}, '', '/verify-email?uid=abc&token=expired')
    confirmEmailVerification.mockRejectedValue(new ApiError(400))
    const { element } = mount('/verify-email')
    submit(element)

    await vi.waitFor(() => {
      expect(element.querySelector('[role="alert"]').textContent).toContain('ha caducado')
    })
    const resendPath = element.querySelector('a[href="/reenviar-verificacion"]').getAttribute('href')
    requestEmailVerification.mockResolvedValue(undefined)
    const resend = mount(resendPath).element
    resend.querySelector('input[name="email"]').value = 'Persona@Example.com'
    submit(resend)

    await vi.waitFor(() => {
      expect(requestEmailVerification).toHaveBeenCalledWith('persona@example.com')
      expect(resend.querySelector('[role="status"]').textContent).toContain('te hemos enviado un enlace')
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
