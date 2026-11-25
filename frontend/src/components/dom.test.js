import { describe, expect, it, vi } from 'vitest'
import { button, element } from './dom.js'

describe('element', () => {
  it('crea la etiqueta con clases e hijos, ignorando los vacíos', () => {
    const hijo = document.createElement('b')
    const node = element('p', 'texto', 'Hola ', null, false, undefined, [hijo, 'mundo'])

    expect(node.tagName).toBe('P')
    expect(node.className).toBe('texto')
    expect(node.textContent).toBe('Hola mundo')
    expect(node.firstElementChild).toBe(hijo)
  })

  it('funciona sin clases ni hijos', () => {
    expect(element('div').outerHTML).toBe('<div class=""></div>')
  })
})

describe('button', () => {
  it('es de tipo button, pone mano y llama a onClick', () => {
    const onClick = vi.fn()
    const node = button('boton', onClick, 'Pulsar')

    node.click()
    expect(node.type).toBe('button')
    expect(node.className).toBe('boton cursor-pointer')
    expect(node.textContent).toBe('Pulsar')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('no duplica el cursor si la clase ya lo fija', () => {
    expect(button('boton cursor-wait', () => {}, 'Espera').className).toBe('boton cursor-wait')
  })

  it('se desactiva si no hay acción', () => {
    expect(button('boton', undefined, 'Pulsar').disabled).toBe(true)
  })
})
