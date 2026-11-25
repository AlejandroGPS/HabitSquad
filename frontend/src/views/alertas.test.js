import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api.js'
import { clearSession, rememberSquad } from '../session.js'
import { alertasScreen } from './alertas.js'

function almacenFalso(inicial = {}) {
  const datos = new Map(Object.entries(inicial))
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    datos,
  }
}

function avisosFalsos(estado = 'desactivado') {
  return {
    consultar: vi.fn().mockResolvedValue(estado),
    activar: vi.fn().mockResolvedValue('activado'),
    desactivar: vi.fn().mockResolvedValue('desactivado'),
  }
}

async function montar({ estado, avisos = avisosFalsos(estado), perfil = { nombre: 'Ana', hora_aviso: '21:30' }, almacen = almacenFalso(), squad = { miembros: [{ es_usuario: true, es_administrador: true }] } } = {}) {
  const getProfile = vi.fn(() => (perfil instanceof Error ? Promise.reject(perfil) : Promise.resolve(perfil)))
  const getSquad = vi.fn(() => squad instanceof Error ? Promise.reject(squad) : Promise.resolve(squad))
  const screen = alertasScreen({ onLogout: vi.fn(), api: { getProfile, getSquad }, avisos, almacen })
  document.body.replaceChildren(screen)
  await new Promise((resolve) => setTimeout(resolve))
  return { screen, avisos, almacen, getProfile, getSquad }
}

const titulo = (screen) => screen.querySelector('h2').textContent
const botones = (screen) => [...screen.querySelectorAll('section button')].map((boton) => boton.textContent)
const pulsar = (screen, texto) => [...screen.querySelectorAll('section button')].find((boton) => boton.textContent === texto).click()
const estadoTexto = (screen) => screen.querySelector('[role="status"]').textContent
const errorTexto = (screen) => screen.querySelector('[role="alert"]').textContent

beforeEach(() => {
  clearSession()
  window.history.replaceState({}, '', '/alertas')
})

afterEach(() => {
  document.body.replaceChildren()
  clearSession()
  window.history.replaceState({}, '', '/')
})

describe('alertasScreen', () => {
  it('es la sección Alertas de la navegación', async () => {
    const { screen } = await montar()

    expect([...screen.querySelectorAll('[aria-current="page"]')].map((item) => item.textContent)).toContain('Alertas')
    expect(screen.querySelector('h1').textContent).toBe('Alertas')
    expect([...screen.querySelector('aside nav').children].map((item) => item.textContent)).not.toContain('Configuración')
  })

  it('recupera el escuadrón recordado y comprueba el rol antes de mostrar Configuración', async () => {
    rememberSquad('7')
    const { screen, getSquad } = await montar()
    expect(getSquad).toHaveBeenCalledWith('7')
    expect(screen.querySelector('aside a[href="/escuadrones/configuracion?origen=7"]')).not.toBeNull()
    expect(screen.querySelector('nav.lg\\:hidden a[href="/escuadrones/configuracion?origen=7"]')).not.toBeNull()
  })

  it.each([
    { miembros: [{ es_usuario: true, es_administrador: false }, { es_usuario: false, es_administrador: true }] },
    new ApiError(403),
  ])('oculta Configuración si no confirma permisos en el escuadrón recordado', async (squad) => {
    rememberSquad('7')
    const { screen } = await montar({ squad })
    expect(screen.querySelector('a[href^="/escuadrones/configuracion"]')).toBeNull()
    expect(screen.querySelector('aside a[href="/escuadrones/panel?id=7"]')).not.toBeNull()
  })

  it('da prioridad al escuadrón de la URL sobre el recordado', async () => {
    rememberSquad('7')
    window.history.replaceState({}, '', '/alertas?escuadron=9')
    const { screen, getSquad } = await montar()
    expect(getSquad).toHaveBeenCalledWith('9')
    expect(screen.querySelector('aside a[href="/escuadrones/configuracion?origen=9"]')).not.toBeNull()
  })

  it('mientras comprueba los avisos no ofrece acciones', () => {
    const avisos = { ...avisosFalsos(), consultar: vi.fn(() => new Promise(() => {})) }
    const screen = alertasScreen({ api: { getProfile: () => new Promise(() => {}) }, avisos, almacen: almacenFalso() })

    expect(screen.querySelector('h2').textContent).toBe('Que no se te pase la prueba')
    expect(screen.textContent).toContain('Comprobando los avisos de este navegador…')
    expect(botones(screen)).toEqual([])
  })

  it('muestra cómo llega el aviso con el mismo texto que envía el servidor', async () => {
    const { screen } = await montar()
    const muestra = screen.querySelector('figure')

    expect(muestra.querySelector('figcaption').textContent).toBe('Así te llegará')
    expect(muestra.textContent).toContain('Todavía no has subido la prueba de hoy.')
  })

  it('enseña la hora de aviso del perfil y enlaza a cambiarla', async () => {
    const { screen, getProfile } = await montar()
    const enlace = [...screen.querySelectorAll('a[data-link]')].find((item) => item.textContent === 'Cambiar hora')

    expect(screen.textContent).toContain('21:30')
    expect(screen.textContent).toContain('Cada uno elige su hora en el perfil.')
    expect(enlace.getAttribute('href')).toBe('/perfil/editar#recordatorio')
    expect(getProfile).toHaveBeenCalledOnce()
  })

  it('si no carga el perfil lo dice en la tarjeta de la hora', async () => {
    const { screen } = await montar({ perfil: new TypeError('Failed to fetch') })

    expect(screen.textContent).toContain('No se ha podido cargar tu hora. Vuelve a entrar en un rato.')
  })

  it('sin avisos ofrece activarlos o dejarlo para luego', async () => {
    const { screen } = await montar({ estado: 'desactivado' })

    expect(titulo(screen)).toBe('Que no se te pase la prueba')
    expect(botones(screen)).toEqual(['Activar avisos', 'Ahora no'])
  })

  it('al activar desactiva los botones mientras tanto y confirma al terminar', async () => {
    let terminar
    const avisos = { ...avisosFalsos('desactivado'), activar: vi.fn(() => new Promise((resolve) => { terminar = resolve })) }
    const { screen } = await montar({ avisos })

    pulsar(screen, 'Activar avisos')
    expect(botones(screen)).toEqual(['Activando…', 'Ahora no'])
    expect([...screen.querySelectorAll('section button')].every((boton) => boton.disabled)).toBe(true)
    screen.querySelector('section button').click()
    expect(avisos.activar).toHaveBeenCalledOnce()

    terminar('activado')
    await vi.waitFor(() => expect(titulo(screen)).toBe('Avisos activados'))
    expect(estadoTexto(screen)).toBe('Avisos activados en este navegador.')
    expect(botones(screen)).toEqual(['Desactivar avisos'])
    expect(document.activeElement).toBe(screen.querySelector('h2'))
  })

  it('si se cierra la petición de permiso sin elegir no confirma nada', async () => {
    const avisos = avisosFalsos('desactivado')
    avisos.activar.mockResolvedValue('desactivado')
    const { screen } = await montar({ avisos })

    pulsar(screen, 'Activar avisos')
    await vi.waitFor(() => expect(botones(screen)).toEqual(['Activar avisos', 'Ahora no']))
    expect(estadoTexto(screen)).toBe('')
  })

  it('si se bloquea el permiso explica cómo permitirlo y deja volver a comprobar', async () => {
    const avisos = avisosFalsos('desactivado')
    avisos.activar.mockResolvedValue('bloqueado')
    const { screen } = await montar({ avisos })

    pulsar(screen, 'Activar avisos')
    await vi.waitFor(() => expect(titulo(screen)).toBe('Has bloqueado los avisos'))
    expect(screen.textContent).toContain('permite las notificaciones de HabitSquad en los ajustes del navegador')
    expect(botones(screen)).toEqual(['Volver a comprobar'])

    avisos.consultar.mockResolvedValue('activado')
    pulsar(screen, 'Volver a comprobar')
    await vi.waitFor(() => expect(titulo(screen)).toBe('Avisos activados'))
  })

  it('si falla la comprobación sigue bloqueado y lo dice', async () => {
    const avisos = avisosFalsos('bloqueado')
    const { screen } = await montar({ avisos })

    avisos.consultar.mockRejectedValue(new TypeError('Failed to fetch'))
    pulsar(screen, 'Volver a comprobar')
    await vi.waitFor(() => expect(errorTexto(screen)).toBe('No se han podido comprobar los avisos. Comprueba la conexión e inténtalo de nuevo.'))
    expect(titulo(screen)).toBe('Has bloqueado los avisos')
  })

  it('si el servidor no tiene avisos configurados lo explica y sigue sin activar', async () => {
    const avisos = avisosFalsos('desactivado')
    avisos.activar.mockRejectedValue(new ApiError(503, { detail: 'La clave pública VAPID no está configurada.' }))
    const { screen } = await montar({ avisos })

    pulsar(screen, 'Activar avisos')
    await vi.waitFor(() => expect(errorTexto(screen)).toBe('Los avisos no están disponibles ahora mismo. Inténtalo más tarde.'))
    expect(botones(screen)).toEqual(['Activar avisos', 'Ahora no'])
  })

  it('si falla la conexión al activar pide reintentarlo', async () => {
    const avisos = avisosFalsos('desactivado')
    avisos.activar.mockRejectedValue(new TypeError('Failed to fetch'))
    const { screen } = await montar({ avisos })

    pulsar(screen, 'Activar avisos')
    await vi.waitFor(() => expect(errorTexto(screen)).toBe('No se han podido activar los avisos. Comprueba la conexión e inténtalo de nuevo.'))
  })

  it('«Ahora no» se recuerda en este navegador hasta que se activan', async () => {
    const almacen = almacenFalso()
    const primera = await montar({ almacen })

    pulsar(primera.screen, 'Ahora no')
    expect(titulo(primera.screen)).toBe('Sin avisos por ahora')
    expect(botones(primera.screen)).toEqual(['Activar avisos'])
    expect(document.activeElement).toBe(primera.screen.querySelector('h2'))

    const segunda = await montar({ almacen })
    expect(titulo(segunda.screen)).toBe('Sin avisos por ahora')

    pulsar(segunda.screen, 'Activar avisos')
    await vi.waitFor(() => expect(titulo(segunda.screen)).toBe('Avisos activados'))
    expect(almacen.datos.size).toBe(0)
  })

  it('con los avisos activados deja desactivarlos', async () => {
    const { screen, avisos } = await montar({ estado: 'activado' })

    expect(titulo(screen)).toBe('Avisos activados')
    pulsar(screen, 'Desactivar avisos')
    expect(botones(screen)).toEqual(['Desactivando…'])

    await vi.waitFor(() => expect(estadoTexto(screen)).toBe('Avisos desactivados.'))
    expect(avisos.desactivar).toHaveBeenCalledOnce()
    expect(botones(screen)).toEqual(['Activar avisos', 'Ahora no'])
  })

  it('si no se pueden desactivar siguen activados', async () => {
    const avisos = avisosFalsos('activado')
    avisos.desactivar.mockRejectedValue(new TypeError('Failed to fetch'))
    const { screen } = await montar({ avisos })

    pulsar(screen, 'Desactivar avisos')
    await vi.waitFor(() => expect(errorTexto(screen)).toBe('No se han podido desactivar los avisos. Comprueba la conexión e inténtalo de nuevo.'))
    expect(botones(screen)).toEqual(['Desactivar avisos'])
  })

  it('en un navegador sin Web Push explica cómo recibirlos', async () => {
    const { screen } = await montar({ estado: 'no-soportado' })

    expect(titulo(screen)).toBe('Este navegador no admite avisos')
    expect(screen.textContent).toContain('añade HabitSquad a la pantalla de inicio')
    expect(botones(screen)).toEqual([])
  })

  it('sin service worker indica que no están disponibles', async () => {
    const { screen } = await montar({ estado: 'no-disponible' })

    expect(titulo(screen)).toBe('Los avisos no están disponibles')
    expect(botones(screen)).toEqual([])
  })

  it('si falla la consulta inicial ofrece activarlos', async () => {
    const avisos = avisosFalsos()
    avisos.consultar.mockRejectedValue(new Error('roto'))
    const { screen } = await montar({ avisos })

    await vi.waitFor(() => expect(botones(screen)).toEqual(['Activar avisos', 'Ahora no']))
  })
})
