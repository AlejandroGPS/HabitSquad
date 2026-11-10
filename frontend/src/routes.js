import {
  ApiError,
  confirmEmailVerification,
  confirmPasswordReset,
  createSquad,
  joinSquad,
  login,
  logout,
  register,
  requestEmailVerification,
  requestPasswordReset,
} from './api.js'
import { hasSession } from './session.js'
import { loginScreen, registroScreen } from './views/acceso.js'
import { crearEscuadronScreen } from './views/crearEscuadron.js'
import { menuScreen } from './views/menu.js'
import { habitoDiarioScreen } from './views/habitoDiario.js'
import { panelSeleccionadoScreen } from './views/panelSeleccionado.js'
import { presentacionScreen } from './views/presentacion.js'
import { recuperarContrasenaScreen, reenviarVerificacionScreen } from './views/recuperarContrasena.js'
import { restablecerContrasenaScreen } from './views/restablecerContrasena.js'
import { screen } from './views/screen.js'
import { unirseEscuadronScreen } from './views/unirseEscuadron.js'
import { verificarCorreoScreen } from './views/verificarCorreo.js'

const backHome = [{ href: '/', label: 'Volver al inicio' }]

function loginErrorMessage(error) {
  if (error instanceof ApiError && error.status === 401) {
    return 'El correo o la contraseña no son correctos, o falta verificar el correo.'
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

function emailLinkErrorMessage(error) {
  if (error instanceof ApiError && error.status === 404) {
    return 'El envío de enlaces todavía no está disponible.'
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'Has hecho demasiados intentos. Espera un rato y vuelve a probar.'
  }
  return 'No se ha podido enviar el enlace. Comprueba tu conexión e inténtalo de nuevo.'
}

function passwordResetErrorMessage(error) {
  if (error instanceof ApiError && error.status === 400) {
    return (
      firstMessage(error.data?.token) ||
      firstMessage(error.data?.uid) ||
      firstMessage(error.data?.new_password) ||
      firstMessage(error.data?.new_password_confirm) ||
      'No se ha podido actualizar la contraseña. Revisa los datos e inténtalo de nuevo.'
    )
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'Has hecho demasiados intentos. Espera un rato y vuelve a probar.'
  }
  return 'No se ha podido actualizar la contraseña. Inténtalo de nuevo.'
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

// Solo rutas internas: evita que ?siguiente= mande al usuario a otra web tras iniciar sesión.
export function destinoTrasAcceso() {
  const destino = new URLSearchParams(window.location.search).get('siguiente') ?? ''
  return /^\/(?![/\\])/.test(destino) ? destino : '/'
}

export const routes = [
  {
    path: '/',
    title: 'HabitSquad',
    view: ({ navigate } = {}) =>
      hasSession()
        ? menuScreen({ title: 'HabitSquad', onLogout: async () => {
          await logout()
          navigate('/login')
        } })
        : presentacionScreen({ navigate }),
  },
  {
    path: '/escuadrones/panel',
    title: 'Panel del escuadrón',
    private: true,
    view: ({ navigate } = {}) => panelSeleccionadoScreen({ navigate }),
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
          navigate(destinoTrasAcceso())
        },
      }),
  },
  {
    path: '/registro',
    title: 'Registrarme',
    guestOnly: true,
    view: () =>
      registroScreen({
        onSubmit: async (credentials) => {
          try {
            await register(credentials)
          } catch (error) {
            throw new Error(registerErrorMessage(error), { cause: error })
          }
        },
      }),
  },
  {
    path: '/verify-email',
    title: 'Verificar correo',
    view: () => {
      const params = new URLSearchParams(window.location.search)
      return verificarCorreoScreen({
        uid: params.get('uid'),
        token: params.get('token'),
        onConfirm: async (credentials) => {
          try {
            await confirmEmailVerification(credentials)
          } catch (error) {
            const message = error.status === 400
              ? 'El enlace de verificación no es válido o ha caducado.'
              : error.status === 429
                ? 'Has hecho demasiados intentos. Espera un rato y vuelve a probar.'
                : 'No se ha podido verificar el correo. Inténtalo de nuevo.'
            throw new Error(message, { cause: error })
          }
        },
      })
    },
  },
  {
    path: '/reenviar-verificacion',
    title: 'Reenviar correo de verificación',
    view: () =>
      reenviarVerificacionScreen({
        onSubmit: async (email) => {
          try {
            await requestEmailVerification(email)
          } catch (error) {
            throw new Error(emailLinkErrorMessage(error), { cause: error })
          }
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
            throw new Error(emailLinkErrorMessage(error), { cause: error })
          }
        },
      }),
  },
  {
    path: '/reset-password',
    title: 'Restablecer contraseña',
    view: () => {
      const params = new URLSearchParams(window.location.search)
      return restablecerContrasenaScreen({
        uid: params.get('uid'),
        token: params.get('token'),
        onSubmit: async (credentials) => {
          try {
            await confirmPasswordReset(credentials)
          } catch (error) {
            throw new Error(passwordResetErrorMessage(error), { cause: error })
          }
        },
      })
    },
  },
  {
    path: '/habito',
    title: 'Tu hábito diario',
    private: true,
    view: ({ navigate } = {}) => habitoDiarioScreen({ navigate }),
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
        codigo: new URLSearchParams(window.location.search).get('codigo') ?? '',
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
    const destino = `${window.location.pathname}${window.location.search}`
    return destino === '/' ? '/login' : `/login?siguiente=${encodeURIComponent(destino)}`
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
