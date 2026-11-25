import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registroScreen, validateRegistration } from './registro.js'

const VALID_EMAIL = 'Person@Example.com'
const VALID_PASSWORD = 'S0mething!Secure-497'
const VALID_NICKNAME = 'HabitHero'
const VALID_REGISTRATION = {
  email: VALID_EMAIL,
  nickname: VALID_NICKNAME,
  password: VALID_PASSWORD,
  password_confirm: VALID_PASSWORD,
}

function mount(screen = registroScreen()) {
  document.body.replaceChildren(screen)
  return screen
}

function fill(element, {
  email = '',
  nickname = VALID_NICKNAME,
  password = '',
  password_confirm = password,
} = {}) {
  const emailInput = element.querySelector('input[name="email"]')
  const passwordInput = element.querySelector('input[name="password"]')
  emailInput.value = email
  passwordInput.value = password
  element.querySelector('[name="nickname"]').value = nickname
  element.querySelector('[name="password_confirm"]').value = password_confirm
  return { emailInput, passwordInput }
}

function submit(element) {
  element.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
}

function alerts(element) {
  return [...element.querySelectorAll('[role="alert"]')]
}

describe('validateRegistration', () => {
  it('recorta el nickname conservando sus mayúsculas', () => {
    expect(validateRegistration({ ...VALID_REGISTRATION, nickname: '  HabitHero  ' }))
      .toMatchObject({ ok: true, nickname: 'HabitHero', errors: {} })
  })

  it.each(['', '   ', undefined])('rechaza el nickname vacío %j', (nickname) => {
    const result = validateRegistration({ ...VALID_REGISTRATION, nickname })
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual({ nickname: 'Introduce tu nickname.' })
  })

  it.each([
    ['', 'Confirma tu contraseña.'],
    [undefined, 'Confirma tu contraseña.'],
    ['Otra!Contraseña-497', 'Las contraseñas no coinciden.'],
    [` ${VALID_PASSWORD}`, 'Las contraseñas no coinciden.'],
  ])('rechaza la confirmación %j', (password_confirm, message) => {
    const result = validateRegistration({ ...VALID_REGISTRATION, password_confirm })
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual({ password_confirm: message })
  })

  it('acepta un email normalizado y una contraseña que cumple las reglas', () => {
    const result = validateRegistration({
      ...VALID_REGISTRATION,
      email: `  ${VALID_EMAIL}  `,
      password: VALID_PASSWORD,
    })

    expect(result.ok).toBe(true)
    expect(result.email).toBe('person@example.com')
    expect(result.password).toBe(VALID_PASSWORD)
    expect(result.errors).toEqual({})
  })

  it('conserva los espacios de la contraseña', () => {
    const result = validateRegistration({
      ...VALID_REGISTRATION,
      email: VALID_EMAIL,
      password: `  ${VALID_PASSWORD}`,
      password_confirm: `  ${VALID_PASSWORD}`,
    })

    expect(result.ok).toBe(true)
    expect(result.password).toBe(`  ${VALID_PASSWORD}`)
  })

  it.each([
    ['', 'Introduce tu email.'],
    ['   ', 'Introduce tu email.'],
    ['not-an-email', 'Introduce un email válido.'],
    ['persona@', 'Introduce un email válido.'],
    ['persona@example', 'Introduce un email válido.'],
  ])('rechaza el email %j', (email, message) => {
    const result = validateRegistration({ ...VALID_REGISTRATION, email, password: VALID_PASSWORD })

    expect(result.ok).toBe(false)
    expect(result.errors.email).toBe(message)
    expect(result.errors.password).toBeUndefined()
  })

  it('exige la contraseña', () => {
    const result = validateRegistration({ ...VALID_REGISTRATION, email: VALID_EMAIL, password: '' })

    expect(result.ok).toBe(false)
    expect(result.errors.password).toBe('Introduce una contraseña.')
  })

  it('exige al menos 8 caracteres', () => {
    const result = validateRegistration({ ...VALID_REGISTRATION, email: VALID_EMAIL, password: 'Corta1!' })

    expect(result.errors.password).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    )
  })

  it('rechaza una contraseña solo numérica', () => {
    const result = validateRegistration({
      ...VALID_REGISTRATION,
      email: VALID_EMAIL,
      password: '1234567890123456',
    })

    expect(result.errors.password).toBe('La contraseña no puede ser solo números.')
  })

  it('rechaza una contraseña demasiado común', () => {
    const result = validateRegistration({
      ...VALID_REGISTRATION,
      email: VALID_EMAIL,
      password: 'password',
    })

    expect(result.errors.password).toBe('Esta contraseña es demasiado común.')
  })

  it('rechaza una contraseña demasiado parecida al email', () => {
    const result = validateRegistration({
      ...VALID_REGISTRATION,
      email: VALID_EMAIL,
      password: 'person99xx',
    })

    expect(result.errors.password).toBe(
      'La contraseña es demasiado parecida al email.',
    )
  })

  it('informa email y contraseña a la vez cuando ambos fallan', () => {
    const result = validateRegistration({ ...VALID_REGISTRATION, email: '', password: '' })

    expect(result.ok).toBe(false)
    expect(result.errors.email).toBe('Introduce tu email.')
    expect(result.errors.password).toBe('Introduce una contraseña.')
  })
})

describe('validación local del formulario de registro', () => {
  let element

  beforeEach(() => {
    element = mount()
  })

  it('muestra los cuatro campos del registro y el botón sin avisos', () => {
    expect(element.querySelector('h1').textContent).toBe('Registrarme')
    expect(element.querySelector('input[name="email"]').type).toBe('email')
    expect(element.querySelector('input[name="password"]').type).toBe('password')
    const nickname = element.querySelector('[name="nickname"]')
    expect(nickname.type).toBe('text')
    expect(nickname.autocomplete).toBe('nickname')
    expect(element.querySelector('label[for="registro-nickname"]').textContent).toBe('Nickname')
    const confirmation = element.querySelector('[name="password_confirm"]')
    expect(confirmation.type).toBe('password')
    expect(confirmation.autocomplete).toBe('new-password')
    expect(element.querySelector('label[for="registro-password-confirm"]').textContent)
      .toBe('Confirmar contraseña')
    expect(element.querySelector('button[type="submit"]').textContent).toBe('Crear cuenta')
    for (const alert of alerts(element)) {
      expect(alert.classList.contains('hidden')).toBe(true)
      expect(alert.className).toContain('text-red-600')
    }
  })

  it('muestra los avisos y no envía el formulario si los datos no valen', () => {
    const onSubmit = vi.fn()
    const screen = mount(registroScreen({ onSubmit }))
    fill(screen, { email: 'not-an-email', password: 'password' })
    submit(screen)

    expect(onSubmit).not.toHaveBeenCalled()
    const emailAlert = screen.querySelector('#registro-email-error')
    const passwordAlert = screen.querySelector('#registro-password-error')
    expect(emailAlert.classList.contains('hidden')).toBe(false)
    expect(emailAlert.textContent).toBe('Introduce un email válido.')
    expect(passwordAlert.classList.contains('hidden')).toBe(false)
    expect(passwordAlert.textContent).toBe('Esta contraseña es demasiado común.')
    expect(screen.querySelector('input[name="email"]').getAttribute('aria-invalid')).toBe(
      'true',
    )
    expect(
      screen.querySelector('input[name="password"]').getAttribute('aria-invalid'),
    ).toBe('true')
    expect(document.activeElement).toBe(screen.querySelector('input[name="email"]'))
  })

  it('retira solo el aviso del campo que se corrige', () => {
    fill(element, { email: '', password: '' })
    submit(element)
    const emailInput = element.querySelector('input[name="email"]')
    emailInput.value = VALID_EMAIL
    emailInput.dispatchEvent(new Event('input'))

    const emailAlert = element.querySelector('#registro-email-error')
    const passwordAlert = element.querySelector('#registro-password-error')
    expect(emailAlert.classList.contains('hidden')).toBe(true)
    expect(emailInput.getAttribute('aria-invalid')).toBe('false')
    expect(passwordAlert.classList.contains('hidden')).toBe(false)
  })

  it('entrega los cuatro campos normalizados si la validación local pasa', () => {
    const onSubmit = vi.fn()
    const screen = mount(registroScreen({ onSubmit }))
    fill(screen, { email: VALID_EMAIL, nickname: '  HabitHero  ', password: VALID_PASSWORD })
    submit(screen)

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'person@example.com',
      nickname: VALID_NICKNAME,
      password: VALID_PASSWORD,
      password_confirm: VALID_PASSWORD,
    })
    for (const alert of alerts(screen)) {
      expect(alert.classList.contains('hidden')).toBe(true)
    }
    for (const input of screen.querySelectorAll('input')) {
      expect(input.getAttribute('aria-invalid')).toBe('false')
    }
  })

  it.each([
    ['nickname', '   ', 'Introduce tu nickname.'],
    ['password_confirm', '', 'Confirma tu contraseña.'],
    ['password_confirm', 'Otra!Contraseña-497', 'Las contraseñas no coinciden.'],
  ])('bloquea el envío y enfoca %s cuando no es válido', (name, value, message) => {
    const onSubmit = vi.fn()
    const screen = mount(registroScreen({ onSubmit }))
    fill(screen, { ...VALID_REGISTRATION, [name]: value })
    submit(screen)

    const input = screen.querySelector(`[name="${name}"]`)
    const error = screen.querySelector(`#${input.id}-error`)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(error.id)
    expect(error.textContent).toBe(message)
    expect(error.classList.contains('hidden')).toBe(false)
    expect(document.activeElement).toBe(input)

    input.value = VALID_REGISTRATION[name]
    input.dispatchEvent(new Event('input'))
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(input.hasAttribute('aria-describedby')).toBe(false)
    expect(error.classList.contains('hidden')).toBe(true)
  })

  it('bloquea envíos repetidos mientras se crea la cuenta', async () => {
    let resolveRegistration
    const onSubmit = vi.fn(() => new Promise((resolve) => { resolveRegistration = resolve }))
    const screen = mount(registroScreen({ onSubmit }))
    fill(screen, VALID_REGISTRATION)
    submit(screen)
    submit(screen)

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(screen.querySelector('[type="submit"]').disabled).toBe(true)
    expect(screen.querySelector('[type="submit"]').textContent).toBe('Creando cuenta…')
    resolveRegistration()
    await vi.waitFor(() => expect(screen.querySelector('form')).toBeNull())
    expect(screen.querySelector('[role="status"]').textContent).toContain('verifica tu dirección')
  })

  it('muestra el error de email que devuelve el backend', async () => {
    const error = new Error('Ya existe una cuenta con este email.', {
      cause: { status: 400, data: { email: ['Ya existe una cuenta con este email.'] } },
    })
    const screen = mount(
      registroScreen({
        onSubmit: () => Promise.reject(error),
      }),
    )
    fill(screen, { email: VALID_EMAIL, password: VALID_PASSWORD })
    submit(screen)

    await vi.waitFor(() => {
      const emailAlert = screen.querySelector('#registro-email-error')
      expect(emailAlert.textContent).toBe('Ya existe una cuenta con este email.')
      expect(emailAlert.classList.contains('hidden')).toBe(false)
    })
    expect(screen.querySelector('input[name="email"]').getAttribute('aria-invalid')).toBe(
      'true',
    )
  })
})
