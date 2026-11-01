import { describe, expect, it } from 'vitest'
import { alertasBoton, escuadronResumen, rachaChip } from './cabecera.js'

describe('rachaChip', () => {
  it('muestra la racha con la llama, solo en web', () => {
    const chip = rachaChip({ racha: 12 })

    expect(chip.textContent).toBe('12')
    expect(chip.querySelector('svg')).not.toBeNull()
    expect(chip.classList.contains('lg:flex')).toBe(true)
  })

  it('empieza en 0 sin datos', () => {
    expect(rachaChip().textContent).toBe('0')
  })
})

it('alertasBoton tiene nombre accesible', () => {
  expect(alertasBoton().querySelector('.sr-only').textContent).toBe('Alertas')
})

describe('escuadronResumen', () => {
  it('muestra el avatar, el nombre y los miembros', () => {
    expect(escuadronResumen({ nombre: 'Los Inquebrantables', miembros: 3, plazas: 5 }).textContent).toBe(
      'LILos Inquebrantables3 de 5 miembros',
    )
  })

  it('usa 0 de 5 por defecto', () => {
    expect(escuadronResumen({ nombre: 'Nuevo' }).textContent).toContain('0 de 5 miembros')
  })
})
