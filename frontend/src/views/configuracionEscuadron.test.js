import { describe, expect, it, vi } from 'vitest'
import { PLAZAS_MAX, configuracionEscuadronScreen, limitesPlazas } from './configuracionEscuadron.js'

const ESCUADRON = { id: 7, nombre: 'Los Inquebrantables', codigo: 'K7P2QX', visibilidad: 'privado', plazas: 5 }

const MIEMBROS = [
  { nombre: 'Alejandro', esUsuario: true, esAdministrador: true },
  { nombre: 'Carlos' },
  { nombre: 'Laura' },
]

function mount({ escuadron = ESCUADRON, miembros = MIEMBROS, onGuardar = vi.fn() } = {}) {
  const screen = configuracionEscuadronScreen({ escuadron, miembros, onGuardar })
  document.body.replaceChildren(screen)
  return { screen, onGuardar }
}

const radio = (screen, value) => screen.querySelector(`input[name="visibilidad"][value="${value}"]`)
const boton = (screen, label) => screen.querySelector(`button[aria-label="${label}"]`)
const botonTexto = (screen, text) => [...screen.querySelectorAll('button')].find((node) => node.textContent === text)
const estado = (screen) => screen.querySelector('form [role="status"]').textContent

function submit(screen) {
  screen.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
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
    expect(radio(screen, 'privado').checked).toBe(true)
    expect(radio(screen, 'publico').checked).toBe(false)
    expect(screen.textContent).toContain('Solo entra quien tenga el código K7P2QX.')
    expect(screen.querySelector('output').textContent).toBe('5')
    expect(screen.textContent).toContain('Quedan 2 plazas')
    expect(screen.textContent).toContain('3 de 5 miembros')
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

  it('guarda la visibilidad y el límite elegidos', async () => {
    const { screen, onGuardar } = mount()

    radio(screen, 'publico').click()
    boton(screen, 'Añadir una plaza').click()
    expect(estado(screen)).toBe('Tienes cambios sin guardar.')

    submit(screen)
    await vi.waitFor(() => expect(estado(screen)).toBe('Cambios guardados.'))
    expect(onGuardar).toHaveBeenCalledWith({ visibilidad: 'publico', plazas: 6 })
    expect(botonTexto(screen, 'Guardar').disabled).toBe(true)
  })

  it('descarta los cambios sin guardarlos', () => {
    const { screen, onGuardar } = mount()

    radio(screen, 'publico').click()
    boton(screen, 'Quitar una plaza').click()
    botonTexto(screen, 'Descartar').click()

    expect(radio(screen, 'privado').checked).toBe(true)
    expect(screen.querySelector('output').textContent).toBe('5')
    expect(estado(screen)).toBe('Sin cambios.')
    expect(onGuardar).not.toHaveBeenCalled()
  })

  it('avisa si no se han podido guardar los cambios', async () => {
    const onGuardar = vi.fn().mockRejectedValue(new Error('No se ha podido guardar la configuración.'))
    const { screen } = mount({ onGuardar })

    boton(screen, 'Añadir una plaza').click()
    submit(screen)

    await vi.waitFor(() =>
      expect(screen.querySelector('[role="alert"]').textContent).toBe('No se ha podido guardar la configuración.'),
    )
    expect(estado(screen)).toBe('Tienes cambios sin guardar.')
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
