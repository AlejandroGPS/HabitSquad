import { describe, expect, it, vi } from 'vitest'
import { crearEscuadronScreen, validateSquadName } from './crearEscuadron.js'

function mount(screen = crearEscuadronScreen()) {
  document.body.replaceChildren(screen)
  return screen
}

function fill(element, nombre) {
  element.querySelector('input[name="nombre"]').value = nombre
}

function submit(element) {
  element.querySelector('form').dispatchEvent(
    new Event('submit', { cancelable: true }),
  )
}

function formAlertMessage(element) {
  return [...element.querySelectorAll('[role="alert"]')]
    .map((alert) => alert.textContent)
    .find((text) => text)
}

const CONNECTION_ERROR =
  'No se ha podido crear el escuadrón. Comprueba tu conexión e inténtalo de nuevo.'

describe('validateSquadName', () => {
  it('acepta un nombre recortado', () => {
    expect(validateSquadName('  Gym Bros  ')).toEqual({
      ok: true,
      name: 'Gym Bros',
    })
  })

  it('rechaza un nombre vacío o solo espacios', () => {
    expect(validateSquadName('')).toEqual({
      ok: false,
      error: 'Ponle un nombre a tu escuadrón.',
    })
    expect(validateSquadName('   ')).toEqual({
      ok: false,
      error: 'Ponle un nombre a tu escuadrón.',
    })
  })

  it('rechaza un nombre de más de 100 caracteres', () => {
    expect(validateSquadName('a'.repeat(101))).toEqual({
      ok: false,
      error: 'El nombre puede tener como máximo 100 caracteres.',
    })
  })
})

describe('crearEscuadronScreen', () => {
  it('muestra la pantalla «Crea tu escuadrón»', () => {
    const element = mount()

    expect(element.querySelector('h1').textContent).toBe('Crea tu escuadrón')
    expect(element.textContent).toContain('Nombre del escuadrón')
    const nameInput = element.querySelector('input[name="nombre"]')
    expect(nameInput.placeholder).toBe('Ej. Gym Bros')
    expect(nameInput.maxLength).toBe(100)
    expect(element.querySelector('button[type="submit"]').textContent).toBe(
      'Crear escuadrón',
    )
    const joinLink = [...element.querySelectorAll('a[data-link]')].find(
      (link) => link.textContent === 'Quiero unirme a uno',
    )
    expect(joinLink.getAttribute('href')).toBe('/escuadrones/unirse')
  })

  it('no envía el formulario si el nombre está vacío', () => {
    const onSubmit = vi.fn()
    const element = mount(crearEscuadronScreen({ onSubmit }))
    fill(element, '   ')
    submit(element)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(element.querySelector('[role="alert"]').textContent).toBe(
      'Ponle un nombre a tu escuadrón.',
    )
  })

  it('no envía el formulario si el nombre es demasiado largo', () => {
    const onSubmit = vi.fn()
    const element = mount(crearEscuadronScreen({ onSubmit }))
    const input = element.querySelector('input[name="nombre"]')
    input.removeAttribute('maxLength')
    fill(element, 'a'.repeat(101))
    submit(element)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(element.querySelector('[role="alert"]').textContent).toBe(
      'El nombre puede tener como máximo 100 caracteres.',
    )
  })

  it('entrega el nombre sin espacios al enviar', () => {
    const onSubmit = vi.fn()
    const element = mount(crearEscuadronScreen({ onSubmit }))
    fill(element, '  Gym Bros  ')
    submit(element)

    expect(onSubmit).toHaveBeenCalledWith('Gym Bros')
  })

  it('tras crearlo muestra el código de invitación y los miembros', async () => {
    const squad = {
      id: 1,
      nombre: 'Gym Bros',
      codigo_invitacion: 'X8K9QL',
      creador_id: 7,
      miembros: [{ usuario_id: 7, es_administrador: true }],
    }
    const onSubmit = vi.fn().mockResolvedValue(squad)
    const element = mount(crearEscuadronScreen({ onSubmit }))
    fill(element, 'Gym Bros')
    submit(element)

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Gym Bros')
      expect(document.body.querySelector('form')).toBeNull()
      expect(document.body.querySelector('h1').textContent).toBe('Escuadrón creado')
      expect(document.title).toBe('Escuadrón creado · HabitSquad')
      expect(document.body.textContent).toContain('X8K9QL')
      expect(document.body.textContent).toContain('Gym Bros')
      expect(document.body.textContent).toContain('Miembros (1)')
      expect(document.body.textContent).toContain('Tú')
      expect(document.body.textContent).toContain('Administrador')
      const panelLink = [...document.body.querySelectorAll('a[data-link]')].find(
        (link) => link.textContent === 'Ir al panel',
      )
      expect(panelLink.getAttribute('href')).toBe('/escuadrones/panel?id=1')
    })
    expect(element.isConnected).toBe(false)
  })

  it('muestra el error del servidor y reactiva el botón', async () => {
    let rejectSubmit
    const onSubmit = vi.fn(
      () =>
        new Promise((_, reject) => {
          rejectSubmit = reject
        }),
    )
    const element = mount(crearEscuadronScreen({ onSubmit }))
    const submitButton = element.querySelector('button[type="submit"]')
    const nameInput = element.querySelector('input[name="nombre"]')

    fill(element, 'Gym Bros')
    submit(element)

    await vi.waitFor(() => {
      expect(submitButton.disabled).toBe(true)
      expect(submitButton.textContent).toBe('Creando…')
    })

    rejectSubmit(new Error('Los datos enviados no son válidos.'))

    await vi.waitFor(() => {
      expect(formAlertMessage(element)).toBe('Los datos enviados no son válidos.')
      expect(submitButton.disabled).toBe(false)
      expect(submitButton.textContent).toBe('Crear escuadrón')
      expect(element.querySelector('form')).not.toBeNull()
      expect(document.activeElement).toBe(nameInput)
    })
  })

  it('muestra el aviso si falla la conexión', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error(CONNECTION_ERROR))
    const element = mount(crearEscuadronScreen({ onSubmit }))
    fill(element, 'Gym Bros')
    submit(element)

    await vi.waitFor(() => {
      expect(formAlertMessage(element)).toBe(CONNECTION_ERROR)
      expect(element.querySelector('button[type="submit"]').textContent).toBe(
        'Crear escuadrón',
      )
    })
  })

  it('copia el código al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const squad = {
      id: 1,
      nombre: 'Gym Bros',
      codigo_invitacion: 'X8K9QL',
      creador_id: 7,
      miembros: [{ usuario_id: 7, es_administrador: true }],
    }
    const onSubmit = vi.fn().mockResolvedValue(squad)
    const element = mount(crearEscuadronScreen({ onSubmit }))
    fill(element, 'Gym Bros')
    submit(element)

    await vi.waitFor(() => {
      expect(document.body.querySelector('h1').textContent).toBe('Escuadrón creado')
    })

    const copyButton = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent === 'Copiar código',
    )
    copyButton.click()

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('X8K9QL')
      expect(document.body.querySelector('[role="status"]').textContent).toBe(
        'Código copiado.',
      )
    })
  })

  it('avisa si no se puede copiar el código', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    })

    const squad = {
      id: 1,
      nombre: 'Gym Bros',
      codigo_invitacion: 'X8K9QL',
      creador_id: 7,
      miembros: [{ usuario_id: 7, es_administrador: true }],
    }
    const onSubmit = vi.fn().mockResolvedValue(squad)
    const element = mount(crearEscuadronScreen({ onSubmit }))
    fill(element, 'Gym Bros')
    submit(element)

    await vi.waitFor(() => {
      expect(document.body.querySelector('h1').textContent).toBe('Escuadrón creado')
    })

    const copyButton = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent === 'Copiar código',
    )
    copyButton.click()

    await vi.waitFor(() => {
      expect(document.body.querySelector('[role="status"]').textContent).toBe(
        'No se ha podido copiar. Cópialo a mano.',
      )
    })
  })
})
