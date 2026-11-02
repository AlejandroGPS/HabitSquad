import {
  ApiError,
  createSquad,
  joinSquad,
  login,
  logout,
  register,
  requestPasswordReset,
} from './api.js'
import { hasSession } from './session.js'
import { loginScreen, registroScreen } from './views/acceso.js'
import { crearEscuadronScreen } from './views/crearEscuadron.js'
import { habitoDiarioScreen } from './views/habitoDiario.js'
import { menuScreen } from './views/menu.js'
import { panelEscuadronScreen } from './views/panelEscuadron.js'
import { recuperarContrasenaScreen } from './views/recuperarContrasena.js'
import { screen } from './views/screen.js'
import { unirseEscuadronScreen } from './views/unirseEscuadron.js'
import { votarPruebaScreen } from './views/votarPrueba.js'

const backHome = [{ href: '/', label: 'Volver al inicio' }]

function loginErrorMessage(error) {
  if (error instanceof ApiError && error.status === 401) {
    return 'El correo o la contraseña no son correctos.'
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'Has hecho demasiados intentos. Espera un rato y vuelve a probar.'
  }
  return 'No se ha podido iniciar sesión. Comprueba tu conexión e inténtalo de nuevo.'
}

function firstMessage(value) {
  if (Array.isArray(value)) return String(value[0] ?? '').trim()
  if (typeof value === 'string') return value.trim()
  return ''
}

function registerErrorMessage(error) {
  if (error instanceof ApiError && error.status === 400) {
    const emailError = firstMessage(error.data?.email)
    if (emailError) return emailError
    const passwordError = firstMessage(error.data?.password)
    if (passwordError) return passwordError
    const detail = firstMessage(error.data?.detail)
    if (detail) return detail
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'Has superado el número de registros. Espera un rato y vuelve a probar.'
  }
  return 'No se ha podido crear la cuenta. Comprueba tu conexión e inténtalo de nuevo.'
}

function passwordResetErrorMessage(error) {
  if (error instanceof ApiError && error.status === 404) {
    return 'La recuperación de contraseña todavía no está disponible.'
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'Has hecho demasiados intentos. Espera un rato y vuelve a probar.'
  }
  return 'No se ha podido enviar el enlace. Comprueba tu conexión e inténtalo de nuevo.'
}

function createSquadErrorMessage(error) {
  const nameError = error instanceof ApiError ? error.data?.nombre?.[0] : null
  if (nameError) return nameError
  if (error instanceof ApiError && error.status === 401) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
  }
  return 'No se ha podido crear el escuadrón. Comprueba tu conexión e inténtalo de nuevo.'
}

function joinSquadErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return 'No se ha podido unir al escuadrón. Comprueba tu conexión e inténtalo de nuevo.'
  }
  if (error.status === 400) {
    return (
      error.data?.codigo_invitacion?.[0] ??
      'El código de invitación no es válido.'
    )
  }
  if (error.status === 404) {
    return (
      error.data?.detail ??
      'No se ha encontrado un escuadrón con ese código.'
    )
  }
  if (error.status === 409) {
    return error.data?.detail ?? 'Ya perteneces a este escuadrón.'
  }
  if (error.status === 401) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
  }
  return 'No se ha podido unir al escuadrón. Inténtalo de nuevo.'
}

function homeScreen(onLogout) {
  return menuScreen({ title: 'HabitSquad', onLogout })
}

function destinationAfterLogin() {
  const next = new URLSearchParams(window.location.search).get('next')
  if (!next?.startsWith('/') || next.startsWith('//')) return '/'

  let destination
  try {
    destination = new URL(next, window.location.origin)
  } catch {
    return '/'
  }
  if (destination.origin !== window.location.origin) return '/'

  const route = routes.find((entry) => entry.path === destination.pathname)
  if (!route?.private) return '/'
  return `${destination.pathname}${destination.search}${destination.hash}`
}

export const routes = [
  {
    path: '/',
    title: 'HabitSquad',
    private: true,
    view: ({ navigate } = {}) =>
      homeScreen(async () => {
        await logout()
        navigate('/login')
      }),
  },
  {
    path: '/login',
    title: 'Iniciar sesión',
    guestOnly: true,
    view: ({ navigate } = {}) =>
      loginScreen({
        notice:
          new URLSearchParams(window.location.search).get('sesion') === 'caducada'
            ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
            : null,
        onSubmit: async (credentials) => {
          try {
            await login(credentials)
          } catch (error) {
            throw new Error(loginErrorMessage(error), { cause: error })
          }
          navigate(destinationAfterLogin())
        },
      }),
  },
  {
    path: '/registro',
    title: 'Registrarme',
    guestOnly: true,
    view: ({ navigate } = {}) =>
      registroScreen({
        onSubmit: async (credentials) => {
          try {
            await register(credentials)
            await login(credentials)
          } catch (error) {
            throw new Error(registerErrorMessage(error), { cause: error })
          }
          navigate('/')
        },
      }),
  },
  {
    path: '/recuperar-contrasena',
    title: 'Recuperar contraseña',
    guestOnly: true,
    view: () =>
      recuperarContrasenaScreen({
        onSubmit: async (email) => {
          try {
            await requestPasswordReset(email)
          } catch (error) {
            throw new Error(passwordResetErrorMessage(error), { cause: error })
          }
        },
      }),
  },
  {
    path: '/menu',
    title: 'Menú principal',
    private: true,
    view: ({ navigate } = {}) => menuScreen({ onLogout: async () => {
      await logout()
      navigate('/login')
    } }),
  },
  {
    path: '/escuadrones/panel',
    title: 'Panel del escuadrón',
    private: true,
    view: () => panelEscuadronScreen(),
  },
  {
    path: '/habito',
    title: 'Mi hábito diario',
    private: true,
    view: () => habitoDiarioScreen(),
  },
  {
    path: '/escuadrones/votar',
    title: 'Votar prueba',
    // Demo con datos mock: la autorización se incorporará al conectar la API de votos.
    view: () => votarPruebaScreen(),
  },
  {
    path: '/escuadrones/nuevo',
    title: 'Crea tu escuadrón',
    private: true,
    view: () =>
      crearEscuadronScreen({
        onSubmit: async (nombre) => {
          try {
            return await createSquad(nombre)
          } catch (error) {
            throw new Error(createSquadErrorMessage(error), { cause: error })
          }
        },
      }),
  },
  {
    path: '/escuadrones/unirse',
    title: 'Únete a un escuadrón',
    private: true,
    view: () =>
      unirseEscuadronScreen({
        onSubmit: async (codigo) => {
          try {
            return await joinSquad(codigo)
          } catch (error) {
            throw new Error(joinSquadErrorMessage(error), { cause: error })
          }
        },
      }),
  },
]

export function guard(route) {
  if (route.private && !hasSession()) {
    const requestedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (requestedPath === '/') return '/login'
    return `/login?next=${encodeURIComponent(requestedPath)}`
  }
  if (route.guestOnly && hasSession()) return '/'
  return null
}

export const notFound = {
  title: 'Página no encontrada',
  view: () =>
    screen({
      title: 'Página no encontrada',
      description: 'La dirección no corresponde a ninguna pantalla.',
      links: backHome,
    }),
}
