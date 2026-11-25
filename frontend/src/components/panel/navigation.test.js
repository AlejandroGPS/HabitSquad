import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, rememberSquad } from '../../session.js'
import { squadNavigation } from './navigation.js'

describe('squadNavigation', () => {
  beforeEach(() => {
    clearSession()
    sessionStorage.clear()
  })

  it('oculta Configuración hasta confirmar el rol y no muestra Racha', () => {
    const labels = squadNavigation().map(({ label }) => label)
    expect(labels).toEqual(['Escuadrón', 'Alertas', 'Mi hábito'])
  })

  it('conserva Configuración y el escuadrón al pasar a otras secciones', () => {
    rememberSquad('7')
    const items = squadNavigation(undefined, true)
    expect(items.find(({ id }) => id === 'configuracion').href).toBe('/escuadrones/configuracion?origen=7')
    expect(items.find(({ id }) => id === 'escuadron').href).toBe('/escuadrones/panel?id=7')
    expect(items.find(({ id }) => id === 'habito').href).toBe('/habito?escuadron=7')
  })

  it('recuerda el escuadrón al abrir el panel', () => {
    squadNavigation('12')
    expect(squadNavigation(undefined, true).find(({ id }) => id === 'configuracion').href).toBe(
      '/escuadrones/configuracion?origen=12',
    )
  })

  it('recordar un escuadrón no concede acceso de administrador', () => {
    rememberSquad('7')
    const items = squadNavigation()
    expect(items.some(({ id }) => id === 'configuracion')).toBe(false)
    expect(items.find(({ id }) => id === 'alertas').href).toBe('/alertas?escuadron=7')
  })
})
