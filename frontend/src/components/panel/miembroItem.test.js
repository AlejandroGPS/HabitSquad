import { describe, expect, it, vi } from 'vitest'
import { miembroItem } from './miembroItem.js'

describe('miembroItem', () => {
  it('muestra el nombre, el estado escrito y el hábito', () => {
    expect(miembroItem({ nombre: 'Carlos', habito: 'Gimnasio', estado: 'cumplido' }).textContent).toBe(
      'Carlos' + 'Cumplido' + 'Gimnasio' + 'Ver foto',
    )
    expect(miembroItem({ nombre: 'Laura', habito: 'Leer', estado: 'pendiente' }).textContent).toBe(
      'L' + 'Laura' + 'Pendiente' + 'Leer' + 'Votar',
    )
  })

  it('pinta el estado como una etiqueta del color de cada estado', () => {
    const etiqueta = (estado) => [...miembroItem({ nombre: 'Laura', estado }).querySelectorAll('span')].at(-1)

    expect(etiqueta('cumplido').classList.contains('text-[#248a3d]')).toBe(true)
    expect(etiqueta('pendiente').classList.contains('text-[#c93400]')).toBe(true)
    expect(etiqueta('no_cumplido').classList.contains('text-red-700')).toBe(true)
    expect(etiqueta(undefined).classList.contains('text-ink-muted')).toBe(true)
  })

  it('muestra al usuario como "Tú" y solo le deja ver su propia prueba, no votarla', () => {
    const item = miembroItem({ nombre: 'Alejandro', habito: 'Leer', estado: 'pendiente', esUsuario: true })

    expect(item.textContent).toBe('ATúPendienteLeerVer foto')
    expect(item.querySelectorAll('button')).toHaveLength(1)
    expect(item.querySelector('button').textContent).toBe('Ver foto')
  })

  it('deja ver la foto propia si ya ha cumplido', () => {
    const item = miembroItem({ nombre: 'Alejandro', estado: 'cumplido', esUsuario: true })

    expect(item.querySelector('button').textContent).toBe('Ver foto')
  })

  it('trata a un miembro sin estado ni hábito como sin prueba', () => {
    const item = miembroItem({ nombre: 'Marta' })

    expect(item.textContent).toBe('MMartaSin pruebaSin hábito')
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
