import { describe, expect, it, vi } from 'vitest'
import { ApiError, requestPasswordReset } from '../api.js'
import { routes } from '../routes.js'
import { loginScreen } from './acceso.js'
import { recuperarContrasenaScreen } from './recuperarContrasena.js'

vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, requestPasswordReset: vi.fn() }
})

function mount(screen = recuperarContrasenaScreen()) {
  document.body.replaceChildren(screen)
  return screen
}

function fill(element, email) {
  element.querySelector('input[name="email"]').value = email
}

function submit(element) {
  element.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
}

describe('recuperarContrasenaScreen', () => {
  it('no envía un correo inválido', () => {
    const onSubmit = vi.fn()
    const element = mount(recuperarContrasenaScreen({ onSubmit }))

    fill(element, 'no-es-correo')
    submit(element)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(element.querySelector('[role="alert"]').textContent).toBe(
      'Introduce un correo válido.',
    )
  })

  it('no envía un correo vacío', () => {
    const onSubmit = vi.fn()
    const element = mount(recuperarContrasenaScreen({ onSubmit }))

    submit(element)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(element.querySelector('[role="alert"]').textContent).toBe(
      'Introduce tu correo.',
    )
  })

  it('envía el correo y confirma sin revelar si la cuenta existe', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const element = mount(recuperarContrasenaScreen({ onSubmit }))

    fill(element, ' Persona@Example.com ')
    submit(element)

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('persona@example.com')
      expect(element.querySelector('form')).toBeNull()
      expect(element.querySelector('[role="status"]').textContent).toContain(
        'Si hay una cuenta con persona@example.com, te hemos enviado un enlace.',
      )
      expect(element.textContent).toContain('Revisa también la carpeta de spam.')
    })
  })

  it('avisa si el servicio aún no está disponible (404) o hay demasiados intentos (429)', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('La recuperación de contraseña todavía no está disponible.'),
      )
      .mockRejectedValueOnce(
        new Error('Has hecho demasiados intentos. Espera un rato y vuelve a probar.'),
      )

    const element404 = mount(recuperarContrasenaScreen({ onSubmit }))
    fill(element404, 'persona@example.com')
    submit(element404)

    await vi.waitFor(() => {
      expect(element404.textContent).toContain(
        'La recuperación de contraseña todavía no está disponible.',
      )
      expect(element404.querySelector('form')).not.toBeNull()
    })

    const element429 = mount(recuperarContrasenaScreen({ onSubmit }))
    fill(element429, 'persona@example.com')
    submit(element429)

    await vi.waitFor(() => {
      expect(element429.textContent).toContain(
        'Has hecho demasiados intentos. Espera un rato y vuelve a probar.',
      )
      expect(element429.querySelector('form')).not.toBeNull()
    })
  })

  it('mientras envía, desactiva el botón y no envía dos veces', async () => {
    let terminar
    const onSubmit = vi.fn(() => new Promise((resolve) => { terminar = resolve }))
    const element = mount(recuperarContrasenaScreen({ onSubmit }))
    const boton = element.querySelector('button[type="submit"]')

    fill(element, 'persona@example.com')
    submit(element)
    submit(element)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(boton.disabled).toBe(true)
    expect(boton.textContent).toBe('Enviando…')

    terminar()
    await vi.waitFor(() => expect(element.querySelector('form')).toBeNull())
  })

  it('tras un error reactiva el botón y quita el aviso al escribir', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Fallo'))
    const element = mount(recuperarContrasenaScreen({ onSubmit }))
    const boton = element.querySelector('button[type="submit"]')

    fill(element, 'persona@example.com')
    submit(element)
    await vi.waitFor(() => expect(element.querySelector('form > [role="alert"]').textContent).toBe('Fallo'))
    expect(boton.disabled).toBe(false)
    expect(boton.textContent).toBe('Enviar enlace')

    element.querySelector('input[name="email"]').dispatchEvent(new Event('input'))
    expect(element.querySelector('form > [role="alert"]')).toBeNull()
  })

  it('permite volver a iniciar sesión', () => {
    const element = mount()
    const volver = [...element.querySelectorAll('a')].find((a) => a.textContent === 'Volver a iniciar sesión')
    expect(volver.getAttribute('href')).toBe('/login')
  })
})

describe('enlace de recuperación en el login', () => {
  it('el login enlaza con la recuperación de contraseña', () => {
    const element = mount(loginScreen())
    const link = [...element.querySelectorAll('a')].find((a) => a.textContent === '¿Has olvidado tu contraseña?')

    expect(link.getAttribute('href')).toBe('/recuperar-contrasena')
    expect(link.hasAttribute('data-link')).toBe(true)
    expect(element.querySelector('form').contains(link)).toBe(true)
  })
})

describe('ruta /recuperar-contrasena', () => {
  function mountRuta() {
    requestPasswordReset.mockReset()
    return mount(routes.find((route) => route.path === '/recuperar-contrasena').view())
  }

  it('pide el enlace a la API con el correo normalizado', async () => {
    const element = mountRuta()
    requestPasswordReset.mockResolvedValue(undefined)

    fill(element, ' Persona@Example.com ')
    submit(element)

    await vi.waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('persona@example.com'))
  })

  it.each([
    ['404', new ApiError(404), 'El envío de enlaces todavía no está disponible.'],
    ['429', new ApiError(429), 'Has hecho demasiados intentos. Espera un rato y vuelve a probar.'],
    ['sin conexión', new TypeError('Failed to fetch'), 'No se ha podido enviar el enlace. Comprueba tu conexión e inténtalo de nuevo.'],
  ])('traduce el error de la API (%s)', async (_, error, mensaje) => {
    const element = mountRuta()
    requestPasswordReset.mockRejectedValue(error)

    fill(element, 'persona@example.com')
    submit(element)

    await vi.waitFor(() => expect(element.querySelector('form > [role="alert"]').textContent).toBe(mensaje))
  })
})
