import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api.js'
import { saveSession } from './session.js'
import { conectarEscuadron, urlEscuadron } from './tiempoReal.js'

class SocketFalso extends EventTarget {
  constructor(url) {
    super()
    this.url = url
    this.enviados = []
    this.cierre = null
  }

  send(datos) {
    this.enviados.push(JSON.parse(datos))
  }

  close(code, reason) {
    this.cierre = { code, reason }
  }

  abrir() {
    this.dispatchEvent(new Event('open'))
  }

  recibir(datos) {
    this.dispatchEvent(new MessageEvent('message', { data: typeof datos === 'string' ? datos : JSON.stringify(datos) }))
  }

  cerrarDesdeServidor(code) {
    this.dispatchEvent(Object.assign(new Event('close'), { code }))
  }

  autenticar() {
    this.abrir()
    this.recibir({ tipo: 'autenticado', escuadron_id: 7 })
  }
}

describe('urlEscuadron', () => {
  it('usa wss con HTTPS y ws con HTTP, en el mismo dominio que la app', () => {
    expect(urlEscuadron(7, { protocol: 'https:', host: 'habitsquad.example' }))
      .toBe('wss://habitsquad.example/ws/escuadrones/7/')
    expect(urlEscuadron('12', { protocol: 'http:', host: 'localhost:5173' }))
      .toBe('ws://localhost:5173/ws/escuadrones/12/')
  })

  it('por defecto toma el dominio de la página', () => {
    expect(urlEscuadron(3)).toBe(`ws://${window.location.host}/ws/escuadrones/3/`)
  })
})

describe('conectarEscuadron', () => {
  let sockets
  let estados
  let opciones
  let conexion

  const ultimo = () => sockets.at(-1)

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    saveSession({ access: 'access-1', refresh: 'refresh-1' })
    sockets = []
    estados = []
    opciones = {
      alActualizar: vi.fn(),
      alSuscribirse: vi.fn(),
      alCambiarEstado: (estado) => estados.push(estado),
      crearSocket: (url) => {
        const socket = new SocketFalso(url)
        sockets.push(socket)
        return socket
      },
      renovarSesion: vi.fn(async () => saveSession({ access: 'access-2', refresh: 'refresh-2' })),
    }
  })

  afterEach(() => {
    conexion?.cerrar()
    conexion = null
    vi.useRealTimers()
    localStorage.clear()
  })

  function conectar() {
    conexion = conectarEscuadron(7, opciones)
    return conexion
  }

  it('abre el canal del escuadrón y se autentica con el access JWT al abrirse', () => {
    conectar()
    expect(sockets).toHaveLength(1)
    expect(ultimo().url).toBe(`ws://${window.location.host}/ws/escuadrones/7/`)
    expect(ultimo().enviados).toEqual([])
    ultimo().abrir()
    expect(ultimo().enviados).toEqual([{ tipo: 'autenticar', access: 'access-1' }])
    expect(estados).toEqual(['conectando'])
  })

  it('al autenticarse queda en directo y avisa para volver a pedir el panel', () => {
    conectar()
    ultimo().autenticar()
    expect(estados).toEqual(['conectando', 'conectado'])
    expect(opciones.alSuscribirse).toHaveBeenCalledOnce()
    expect(opciones.alActualizar).not.toHaveBeenCalled()
  })

  it('pasa cada panel.actualizado y descarta los mensajes que no entiende', () => {
    conectar()
    ultimo().autenticar()
    const evento = { tipo: 'panel.actualizado', escuadron_id: 7, motivo: 'voto_emitido', registro_id: 45 }
    ultimo().recibir(evento)
    ultimo().recibir('esto no es JSON')
    ultimo().recibir({ tipo: 'otro' })
    ultimo().recibir('null')
    expect(opciones.alActualizar).toHaveBeenCalledOnce()
    expect(opciones.alActualizar).toHaveBeenCalledWith(evento)
  })

  it('sin sesión no abre ninguna conexión', () => {
    localStorage.clear()
    conectar()
    expect(sockets).toHaveLength(0)
    expect(estados).toEqual(['desconectado'])
  })

  it('si el navegador no puede crear el WebSocket se queda desconectado', () => {
    opciones.crearSocket = () => { throw new SyntaxError('URL no válida') }
    conectar()
    expect(estados).toEqual(['conectando', 'desconectado'])
    vi.advanceTimersByTime(60_000)
    expect(estados).toEqual(['conectando', 'desconectado'])
  })

  it('si se corta, reconecta esperando cada vez el doble hasta 30 s', () => {
    conectar()
    const esperas = []
    for (let intento = 0; intento < 7; intento += 1) {
      const antes = sockets.length
      ultimo().cerrarDesdeServidor(1006)
      let esperado = 0
      while (sockets.length === antes) {
        vi.advanceTimersByTime(1000)
        esperado += 1000
      }
      esperas.push(esperado)
    }
    expect(esperas).toEqual([1000, 2000, 4000, 8000, 16_000, 30_000, 30_000])
    expect(estados).toEqual(['conectando', 'reconectando'])
  })

  it('al volver a conectar se suscribe otra vez, avisa para refrescar y reinicia la espera', () => {
    conectar()
    ultimo().autenticar()
    ultimo().cerrarDesdeServidor(1006)
    vi.advanceTimersByTime(1000)
    ultimo().cerrarDesdeServidor(1006)
    vi.advanceTimersByTime(2000)
    expect(sockets).toHaveLength(3)
    ultimo().autenticar()
    expect(estados).toEqual(['conectando', 'conectado', 'reconectando', 'conectado'])
    expect(opciones.alSuscribirse).toHaveBeenCalledTimes(2)

    ultimo().cerrarDesdeServidor(1012)
    vi.advanceTimersByTime(999)
    expect(sockets).toHaveLength(3)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(4)
  })

  it('con 4401 renueva la sesión y se autentica con el access nuevo', async () => {
    conectar()
    ultimo().abrir()
    ultimo().cerrarDesdeServidor(4401)
    expect(estados).toEqual(['conectando', 'reconectando'])
    expect(opciones.renovarSesion).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(sockets).toHaveLength(2))
    ultimo().abrir()
    expect(ultimo().enviados).toEqual([{ tipo: 'autenticar', access: 'access-2' }])
    ultimo().recibir({ tipo: 'autenticado', escuadron_id: 7 })
    expect(estados.at(-1)).toBe('conectado')
  })

  it('si rechaza también el access recién renovado, deja de intentarlo', async () => {
    conectar()
    ultimo().cerrarDesdeServidor(4401)
    await vi.waitFor(() => expect(sockets).toHaveLength(2))
    ultimo().cerrarDesdeServidor(4401)
    expect(estados.at(-1)).toBe('desconectado')
    expect(opciones.renovarSesion).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(60_000)
    expect(sockets).toHaveLength(2)
  })

  it('tras un corte normal, un 4401 posterior vuelve a renovar la sesión', async () => {
    conectar()
    ultimo().cerrarDesdeServidor(4401)
    await vi.waitFor(() => expect(sockets).toHaveLength(2))
    ultimo().cerrarDesdeServidor(1006)
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(3)
    ultimo().cerrarDesdeServidor(4401)
    expect(opciones.renovarSesion).toHaveBeenCalledTimes(2)
    expect(estados).not.toContain('desconectado')
  })

  it('si la sesión ya no se puede renovar, se queda desconectado', async () => {
    opciones.renovarSesion.mockRejectedValue(new ApiError(401))
    conectar()
    ultimo().cerrarDesdeServidor(4401)
    await vi.waitFor(() => expect(estados.at(-1)).toBe('desconectado'))
    vi.advanceTimersByTime(60_000)
    expect(sockets).toHaveLength(1)
  })

  it('si la renovación falla por la red, vuelve a intentarlo más tarde', async () => {
    opciones.renovarSesion.mockRejectedValue(new TypeError('Failed to fetch'))
    conectar()
    ultimo().cerrarDesdeServidor(4401)
    await Promise.resolve()
    await Promise.resolve()
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(2)
    expect(estados).toEqual(['conectando', 'reconectando'])
  })

  it('al recuperar la red o volver a la app reconecta sin esperar', () => {
    conectar()
    ultimo().cerrarDesdeServidor(1006)
    window.dispatchEvent(new Event('online'))
    expect(sockets).toHaveLength(2)

    ultimo().cerrarDesdeServidor(1006)
    const visibilidad = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sockets).toHaveLength(2)
    visibilidad.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sockets).toHaveLength(3)
    visibilidad.mockRestore()

    window.dispatchEvent(new Event('online'))
    expect(sockets).toHaveLength(3)
  })

  it('cerrar() termina la conexión con 1000 y no vuelve a conectar', () => {
    conectar()
    ultimo().autenticar()
    const socket = ultimo()
    conexion.cerrar()
    expect(socket.cierre).toEqual({ code: 1000, reason: 'salida del panel' })
    socket.recibir({ tipo: 'panel.actualizado', escuadron_id: 7, motivo: 'miembro_se_unio' })
    socket.cerrarDesdeServidor(1000)
    window.dispatchEvent(new Event('online'))
    vi.advanceTimersByTime(60_000)
    expect(sockets).toHaveLength(1)
    expect(opciones.alActualizar).not.toHaveBeenCalled()
    expect(estados).toEqual(['conectando', 'conectado'])
    conexion.cerrar()
  })

  it('cerrar() mientras espera para reconectar cancela el intento', () => {
    conectar()
    ultimo().cerrarDesdeServidor(1006)
    conexion.cerrar()
    vi.advanceTimersByTime(60_000)
    expect(sockets).toHaveLength(1)
  })

  it('cerrar() mientras renueva la sesión no vuelve a abrir', async () => {
    let renovar
    opciones.renovarSesion = vi.fn(() => new Promise((resolve) => { renovar = resolve }))
    conectar()
    ultimo().cerrarDesdeServidor(4401)
    conexion.cerrar()
    renovar()
    await Promise.resolve()
    expect(sockets).toHaveLength(1)
  })
})
