import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, rememberSquad } from '../../session.js'
import { squadNavigation } from './navigation.js'

describe('squadNavigation', () => {
  beforeEach(() => {
    clearSession()
    sessionStorage.clear()
  })

  it('incluye Configuración en el menú lateral aunque no haya escuadrón', () => {
    const labels = squadNavigation().map(({ label }) => label)
    expect(labels).toEqual(['Escuadrón', 'Racha', 'Alertas', 'Mi hábito', 'Configuración'])
    expect(squadNavigation().filter(({ sidebarHidden }) => !sidebarHidden).map(({ label }) => label))
      .toEqual(['Escuadrón', 'Mi hábito', 'Configuración'])
  })

  it('conserva Configuración y el escuadrón al pasar a otras secciones', () => {
    rememberSquad('7')
    const items = squadNavigation()
    expect(items.find(({ id }) => id === 'configuracion').href).toBe('/escuadrones/configuracion?origen=7')
    expect(items.find(({ id }) => id === 'escuadron').href).toBe('/escuadrones/panel?id=7')
    expect(items.find(({ id }) => id === 'habito').href).toBe('/habito?escuadron=7')
  })

  it('recuerda el escuadrón al abrir el panel', () => {
    squadNavigation('12')
    expect(squadNavigation().find(({ id }) => id === 'configuracion').href).toBe(
      '/escuadrones/configuracion?origen=12',
    )
  })
})
