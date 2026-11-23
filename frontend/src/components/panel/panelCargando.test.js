import { describe, expect, it } from 'vitest'
import { panelCargando } from './panelCargando.js'

describe('panelCargando', () => {
  it('pinta una tarjeta vacía por cada tarjeta del panel', () => {
    const tarjetas = panelCargando()

    expect(tarjetas).toHaveLength(7)
    expect(tarjetas.every((tarjeta) => tarjeta.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(tarjetas.every((tarjeta) => tarjeta.textContent === '' && tarjeta.querySelector('.hueco'))).toBe(true)
  })

  it('ocupa los mismos huecos de la rejilla que el panel cargado', () => {
    const [racha, , , semana, habito, miembros, invita] = panelCargando()

    expect(racha.classList.contains('row-span-2')).toBe(true)
    expect(habito.classList.contains('col-span-2')).toBe(true)
    expect(miembros.classList.contains('lg:col-span-3')).toBe(true)
    for (const soloWeb of [semana, invita]) {
      expect(soloWeb.classList.contains('hidden')).toBe(true)
      expect(soloWeb.classList.contains('lg:flex')).toBe(true)
    }
  })

  it('reserva una fila por día en la semana y tres miembros', () => {
    const [, , , semana, , miembros] = panelCargando()

    expect(semana.querySelectorAll('.items-center')).toHaveLength(7)
    expect(semana.querySelectorAll('.pl-14 .hueco')).toHaveLength(3)
    expect(miembros.querySelectorAll('.h-10.w-10')).toHaveLength(3)
  })
})
