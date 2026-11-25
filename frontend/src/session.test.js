import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, getSession, hasSession, rememberSquad, rememberedSquad, saveSession } from './session.js'

const STORAGE_KEY = 'habitsquad.session'
const SQUAD_KEY = 'habitsquad.escuadron'

describe('session', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('sin datos no hay sesión', () => {
    expect(getSession()).toBeNull()
    expect(hasSession()).toBe(false)
  })

  it('guarda y recupera access y refresh', () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })

    expect(getSession()).toEqual({
      access: 'access-token',
      refresh: 'refresh-token',
    })
    expect(hasSession()).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({
      access: 'access-token',
      refresh: 'refresh-token',
    })
  })

  it('borra la sesión del almacenamiento local', () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    rememberSquad('7')
    clearSession()

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(SQUAD_KEY)).toBeNull()
    expect(getSession()).toBeNull()
    expect(hasSession()).toBe(false)
    expect(rememberedSquad()).toBeNull()
  })

  it('recuerda el escuadrón seleccionado', () => {
    rememberSquad('7')
    expect(rememberedSquad()).toBe('7')
    rememberSquad('no-vale')
    expect(rememberedSquad()).toBe('7')
  })

  it('ignora una sesión guardada corrupta', () => {
    localStorage.setItem(STORAGE_KEY, '{no-es-json')

    expect(getSession()).toBeNull()
    expect(hasSession()).toBe(false)
  })

  it('ignora una sesión incompleta', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ access: 'solo-access' }))
    expect(getSession()).toBeNull()
    expect(hasSession()).toBe(false)

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ refresh: 'solo-refresh' }))
    expect(getSession()).toBeNull()
    expect(hasSession()).toBe(false)
  })
})
