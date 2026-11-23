import { describe, expect, it } from 'vitest'
import { panelCargando } from './panelCargando.js'

describe('panelCargando', () => {
  it('pinta una tarjeta vacía por cada tarjeta del panel', () => {
    const tarjetas = panelCargando()

    expect(tarjetas).toHaveLength(5)
    expect(tarjetas.every((tarjeta) => tarjeta.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(tarjetas.every((tarjeta) => tarjeta.textContent === '' && tarjeta.querySelector('.hueco'))).toBe(true)
  })

  it('ocupa los mismos huecos de la rejilla que el panel cargado y se ve también en el móvil', () => {
    const [resumen, habito, miembros, semana, invita] = panelCargando()

    expect(resumen.className).toContain('xl:col-span-2')
    expect(habito.className).not.toContain('col-span')
    expect(miembros.className).toContain('xl:col-span-2')
    expect(semana.className).not.toContain('col-span')
    expect(invita.className).toContain('lg:col-span-2 xl:col-span-3')
    expect(panelCargando().some((tarjeta) => tarjeta.classList.contains('hidden'))).toBe(false)
  })

  it('reserva tres miembros en la lista y en la semana', () => {
    const [, , miembros, semana] = panelCargando()

    expect(miembros.querySelectorAll('.h-11.w-11.rounded-full')).toHaveLength(3)
    expect(semana.querySelectorAll('.h-7.w-7')).toHaveLength(3)
    expect([...semana.querySelectorAll('.h-7.w-7')].every((cara) => cara.parentElement.children.length === 8)).toBe(true)
  })
})
