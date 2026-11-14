import { describe, expect, it, vi } from 'vitest'
import { PLAZAS_MAX, configuracionEscuadronScreen, limitesPlazas } from './configuracionEscuadron.js'

const ESCUADRON = { id: 7, nombre: 'Los Inquebrantables', codigo: 'K7P2QX', visibilidad: 'privado', plazas: 5 }

const MIEMBROS = [
  { nombre: 'Alejandro', esUsuario: true, esAdministrador: true },
  { nombre: 'Carlos' },
  { nombre: 'Laura' },
]

function mount({ escuadron = ESCUADRON, miembros = MIEMBROS, acciones = { guardar: vi.fn() } } = {}) {
  const screen = configuracionEscuadronScreen({ escuadron, miembros, acciones })
  document.body.replaceChildren(screen)
  return { screen, acciones }
}

const radio = (screen, value) => screen.querySelector(`input[name="visibilidad"][value="${value}"]`)
const boton = (screen, label) => screen.querySelector(`button[aria-label="${label}"]`)
const botonTexto = (root, text) => [...root.querySelectorAll('button')].find((node) => node.textContent === text)
const estado = (screen) => screen.querySelector('form > div.glass [role="status"]').textContent
const nombre = (screen) => screen.querySelector('input[name="nombre"]')
const tarjeta = (screen, title) =>
  [...screen.querySelectorAll('section')].find((section) => section.querySelector('p, h2')?.textContent.startsWith(title))

function submit(screen) {
  screen.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
}

function escribir(input, value) {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

describe('limitesPlazas', () => {
  it('no deja bajar de los miembros que ya hay ni del mínimo', () => {
    expect(limitesPlazas(1)).toEqual({ minimo: 2, maximo: PLAZAS_MAX })
    expect(limitesPlazas(4)).toEqual({ minimo: 4, maximo: PLAZAS_MAX })
  })
})

describe('configuracionEscuadronScreen', () => {
  it('muestra la configuración actual del escuadrón al administrador', () => {
    const { screen } = mount()

    expect(screen.querySelector('h1').textContent).toBe('Configuración')
    expect(screen.querySelector('header p').textContent).toBe('Los Inquebrantables')
    expect(screen.querySelector('header a').getAttribute('href')).toBe('/escuadrones/panel?id=7')
    expect(screen.querySelector('aside [aria-current="page"]').textContent).toBe('Configuración')
    expect(nombre(screen).value).toBe('Los Inquebrantables')
    expect(radio(screen, 'privado').checked).toBe(true)
    expect(screen.querySelector('output').textContent).toBe('5')
    expect(tarjeta(screen, 'Límite de miembros').textContent).toContain('Quedan 2 plazas')
    expect(tarjeta(screen, 'Código de invitación').textContent).toContain('K7P2QX')
    expect(tarjeta(screen, 'Miembros').textContent).toContain('3 de 5 miembros')
    expect(estado(screen)).toBe('Sin cambios.')
    expect(botonTexto(screen, 'Guardar').disabled).toBe(true)
    expect(botonTexto(screen, 'Descartar').disabled).toBe(true)
  })

  it('cambia el límite sin bajar de los miembros actuales ni pasar del máximo', () => {
    const { screen } = mount({ escuadron: { ...ESCUADRON, plazas: 4 } })

    boton(screen, 'Quitar una plaza').click()
    expect(screen.querySelector('output').textContent).toBe('3')
    expect(boton(screen, 'Quitar una plaza').disabled).toBe(true)
    expect(screen.textContent).toContain('Escuadrón completo: nadie más podrá unirse.')

    for (let i = 0; i < PLAZAS_MAX; i += 1) boton(screen, 'Añadir una plaza').click()
    expect(screen.querySelector('output').textContent).toBe(String(PLAZAS_MAX))
    expect(boton(screen, 'Añadir una plaza').disabled).toBe(true)
    expect(screen.textContent).toContain(`3 de ${PLAZAS_MAX} miembros`)
  })

  it('guarda el nombre, la visibilidad y el límite elegidos', async () => {
    const { screen, acciones } = mount()

    escribir(nombre(screen), '  Madrugadores  ')
    radio(screen, 'publico').click()
    boton(screen, 'Añadir una plaza').click()
    expect(estado(screen)).toBe('Tienes cambios sin guardar.')

    submit(screen)
    await vi.waitFor(() => expect(estado(screen)).toBe('Cambios guardados.'))
    expect(acciones.guardar).toHaveBeenCalledWith({ nombre: 'Madrugadores', visibilidad: 'publico', plazas: 6 })
    expect(nombre(screen).value).toBe('Madrugadores')
    expect(screen.querySelector('header p').textContent).toBe('Madrugadores')
    expect(botonTexto(screen, 'Guardar').disabled).toBe(true)
  })

  it('no guarda un nombre vacío', () => {
    const { screen, acciones } = mount()

    escribir(nombre(screen), '   ')
    submit(screen)

    expect(screen.querySelector('#nombre-escuadron-error').textContent).toBe('Ponle un nombre a tu escuadrón.')
    expect(nombre(screen).getAttribute('aria-invalid')).toBe('true')
    expect(acciones.guardar).not.toHaveBeenCalled()
  })

  it('descarta los cambios sin guardarlos', () => {
    const { screen, acciones } = mount()

    escribir(nombre(screen), 'Otro nombre')
    radio(screen, 'publico').click()
    boton(screen, 'Quitar una plaza').click()
    botonTexto(screen, 'Descartar').click()

    expect(nombre(screen).value).toBe('Los Inquebrantables')
    expect(radio(screen, 'privado').checked).toBe(true)
    expect(screen.querySelector('output').textContent).toBe('5')
    expect(estado(screen)).toBe('Sin cambios.')
    expect(acciones.guardar).not.toHaveBeenCalled()
  })

  it('avisa si no se han podido guardar los cambios', async () => {
    const guardar = vi.fn().mockRejectedValue(new Error('No se ha podido guardar la configuración.'))
    const { screen } = mount({ acciones: { guardar } })

    boton(screen, 'Añadir una plaza').click()
    submit(screen)

    await vi.waitFor(() =>
      expect(screen.querySelector('form > [role="alert"]').textContent).toBe('No se ha podido guardar la configuración.'),
    )
    expect(estado(screen)).toBe('Tienes cambios sin guardar.')
  })

  it('genera otro código de invitación', async () => {
    const generarCodigo = vi.fn().mockResolvedValue('Z9Y8X7')
    const { screen } = mount({ acciones: { guardar: vi.fn(), generarCodigo } })
    const codigo = tarjeta(screen, 'Código de invitación')

    botonTexto(codigo, 'Generar otro').click()

    await vi.waitFor(() => expect(codigo.textContent).toContain('Z9Y8X7'))
    expect(codigo.textContent).toContain('Código nuevo listo. El anterior ya no sirve.')
  })

  it('deja expulsar a los miembros pero no al administrador', () => {
    const expulsar = vi.fn()
    const { screen } = mount({ acciones: { expulsar } })
    const miembros = tarjeta(screen, 'Miembros')

    expect(miembros.querySelectorAll('button')).toHaveLength(2)
    botonTexto(miembros, 'Expulsar').click()
    expect(expulsar).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Carlos' }))
  })

  it('desactiva las acciones que aún no están conectadas', () => {
    const { screen } = mount({ acciones: {} })

    expect(botonTexto(tarjeta(screen, 'Código de invitación'), 'Generar otro').disabled).toBe(true)
    expect(botonTexto(tarjeta(screen, 'Miembros'), 'Expulsar').disabled).toBe(true)
    expect(botonTexto(tarjeta(screen, 'Eliminar escuadrón'), 'Eliminar').disabled).toBe(true)
  })

  it('solo deja entrar al administrador', () => {
    const miembros = MIEMBROS.map((miembro) => ({ ...miembro, esUsuario: miembro.nombre === 'Laura' }))
    const { screen } = mount({ miembros })

    expect(screen.querySelector('form')).toBeNull()
    expect(screen.querySelector('h2').textContent).toBe('Solo el administrador puede cambiar la configuración')
    expect(screen.textContent).toContain('habla con Alejandro')
    expect(screen.querySelector('section a[data-link]').getAttribute('href')).toBe('/escuadrones/panel?id=7')
  })
})
