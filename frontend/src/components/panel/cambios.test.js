import { describe, expect, it } from 'vitest'
import { animarCambios } from './cambios.js'
import { rachaChip } from './cabecera.js'
import { hoyCard } from './hoyCard.js'
import { miembrosCard } from './miembrosCard.js'
import { rachaCard } from './rachaCard.js'

const ana = { id: 1, nombre: 'Ana', esUsuario: true, habito: 'Leer', estado: 'cumplido' }
const laura = { id: 2, nombre: 'Laura', esUsuario: false, habito: 'Correr 5 km', estado: 'pendiente' }
const pablo = { id: 3, nombre: 'Pablo', esUsuario: false, habito: 'Ir al gimnasio', estado: undefined }

function pintar({ racha, miembros }) {
  const nodos = {
    rachaTarjeta: rachaCard({ racha }),
    chip: rachaChip({ racha }),
    hoy: hoyCard({ miembros }),
    miembrosTarjeta: miembrosCard({ miembros }),
  }
  return {
    nodos,
    numero: nodos.rachaTarjeta.querySelector('[data-racha]'),
    valor: nodos.hoy.querySelector('[data-valor]'),
    filas: [...nodos.miembrosTarjeta.querySelectorAll('li')],
    barras: [...nodos.hoy.querySelector('[data-barras]').children],
  }
}

function animar(antes, ahora) {
  const pintado = pintar(ahora)
  animarCambios(antes, ahora, pintado.nodos)
  return pintado
}

const clasesVivo = (nodo) => [...nodo.classList].filter((clase) => clase.startsWith('vivo-'))

describe('animarCambios', () => {
  it('no anima nada si no cambia nada', () => {
    const datos = { racha: 3, miembros: [ana, laura, pablo] }
    const { nodos } = animar(datos, datos)
    const todos = Object.values(nodos).flatMap((nodo) => [nodo, ...nodo.querySelectorAll('*')])
    expect(todos.flatMap(clasesVivo)).toEqual([])
  })

  it('hace saltar la racha en la tarjeta y en la cabecera cuando sube', () => {
    const { numero, nodos } = animar({ racha: 3, miembros: [ana] }, { racha: 4, miembros: [ana] })
    expect(clasesVivo(numero)).toEqual(['vivo-sube'])
    expect(clasesVivo(nodos.chip)).toEqual(['vivo-sube'])
  })

  it('hace temblar la racha cuando cae', () => {
    const { numero, nodos } = animar({ racha: 4, miembros: [ana] }, { racha: 0, miembros: [ana] })
    expect(clasesVivo(numero)).toEqual(['vivo-cae'])
    expect(clasesVivo(nodos.chip)).toEqual(['vivo-cae'])
  })

  it('ilumina al miembro que pasa a «Cumplido», rellena su barra y hace saltar «Hoy»', () => {
    const { filas, barras, valor } = animar(
      { racha: 3, miembros: [ana, laura, pablo] },
      { racha: 3, miembros: [ana, { ...laura, estado: 'cumplido' }, pablo] },
    )
    expect(filas.map(clasesVivo)).toEqual([[], ['vivo-destello'], []])
    expect(barras.map(clasesVivo)).toEqual([[], ['vivo-barra'], []])
    expect(clasesVivo(valor)).toEqual(['vivo-sube'])
  })

  it('ilumina al miembro que cambia de hábito sin tocar las barras ni «Hoy»', () => {
    const { filas, barras, valor } = animar(
      { racha: 3, miembros: [ana, laura, pablo] },
      { racha: 3, miembros: [ana, laura, { ...pablo, habito: 'Estudiar' }] },
    )
    expect(filas.map(clasesVivo)).toEqual([[], [], ['vivo-destello']])
    expect(barras.flatMap(clasesVivo)).toEqual([])
    expect(clasesVivo(valor)).toEqual([])
  })

  it('hace entrar al miembro nuevo con su barra y actualiza «Hoy»', () => {
    const marta = { id: 4, nombre: 'Marta', esUsuario: false, habito: 'Leer', estado: undefined }
    const { filas, barras, valor } = animar(
      { racha: 3, miembros: [ana, laura] },
      { racha: 3, miembros: [ana, laura, marta] },
    )
    expect(filas.map(clasesVivo)).toEqual([[], [], ['vivo-llega']])
    expect(barras.map(clasesVivo)).toEqual([[], [], ['vivo-barra']])
    expect(clasesVivo(valor)).toEqual(['vivo-sube'])
  })

  it('reconoce a cada miembro por su id aunque cambie el orden', () => {
    const { filas } = animar(
      { racha: 3, miembros: [ana, laura, pablo] },
      { racha: 3, miembros: [pablo, ana, laura] },
    )
    expect(filas.flatMap(clasesVivo)).toEqual([])
  })
})
