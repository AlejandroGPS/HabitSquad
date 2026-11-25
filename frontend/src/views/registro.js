const MIN_PASSWORD_LENGTH = 8

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  'password',
  'password1',
  'qwertyui',
  'contraseña',
])

const MESSAGES = {
  nicknameRequired: 'Introduce tu nickname.',
  emailRequired: 'Introduce tu email.',
  emailInvalid: 'Introduce un email válido.',
  passwordRequired: 'Introduce una contraseña.',
  passwordShort: 'La contraseña debe tener al menos 8 caracteres.',
  passwordNumeric: 'La contraseña no puede ser solo números.',
  passwordCommon: 'Esta contraseña es demasiado común.',
  passwordSimilar: 'La contraseña es demasiado parecida al email.',
  confirmationRequired: 'Confirma tu contraseña.',
  confirmationMismatch: 'Las contraseñas no coinciden.',
}

function tooSimilar(password, email) {
  const candidate = password.toLowerCase()
  const parts = email.split(/[^a-z0-9]+/i).filter((part) => part.length >= 4)
  return parts.some(
    (part) => candidate.includes(part) || part.includes(candidate),
  )
}

export function validateRegistration({
  email = '',
  nickname = '',
  password = '',
  password_confirm = '',
} = {}) {
  const errors = {}
  const normalizedEmail = String(email).trim().toLowerCase()
  const normalizedNickname = String(nickname).trim()
  const emailOk = EMAIL_PATTERN.test(normalizedEmail)

  if (!normalizedNickname) errors.nickname = MESSAGES.nicknameRequired

  if (!normalizedEmail) {
    errors.email = MESSAGES.emailRequired
  } else if (!emailOk) {
    errors.email = MESSAGES.emailInvalid
  }

  if (password === '') {
    errors.password = MESSAGES.passwordRequired
  } else if ([...password].length < MIN_PASSWORD_LENGTH) {
    errors.password = MESSAGES.passwordShort
  } else if (/^\d+$/.test(password)) {
    errors.password = MESSAGES.passwordNumeric
  } else if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.password = MESSAGES.passwordCommon
  } else if (emailOk && tooSimilar(password, normalizedEmail)) {
    errors.password = MESSAGES.passwordSimilar
  }

  if (password_confirm === '') {
    errors.password_confirm = MESSAGES.confirmationRequired
  } else if (password_confirm !== password) {
    errors.password_confirm = MESSAGES.confirmationMismatch
  }

  return {
    ok: Object.keys(errors).length === 0,
    email: normalizedEmail,
    nickname: normalizedNickname,
    password,
    password_confirm,
    errors,
  }
}

export { registroScreen } from './acceso.js'
