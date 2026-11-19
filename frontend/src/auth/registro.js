import { loginWithPassword } from './login.js'

const REGISTER_URL = '/api/auth/register/'
export const MENU_PATH = '/escuadrones'

export const REGISTER_MESSAGES = {
  limited: 'Has superado el número de registros. Prueba más tarde.',
  failed: 'No se ha podido crear la cuenta. Inténtalo de nuevo.',
  sessionFailed:
    'La cuenta se ha creado, pero no se ha podido iniciar la sesión.',
}

function firstMessage(value) {
  if (Array.isArray(value)) return String(value[0] ?? '').trim()
  if (typeof value === 'string') return value.trim()
  return ''
}

async function readBody(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function registerWithPassword({ email, password }) {
  let response
  try {
    response = await fetch(REGISTER_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    return { ok: false, message: REGISTER_MESSAGES.failed }
  }

  if (response.status === 201) {
    const session = await loginWithPassword({ email, password })
    if (!session.ok) {
      return { ok: false, message: REGISTER_MESSAGES.sessionFailed }
    }
    return { ok: true, redirect: MENU_PATH }
  }

  if (response.status === 429) {
    return { ok: false, message: REGISTER_MESSAGES.limited }
  }

  if (response.status === 400) {
    const data = await readBody(response)
    const errors = {}
    const emailMessage = firstMessage(data?.email)
    const passwordMessage = firstMessage(data?.password)
    if (emailMessage) errors.email = emailMessage
    if (passwordMessage) errors.password = passwordMessage
    if (errors.email || errors.password) {
      return { ok: false, errors }
    }
    return {
      ok: false,
      message: firstMessage(data?.detail) || REGISTER_MESSAGES.failed,
    }
  }

  return { ok: false, message: REGISTER_MESSAGES.failed }
}
