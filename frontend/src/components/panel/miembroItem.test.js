import { describe, expect, it, vi } from 'vitest'
import { miembroItem } from './miembroItem.js'

const foto = 'https://res.cloudinary.com/demo/perfiles/carlos.jpg'

describe('miembroItem', () => {
  it('muestra el nombre, el hábito y el estado escrito', () => {
    expect(miembroItem({ nombre: 'Carlos', habito: 'Gimnasio', estado: 'cumplido' }).textContent).toBe(
      'Carlos' + 'Gimnasio · Cumplido' + 'Ver foto',
    )
    expect(miembroItem({ nombre: 'Laura', habito: 'Leer', estado: 'pendiente' }).textContent).toBe(
      'L' + 'Laura' + 'Leer · Pendiente' + 'Votar',
    )
  })

  it('marca al usuario con «Tú» junto a su nickname y solo le deja ver su propia prueba, no votarla', () => {
    const item = miembroItem({ nombre: 'ale', habito: 'Leer', estado: 'pendiente', esUsuario: true })

    expect(item.textContent).toBe('A' + 'aleTú' + 'Leer · Pendiente' + 'Ver foto')
    expect(item.querySelectorAll('button')).toHaveLength(1)
    expect(item.querySelector('button').textContent).toBe('Ver foto')
  })

  it('deja ver la foto propia si ya ha cumplido', () => {
    const item = miembroItem({ nombre: 'ale', estado: 'cumplido', esUsuario: true })

    expect(item.querySelector('button').textContent).toBe('Ver foto')
  })

  it('trata a un miembro sin estado ni hábito como sin prueba', () => {
    const item = miembroItem({ nombre: 'Marta' })

    expect(item.textContent).toBe('MMartaSin hábito · Sin prueba')
    expect(item.querySelector('button')).toBeNull()
  })

  it.each([
    ['cumplido', 'Cumplido', 'text-[#248a3d]'],
    ['pendiente', 'Pendiente', 'text-[#c93400]'],
    ['no_cumplido', 'No cumplido', 'text-red-700'],
    [undefined, 'Sin prueba', 'text-ink-muted'],
  ])('escribe el estado %s con su color y sin recortarlo', (valor, texto, color) => {
    const estado = [...miembroItem({ nombre: 'lau', habito: 'Leer veinte páginas', estado: valor }).querySelectorAll('span')]
      .find((span) => span.textContent === texto)

    expect(estado.classList.contains(color)).toBe(true)
    expect(estado.classList.contains('shrink-0')).toBe(true)
    expect(estado.classList.contains('truncate')).toBe(false)
  })

  it('deja el nickname entero en el título por si no cabe', () => {
    const nombre = 'nickname_largo_de_cincuenta_caracteres_como_maximo'
    const texto = miembroItem({ nombre }).querySelector('span.truncate')

    expect(texto.textContent).toBe(nombre)
    expect(texto.title).toBe(nombre)
  })

  it('pinta la foto de perfil en lugar de las iniciales', () => {
    const imagen = miembroItem({ nombre: 'carlos', fotoUrl: foto }).querySelector('img')

    expect(imagen.getAttribute('src')).toBe(foto)
    expect(imagen.getAttribute('alt')).toBe('')
    expect(imagen.referrerPolicy).toBe('no-referrer')
    expect(imagen.closest('li').textContent).toBe('carlosSin hábito · Sin prueba')
  })

  it.each([
    ['cumplido', 'bg-[#248a3d]'],
    ['pendiente', 'bg-[#c93400]'],
    ['no_cumplido', 'bg-red-100'],
  ])('con foto, el estado %s se ve en una insignia de su color', (estado, color) => {
    const item = miembroItem({ nombre: 'carlos', fotoUrl: foto, estado })
    const insignia = item.querySelector('img + span')

    expect(insignia.classList.contains(color)).toBe(true)
    expect(insignia.querySelector('svg')).not.toBeNull()
  })

  it('con foto y sin prueba no pinta insignia', () => {
    expect(miembroItem({ nombre: 'carlos', fotoUrl: foto }).querySelector('img + span')).toBeNull()
  })

  it.each([
    ['pendiente', 'L', 'bg-[#c93400]'],
    ['cumplido', '', 'bg-[#248a3d]'],
  ])('si la foto no carga vuelve al avatar del estado %s', (estado, iniciales, color) => {
    const item = miembroItem({ nombre: 'lau', fotoUrl: foto, estado })

    item.querySelector('img').dispatchEvent(new Event('error'))

    const avatar = item.firstElementChild
    expect(item.querySelector('img')).toBeNull()
    expect(avatar.textContent).toBe(iniciales)
    expect(avatar.classList.contains(color)).toBe(true)
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
