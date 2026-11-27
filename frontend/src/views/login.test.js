import { describe, expect, it, vi } from 'vitest'
import { loginScreen } from './acceso.js'
import { validateLogin } from './login.js'

function mount(screen = loginScreen()) {
  document.body.replaceChildren(screen)
  return screen
}

function fill(element, { email = '', password = '' } = {}) {
  element.querySelector('input[name="email"]').value = email
  element.querySelector('input[name="password"]').value = password
}

function submit(element) {
  element.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
}

function passwordToggle(element) {
  return element.querySelector('button[aria-label="Mostrar la contraseña"], button[aria-label="Ocultar la contraseña"]')
}

function dispatchCapsLock(input, enabled) {
  const event = new KeyboardEvent('keydown', { key: 'A', bubbles: true })
  Object.defineProperty(event, 'getModifierState', {
    value: (modifier) => modifier === 'CapsLock' && enabled,
  })
  input.dispatchEvent(event)
}

describe('validateLogin', () => {
  it('acepta un correo normalizado y una contraseña no vacía', () => {
    expect(
      validateLogin({ email: ' Persona@Example.com ', password: 'secreta' }),
    ).toEqual({
      ok: true,
      email: 'persona@example.com',
      password: 'secreta',
      errors: {},
    })
  })

  it('rechaza un correo inválido o una contraseña vacía', () => {
    expect(validateLogin({ email: 'no-es-correo', password: '' }).errors).toEqual({
      email: 'Introduce un correo válido.',
      password: 'Introduce tu contraseña.',
    })
  })
})

describe('loginScreen', () => {
  it('muestra la vista de iniciar sesión', () => {
    const element = mount()

    expect(element.querySelector('h1').textContent).toBe('Iniciar sesión')
    expect(element.className).toContain('w-full')
    expect(element.className).toContain('min-h-dvh')
    expect(element.textContent).toContain('HabitSquad')
    expect(element.textContent).toContain('Cumple tu hábito. Que no caiga la racha.')
    expect(element.textContent).toContain('Correo')
    expect(element.textContent).toContain('Contraseña')
    expect(element.querySelector('input[name="email"]').placeholder).toBe('tu@correo.com')
    expect(element.querySelector('input[name="password"]').placeholder).toBe(
      'Tu contraseña',
    )
    expect(element.querySelector('button[type="submit"]').textContent).toBe('Entrar')
    expect(element.textContent).toContain(
      'Después podrás crear un escuadrón o unirte a uno.',
    )

    const registerTab = [...element.querySelectorAll('a[data-link]')].find(
      (link) => link.textContent === 'Registrarme',
    )
    expect(registerTab.getAttribute('href')).toBe('/registro')
    expect(
      element.querySelector('a[aria-current="page"]').textContent,
    ).toBe('Iniciar sesión')
    expect(element.querySelector('a[href="/reenviar-verificacion"]')).toBeNull()
  })

  it('avisa si faltan el correo o la contraseña y no envía el formulario', () => {
    const onSubmit = vi.fn()
    const element = mount(loginScreen({ onSubmit }))
    submit(element)

    expect(onSubmit).not.toHaveBeenCalled()
    const alerts = [...element.querySelectorAll('[role="alert"]')]
    expect(alerts.map((alert) => alert.textContent)).toEqual([
      'Introduce tu correo.',
      'Introduce tu contraseña.',
    ])
  })

  it('entrega el correo normalizado y la contraseña cuando son válidos', () => {
    const onSubmit = vi.fn()
    const element = mount(loginScreen({ onSubmit }))
    fill(element, { email: ' Persona@Example.com ', password: 'secreta' })
    submit(element)

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'persona@example.com',
      password: 'secreta',
    })
  })

  it('muestra y oculta la contraseña', () => {
    const element = mount()
    const password = element.querySelector('input[name="password"]')
    const toggle = passwordToggle(element)

    expect(password.type).toBe('password')
    expect(toggle.textContent).toBe('Mostrar')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')

    toggle.click()
    expect(password.type).toBe('text')
    expect(toggle.textContent).toBe('Ocultar')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar la contraseña')

    toggle.click()
    expect(password.type).toBe('password')
    expect(toggle.textContent).toBe('Mostrar')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
  })

  it('muestra el aviso de sesión caducada', () => {
    const element = mount(
      loginScreen({
        notice: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
      }),
    )

    const status = element.querySelector('[role="status"]')
    expect(status.textContent).toBe('Tu sesión ha caducado. Vuelve a iniciar sesión.')
  })

  it('avisa de que están activadas las mayúsculas', () => {
    const element = mount()
    const password = element.querySelector('input[name="password"]')

    dispatchCapsLock(password, true)
    expect(element.textContent).toContain('Tienes activadas las mayúsculas.')

    dispatchCapsLock(password, false)
    expect(element.textContent).not.toContain('Tienes activadas las mayúsculas.')

    dispatchCapsLock(password, true)
    password.dispatchEvent(new FocusEvent('blur'))
    expect(element.textContent).not.toContain('Tienes activadas las mayúsculas.')
  })

  it('muestra el error del servidor y selecciona la contraseña', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new Error('El correo o la contraseña no son correctos.'),
    )
    const element = mount(loginScreen({ onSubmit }))
    const password = element.querySelector('input[name="password"]')

    fill(element, { email: 'persona@example.com', password: 'secreta' })
    submit(element)

    await vi.waitFor(() => {
      expect(element.textContent).toContain(
        'El correo o la contraseña no son correctos.',
      )
      expect(document.activeElement).toBe(password)
      expect(password.selectionStart).toBe(0)
      expect(password.selectionEnd).toBe('secreta'.length)
    })
    expect(element.querySelector('a[href="/reenviar-verificacion"]')).toBeNull()
  })

  it('no ofrece reenviar la verificación hasta que el error diga que falta verificar', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(
      new Error('El correo o la contraseña no son correctos, o falta verificar el correo.'),
    )
    const element = mount(loginScreen({ onSubmit }))

    expect(element.querySelector('a[href="/reenviar-verificacion"]')).toBeNull()

    fill(element, { email: 'persona@example.com', password: 'secreta' })
    submit(element)

    await vi.waitFor(() => {
      expect(element.querySelector('a[href="/reenviar-verificacion"]').textContent).toBe(
        'Reenviar correo de verificación',
      )
    })

    element.querySelector('input[name="email"]').dispatchEvent(new Event('input', { bubbles: true }))
    expect(element.querySelector('a[href="/reenviar-verificacion"]')).toBeNull()
  })
})
