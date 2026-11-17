import { describe, expect, it } from 'vitest'
import { panelCargando } from './panelCargando.js'

describe('panelCargando', () => {
  it('pinta una tarjeta vacía por cada tarjeta del panel', () => {
    const tarjetas = panelCargando()

    expect(tarjetas).toHaveLength(6)
    expect(tarjetas.every((tarjeta) => tarjeta.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(tarjetas.every((tarjeta) => tarjeta.textContent === '' && tarjeta.querySelector('.hueco'))).toBe(true)
  })

  it('ocupa los mismos huecos de la rejilla que el panel cargado', () => {
    const [hoy, racha, habito, semana, miembros, invita] = panelCargando()
    const clases = (tarjeta, ...nombres) => nombres.every((nombre) => tarjeta.classList.contains(nombre))

    expect(clases(hoy, 'col-span-2', 'lg:col-span-3')).toBe(true)
    expect(clases(racha, 'col-span-2', 'lg:col-span-1')).toBe(true)
    expect(clases(habito, 'col-span-2')).toBe(true)
    expect(clases(semana, 'hidden', 'lg:flex', 'lg:col-span-2')).toBe(true)
    expect(clases(miembros, 'col-span-2', 'lg:col-span-3')).toBe(true)
    expect(clases(invita, 'col-span-2', 'lg:col-span-1')).toBe(true)
  })

  it('reserva la semana del usuario, tres filas en la semana del escuadrón y tres miembros', () => {
    const [, , habito, semana, miembros] = panelCargando()

    expect(habito.querySelectorAll('.h-7.w-7')).toHaveLength(7)
    expect(semana.querySelectorAll('.grid-cols-7')).toHaveLength(4)
    expect(miembros.querySelectorAll('.h-10.w-10')).toHaveLength(3)
  })
})
