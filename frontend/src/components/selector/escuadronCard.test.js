import { describe, expect, it } from 'vitest'
import { escuadronCard } from './escuadronCard.js'

function puntosLlenos(card) {
  return card.querySelectorAll('[aria-hidden="true"] > .bg-accent')
}

describe('escuadronCard', () => {
  it('enlaza con el panel del escuadrón', () => {
    const card = escuadronCard({ id: 7, nombre: 'Lectores nocturnos', miembros: 3 })

    expect(card.getAttribute('href')).toBe('/escuadrones/panel?id=7')
    expect(card.hasAttribute('data-link')).toBe(true)
    expect(card.getAttribute('aria-label')).toBe('Abrir panel de Lectores nocturnos')
  })

  it('muestra las iniciales, los miembros y las plazas que quedan', () => {
    const card = escuadronCard({ id: 7, nombre: 'Lectores nocturnos', miembros: 3 })

    expect(card.textContent).toBe('LNLectores nocturnos3 de 5 miembrosQuedan 2 plazasAbrir panel')
    expect(puntosLlenos(card)).toHaveLength(3)
  })

  it('avisa cuando el escuadrón está completo', () => {
    const card = escuadronCard({ id: 9, nombre: 'Sin azúcar', miembros: 5 })

    expect(card.textContent).toContain('Escuadrón completo')
    expect(puntosLlenos(card)).toHaveLength(5)
  })

  it('acepta otro número de plazas', () => {
    const card = escuadronCard({ id: 3, nombre: 'Pareja', miembros: 1, plazas: 2 })

    expect(card.textContent).toContain('1 de 2 miembros')
    expect(card.textContent).toContain('Queda 1 plaza')
  })

  it('limita los puntos decorativos para capacidades grandes sin alterar la ocupación escrita', () => {
    const card = escuadronCard({ id: 3, nombre: 'Grupo grande', miembros: 3, plazas: 100000 })
    expect(card.textContent).toContain('3 de 100000 miembros')
    expect(card.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(10)
  })
})
