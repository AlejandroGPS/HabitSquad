import { describe, expect, it, vi } from 'vitest'
import { miembroItem } from './miembroItem.js'

describe('miembroItem', () => {
  it('muestra el nombre, el hábito y el estado escrito', () => {
    expect(miembroItem({ nombre: 'Carlos', habito: 'Gimnasio', estado: 'cumplido' }).textContent).toBe(
      'Carlos' + 'Gimnasio · Cumplido' + 'Ver foto',
    )
    expect(miembroItem({ nombre: 'Laura', habito: 'Leer', estado: 'pendiente' }).textContent).toBe(
      'L' + 'Laura' + 'Leer · Pendiente' + 'Votar',
    )
  })

  it('muestra al usuario como "Tú" y sin botón de votar su propia prueba', () => {
    const item = miembroItem({ nombre: 'Alejandro', habito: 'Leer', estado: 'pendiente', esUsuario: true })

    expect(item.textContent).toBe('ATúLeer · Pendiente')
    expect(item.querySelector('button')).toBeNull()
  })

  it('deja ver la foto propia si ya ha cumplido', () => {
    const item = miembroItem({ nombre: 'Alejandro', estado: 'cumplido', esUsuario: true })

    expect(item.querySelector('button').textContent).toBe('Ver foto')
  })

  it('trata a un miembro sin estado ni hábito como sin prueba', () => {
    const item = miembroItem({ nombre: 'Marta' })

    expect(item.textContent).toBe('MMartaSin hábito · Sin prueba')
    expect(item.querySelector('button')).toBeNull()
  })

  it('pasa el miembro a las acciones de ver foto y votar', () => {
    const onVerFoto = vi.fn()
    const onVotar = vi.fn()
    const carlos = { nombre: 'Carlos', estado: 'cumplido' }
    const laura = { nombre: 'Laura', estado: 'pendiente' }

    miembroItem(carlos, { onVerFoto, onVotar }).querySelector('button').click()
    miembroItem(laura, { onVerFoto, onVotar }).querySelector('button').click()

    expect(onVerFoto).toHaveBeenCalledWith(expect.objectContaining(carlos))
    expect(onVotar).toHaveBeenCalledWith(expect.objectContaining(laura))
  })

  it('desactiva los botones si no hay acciones', () => {
    expect(miembroItem({ nombre: 'Carlos', estado: 'cumplido' }).querySelector('button').disabled).toBe(true)
    expect(miembroItem({ nombre: 'Laura', estado: 'pendiente' }).querySelector('button').disabled).toBe(true)
  })
})
