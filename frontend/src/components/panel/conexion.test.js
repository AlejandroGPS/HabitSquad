import { describe, expect, it } from 'vitest'
import { conexionEnDirecto, mostrarConexion } from './conexion.js'

describe('conexionEnDirecto', () => {
  it('empieza vacío y anuncia los cambios a los lectores de pantalla', () => {
    const nodo = conexionEnDirecto()
    expect(nodo.textContent).toBe('')
    expect(nodo.getAttribute('aria-live')).toBe('polite')
    expect(nodo.classList.contains('empty:hidden')).toBe(true)
  })

  it.each([
    ['conectado', 'En directo', 'bg-[#248a3d]'],
    ['reconectando', 'Reconectando…', 'bg-[#c93400]'],
    ['desconectado', 'Desconectado', 'bg-ink-muted'],
  ])('en «%s» muestra «%s» con su punto de color', (estado, texto, color) => {
    const nodo = conexionEnDirecto()
    mostrarConexion(nodo, estado)
    expect(nodo.textContent).toBe(texto)
    expect(nodo.dataset.estado).toBe(estado)
    expect(nodo.querySelector('span').classList.contains(color)).toBe(true)
  })

  it('el punto de «En directo» solo late si se permite el movimiento', () => {
    const nodo = conexionEnDirecto()
    mostrarConexion(nodo, 'conectado')
    expect(nodo.querySelector('span').classList.contains('motion-safe:animate-pulse')).toBe(true)
  })

  it('mientras conecta por primera vez no muestra nada', () => {
    const nodo = conexionEnDirecto()
    mostrarConexion(nodo, 'reconectando')
    mostrarConexion(nodo, 'conectando')
    expect(nodo.textContent).toBe('')
    expect(nodo.dataset.estado).toBeUndefined()
  })
})
