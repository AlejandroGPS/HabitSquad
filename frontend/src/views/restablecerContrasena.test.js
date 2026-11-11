import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, confirmPasswordReset, requestPasswordReset } from '../api.js'
import { createRouter } from '../router.js'
import { guard, notFound, routes } from '../routes.js'
import { restablecerContrasenaScreen } from './restablecerContrasena.js'

vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  }
})

const PASSWORD = 'N3w!Secure-Password-497'
const ENLACE_CADUCADO = 'El enlace de recuperación no es válido o ha expirado.'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

function mount(element) {
  document.body.replaceChildren(element)
  return element
}

function fill(element, password, confirmation = password) {
  element.querySelector('[name="new_password"]').value = password
  element.querySelector('[name="new_password_confirm"]').value = confirmation
}

function submit(element) {
  element.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
}

const enlace = (element, texto) =>
  [...element.querySelectorAll('a')].find((a) => a.textContent.trim() === texto)
const boton = (element) => element.querySelector('button[type="submit"]')
const alerta = (element) => element.querySelector('form > [role="alert"]')

afterEach(() => {
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
})

describe('pantalla de nueva contraseña', () => {
  let onSubmit
  beforeEach(() => {
    onSubmit = vi.fn().mockResolvedValue(undefined)
  })

  it.each([
    ['sin uid', { token: '123' }],
    ['sin token', { uid: 'abc' }],
    ['sin uid ni token', {}],
  ])('%s avisa de que el enlace no es válido y ofrece pedir otro', (_, params) => {
    const element = mount(restablecerContrasenaScreen({ ...params, onSubmit }))

    expect(element.querySelector('form')).toBeNull()
    expect(element.querySelector('[role="status"]').textContent).toBe(
      'El enlace de recuperación no es válido.',
    )
    expect(enlace(element, 'Solicitar otro enlace').getAttribute('href')).toBe('/recuperar-contrasena')
  })

  it('pide la nueva contraseña dos veces', () => {
    const element = mount(restablecerContrasenaScreen({ uid: 'abc', token: '123', onSubmit }))

    for (const name of ['new_password', 'new_password_confirm']) {
      const input = element.querySelector(`[name="${name}"]`)
      expect(input.type).toBe('password')
      expect(input.required).toBe(true)
      expect(input.autocomplete).toBe('new-password')
    }
    expect(boton(element).textContent).toBe('Guardar contraseña')
    expect(enlace(element, 'Solicitar otro enlace').getAttribute('href')).toBe('/recuperar-contrasena')
  })

  it('no envía si las contraseñas no coinciden', () => {
    const element = mount(restablecerContrasenaScreen({ uid: 'abc', token: '123', onSubmit }))

    fill(element, PASSWORD, `${PASSWORD}x`)
    submit(element)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(alerta(element).textContent).toBe('Las contraseñas no coinciden.')
    expect(document.activeElement).toBe(element.querySelector('[name="new_password_confirm"]'))
  })

  it('el aviso se quita al volver a escribir', () => {
    const element = mount(restablecerContrasenaScreen({ uid: 'abc', token: '123', onSubmit }))
    fill(element, PASSWORD, 'otra')
    submit(element)
    expect(alerta(element)).not.toBeNull()

    element.querySelector('[name="new_password_confirm"]').dispatchEvent(new Event('input', { bubbles: true }))

    expect(alerta(element)).toBeNull()
  })

  it('mientras guarda, desactiva el botón y no envía dos veces', async () => {
    const pendiente = deferred()
    onSubmit.mockReturnValue(pendiente.promise)
    const element = mount(restablecerContrasenaScreen({ uid: 'abc', token: '123', onSubmit }))

    fill(element, PASSWORD)
    submit(element)
    submit(element)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ uid: 'abc', token: '123', newPassword: PASSWORD, confirmation: PASSWORD })
    expect(boton(element).disabled).toBe(true)
    expect(boton(element).textContent).toBe('Guardando…')

    pendiente.resolve()
    await vi.waitFor(() => expect(element.querySelector('form')).toBeNull())
  })

  it('tras guardar, confirma y ofrece ir a iniciar sesión', async () => {
    const element = mount(restablecerContrasenaScreen({ uid: 'abc', token: '123', onSubmit }))

    fill(element, PASSWORD)
    submit(element)

    await vi.waitFor(() => {
      expect(element.querySelector('[role="status"]').textContent).toBe(
        'Contraseña actualizada. Ya puedes iniciar sesión.',
      )
    })
    const login = enlace(element, 'Ir a iniciar sesión')
    expect(login.getAttribute('href')).toBe('/login')
    expect(login.hasAttribute('data-link')).toBe(true)
    expect(enlace(element, 'Solicitar otro enlace')).toBeUndefined()
    expect(document.activeElement).toBe(element.querySelector('[role="status"]').parentElement)
  })

  it('si falla, muestra el error y deja volver a intentarlo', async () => {
    onSubmit.mockRejectedValueOnce(new Error(ENLACE_CADUCADO))
    const element = mount(restablecerContrasenaScreen({ uid: 'abc', token: 'caducado', onSubmit }))

    fill(element, PASSWORD)
    submit(element)

    await vi.waitFor(() => expect(alerta(element).textContent).toBe(ENLACE_CADUCADO))
    expect(boton(element).disabled).toBe(false)
    expect(boton(element).textContent).toBe('Guardar contraseña')
    expect(enlace(element, 'Solicitar otro enlace').getAttribute('href')).toBe('/recuperar-contrasena')

    submit(element)
    await vi.waitFor(() => expect(element.querySelector('form')).toBeNull())
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })
})

describe('ruta /reset-password', () => {
  function mountRuta(url) {
    window.history.replaceState({}, '', url)
    const route = routes.find((entry) => entry.path === '/reset-password')
    return mount(route.view({ navigate: vi.fn() }))
  }

  beforeEach(() => {
    confirmPasswordReset.mockReset()
    requestPasswordReset.mockReset()
  })

  it('lee uid y token de la URL', async () => {
    confirmPasswordReset.mockResolvedValue(undefined)
    const element = mountRuta('/reset-password?uid=MQ&token=abc-123')

    fill(element, PASSWORD)
    submit(element)

    await vi.waitFor(() => {
      expect(confirmPasswordReset).toHaveBeenCalledWith({
        uid: 'MQ', token: 'abc-123', newPassword: PASSWORD, confirmation: PASSWORD,
      })
    })
  })

  it('sin token en la URL no llama a la API', () => {
    const element = mountRuta('/reset-password?uid=MQ')

    expect(element.querySelector('form')).toBeNull()
    expect(element.textContent).toContain('El enlace de recuperación no es válido.')
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })

  it.each([
    ['token inválido', 'invalido', { token: [ENLACE_CADUCADO] }, ENLACE_CADUCADO],
    ['token caducado', 'caducado', { token: [ENLACE_CADUCADO] }, ENLACE_CADUCADO],
    ['token ya usado', 'usado', { token: [ENLACE_CADUCADO] }, ENLACE_CADUCADO],
    ['uid inválido', 'abc', { uid: ['Usuario no válido.'] }, 'Usuario no válido.'],
    ['contraseña débil', 'abc', { new_password: ['Esta contraseña es demasiado común.'] }, 'Esta contraseña es demasiado común.'],
    ['confirmación distinta', 'abc', { new_password_confirm: ['Las contraseñas no coinciden.'] }, 'Las contraseñas no coinciden.'],
    ['400 sin detalle', 'abc', null, 'No se ha podido actualizar la contraseña. Revisa los datos e inténtalo de nuevo.'],
  ])('muestra el error de la API: %s', async (_, token, data, mensaje) => {
    confirmPasswordReset.mockRejectedValue(new ApiError(400, data))
    const element = mountRuta(`/reset-password?uid=MQ&token=${token}`)

    fill(element, PASSWORD)
    submit(element)

    await vi.waitFor(() => expect(alerta(element).textContent).toBe(mensaje))
    expect(element.querySelector('form')).not.toBeNull()
  })

  it.each([
    ['demasiados intentos (429)', new ApiError(429), 'Has hecho demasiados intentos. Espera un rato y vuelve a probar.'],
    ['sin conexión', new TypeError('Failed to fetch'), 'No se ha podido actualizar la contraseña. Inténtalo de nuevo.'],
  ])('muestra un aviso si hay %s', async (_, error, mensaje) => {
    confirmPasswordReset.mockRejectedValue(error)
    const element = mountRuta('/reset-password?uid=MQ&token=abc')

    fill(element, PASSWORD)
    submit(element)

    await vi.waitFor(() => expect(alerta(element).textContent).toBe(mensaje))
  })
})

describe('flujo completo con el enrutador', () => {
  let root
  let router

  beforeEach(() => {
    localStorage.clear()
    confirmPasswordReset.mockReset()
    requestPasswordReset.mockReset()
    document.body.innerHTML = '<div id="app"></div>'
    root = document.querySelector('#app')
    router = createRouter({ routes, notFound, root, guard })
  })

  afterEach(() => {
    router.stop()
  })

  function abrir(url) {
    window.history.replaceState({}, '', url)
    router.start()
  }

  it('desde el login se llega a pedir el enlace', async () => {
    requestPasswordReset.mockResolvedValue(undefined)
    abrir('/login')

    enlace(root, '¿Has olvidado tu contraseña?').click()
    expect(window.location.pathname).toBe('/recuperar-contrasena')
    expect(root.querySelector('h1').textContent).toBe('Recuperar contraseña')

    root.querySelector('input[name="email"]').value = 'Persona@Example.com'
    submit(root)

    await vi.waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith('persona@example.com')
      expect(root.querySelector('[role="status"]').textContent).toContain('te hemos enviado un enlace')
    })
  })

  it('tras cambiar la contraseña, el enlace lleva a iniciar sesión', async () => {
    confirmPasswordReset.mockResolvedValue(undefined)
    abrir('/reset-password?uid=MQ&token=abc')

    fill(root, PASSWORD)
    submit(root)
    await vi.waitFor(() => expect(enlace(root, 'Ir a iniciar sesión')).toBeDefined())

    enlace(root, 'Ir a iniciar sesión').click()
    expect(window.location.pathname).toBe('/login')
    expect(root.querySelector('h1').textContent).toBe('Iniciar sesión')
  })

  it('si el enlace ha caducado, se puede pedir otro', async () => {
    confirmPasswordReset.mockRejectedValue(new ApiError(400, { token: [ENLACE_CADUCADO] }))
    requestPasswordReset.mockResolvedValue(undefined)
    abrir('/reset-password?uid=MQ&token=caducado')

    fill(root, PASSWORD)
    submit(root)
    await vi.waitFor(() => expect(alerta(root).textContent).toBe(ENLACE_CADUCADO))

    enlace(root, 'Solicitar otro enlace').click()
    expect(window.location.pathname).toBe('/recuperar-contrasena')
    root.querySelector('input[name="email"]').value = 'persona@example.com'
    submit(root)

    await vi.waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('persona@example.com'))
  })
})
