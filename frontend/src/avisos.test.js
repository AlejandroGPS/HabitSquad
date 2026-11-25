import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api.js'
import { claveAplicacion, crearAvisos } from './avisos.js'

const CLAVE = 'BAECAwQ' // bytes 4, 1, 2, 3, 4 en base64 URL-safe y sin relleno

function suscripcionFalsa({ endpoint = 'https://push.example/abc', clave = claveAplicacion(CLAVE) } = {}) {
  return {
    endpoint,
    options: { applicationServerKey: clave.buffer },
    toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: 'p256', auth: 'auth' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }
}

function navegadorFalso({ permiso = 'default', respuesta = 'granted', suscripcion = null, conServiceWorker = true } = {}) {
  const pushManager = {
    actual: suscripcion,
    getSubscription: vi.fn(async () => pushManager.actual),
    subscribe: vi.fn(async () => {
      pushManager.actual = suscripcionFalsa({ endpoint: 'https://push.example/nueva' })
      return pushManager.actual
    }),
  }
  const Notification = {
    permission: permiso,
    requestPermission: vi.fn(async () => {
      Notification.permission = respuesta
      return respuesta
    }),
  }
  const entorno = {
    Notification,
    PushManager: function PushManager() {},
    navigator: { serviceWorker: { ready: conServiceWorker ? Promise.resolve({ pushManager }) : new Promise(() => {}) } },
  }
  const api = {
    getVapidPublicKey: vi.fn().mockResolvedValue(CLAVE),
    savePushSubscription: vi.fn().mockResolvedValue({ creado: true }),
    deletePushSubscription: vi.fn().mockResolvedValue(undefined),
  }
  return { entorno, api, pushManager, Notification, avisos: crearAvisos({ entorno, api, espera: 50 }) }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('claveAplicacion', () => {
  it('convierte la clave VAPID en base64 URL-safe a bytes', () => {
    expect([...claveAplicacion(CLAVE)]).toEqual([4, 1, 2, 3, 4])
    expect([...claveAplicacion('-_8')]).toEqual([251, 255])
  })
})

describe('avisos: consultar', () => {
  it('sin Web Push en el navegador no está soportado', async () => {
    const avisos = crearAvisos({ entorno: { navigator: {} } })
    await expect(avisos.consultar()).resolves.toBe('no-soportado')
    await expect(avisos.activar()).resolves.toBe('no-soportado')
    await expect(avisos.desactivar()).resolves.toBe('no-soportado')
  })

  it('con el permiso denegado está bloqueado', async () => {
    const { avisos } = navegadorFalso({ permiso: 'denied' })
    await expect(avisos.consultar()).resolves.toBe('bloqueado')
  })

  it('si el service worker no llega a estar listo no está disponible', async () => {
    vi.useFakeTimers()
    const { avisos } = navegadorFalso({ conServiceWorker: false })
    const estado = avisos.consultar()
    await vi.advanceTimersByTimeAsync(50)
    await expect(estado).resolves.toBe('no-disponible')
  })

  it('sin suscripción está desactivado', async () => {
    const { avisos, api } = navegadorFalso({ permiso: 'granted' })
    await expect(avisos.consultar()).resolves.toBe('desactivado')
    expect(api.savePushSubscription).not.toHaveBeenCalled()
  })

  it('con suscripción y permiso está activado y la vuelve a enviar al servidor', async () => {
    const suscripcion = suscripcionFalsa()
    const { avisos, api } = navegadorFalso({ permiso: 'granted', suscripcion })
    await expect(avisos.consultar()).resolves.toBe('activado')
    expect(api.savePushSubscription).toHaveBeenCalledWith(suscripcion.toJSON())
  })

  it('sigue activado aunque el servidor no responda al reenviarla', async () => {
    const { avisos, api } = navegadorFalso({ permiso: 'granted', suscripcion: suscripcionFalsa() })
    api.savePushSubscription.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(avisos.consultar()).resolves.toBe('activado')
  })
})

describe('avisos: activar', () => {
  it('pide permiso, se suscribe con la clave VAPID y registra la suscripción', async () => {
    const { avisos, api, pushManager, Notification } = navegadorFalso()
    await expect(avisos.activar()).resolves.toBe('activado')
    expect(Notification.requestPermission).toHaveBeenCalledOnce()
    expect(pushManager.subscribe).toHaveBeenCalledOnce()
    const [{ userVisibleOnly, applicationServerKey }] = pushManager.subscribe.mock.calls[0]
    expect(userVisibleOnly).toBe(true)
    expect([...applicationServerKey]).toEqual([4, 1, 2, 3, 4])
    expect(api.savePushSubscription).toHaveBeenCalledWith(pushManager.actual.toJSON())
  })

  it('con el permiso ya concedido no lo vuelve a pedir', async () => {
    const { avisos, Notification } = navegadorFalso({ permiso: 'granted' })
    await expect(avisos.activar()).resolves.toBe('activado')
    expect(Notification.requestPermission).not.toHaveBeenCalled()
  })

  it('si se rechaza el permiso queda bloqueado y no se suscribe', async () => {
    const { avisos, api, pushManager } = navegadorFalso({ respuesta: 'denied' })
    await expect(avisos.activar()).resolves.toBe('bloqueado')
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(api.getVapidPublicKey).not.toHaveBeenCalled()
  })

  it('si se cierra la petición de permiso sin elegir sigue desactivado', async () => {
    const { avisos, pushManager } = navegadorFalso({ respuesta: 'default' })
    await expect(avisos.activar()).resolves.toBe('desactivado')
    expect(pushManager.subscribe).not.toHaveBeenCalled()
  })

  it('reutiliza la suscripción del navegador si es de la misma clave', async () => {
    const suscripcion = suscripcionFalsa()
    const { avisos, api, pushManager } = navegadorFalso({ permiso: 'granted', suscripcion })
    await expect(avisos.activar()).resolves.toBe('activado')
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(suscripcion.unsubscribe).not.toHaveBeenCalled()
    expect(api.savePushSubscription).toHaveBeenCalledWith(suscripcion.toJSON())
  })

  it('si el servidor cambió de clave VAPID, rehace la suscripción', async () => {
    const vieja = suscripcionFalsa({ clave: new Uint8Array([9, 9, 9]) })
    const { avisos, pushManager } = navegadorFalso({ permiso: 'granted', suscripcion: vieja })
    await expect(avisos.activar()).resolves.toBe('activado')
    expect(vieja.unsubscribe).toHaveBeenCalledOnce()
    expect(pushManager.subscribe).toHaveBeenCalledOnce()
  })

  it('si el servidor no tiene clave VAPID falla con 503 sin suscribirse', async () => {
    const { avisos, api, pushManager } = navegadorFalso({ permiso: 'granted' })
    api.getVapidPublicKey.mockRejectedValue(new ApiError(503))
    await expect(avisos.activar()).rejects.toMatchObject({ status: 503 })
    expect(pushManager.subscribe).not.toHaveBeenCalled()
  })

  it('si no se puede registrar en el servidor, deshace la suscripción del navegador', async () => {
    const { avisos, api, pushManager } = navegadorFalso({ permiso: 'granted' })
    api.savePushSubscription.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(avisos.activar()).rejects.toThrow('Failed to fetch')
    expect(pushManager.actual.unsubscribe).toHaveBeenCalledOnce()
  })

  it('sin service worker no está disponible', async () => {
    vi.useFakeTimers()
    const { avisos, api } = navegadorFalso({ permiso: 'granted', conServiceWorker: false })
    const estado = avisos.activar()
    await vi.advanceTimersByTimeAsync(50)
    await expect(estado).resolves.toBe('no-disponible')
    expect(api.getVapidPublicKey).not.toHaveBeenCalled()
  })
})

describe('avisos: desactivar', () => {
  it('borra la suscripción en el servidor y en el navegador', async () => {
    const suscripcion = suscripcionFalsa()
    const { avisos, api } = navegadorFalso({ permiso: 'granted', suscripcion })
    await expect(avisos.desactivar()).resolves.toBe('desactivado')
    expect(api.deletePushSubscription).toHaveBeenCalledWith('https://push.example/abc')
    expect(suscripcion.unsubscribe).toHaveBeenCalledOnce()
  })

  it('sin suscripción no llama al servidor', async () => {
    const { avisos, api } = navegadorFalso({ permiso: 'granted' })
    await expect(avisos.desactivar()).resolves.toBe('desactivado')
    expect(api.deletePushSubscription).not.toHaveBeenCalled()
  })

  it('si el servidor falla, el navegador sigue suscrito', async () => {
    const suscripcion = suscripcionFalsa()
    const { avisos, api } = navegadorFalso({ permiso: 'granted', suscripcion })
    api.deletePushSubscription.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(avisos.desactivar()).rejects.toThrow('Failed to fetch')
    expect(suscripcion.unsubscribe).not.toHaveBeenCalled()
  })
})
