import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unirseEscuadronScreen } from './unirseEscuadron.js'

const INCOMPLETE = 'Introduce el código completo de 6 caracteres.'
const UNKNOWN_CODE = 'Ese código no corresponde a ningún escuadrón.'
const JOIN_FAILED = 'No se ha podido unir al escuadrón. Inténtalo de nuevo.'

function inputsOf(element) {
  return [...element.querySelectorAll('input')]
}

function codeOf(element) {
  return inputsOf(element)
    .map((input) => input.value)
    .join('')
}

function alertOf(element) {
  return element.querySelector('[role="alert"]')
}

function typeChar(input, char) {
  input.focus()
  input.value = char
  input.dispatchEvent(new Event('input'))
}

function typeCode(element, code) {
  const inputs = inputsOf(element)
  inputs[0].focus()
  for (const char of code) {
    const current = inputs.includes(document.activeElement)
      ? document.activeElement
      : inputs[0]
    typeChar(current, char)
  }
}

function paste(input, text) {
  const event = new Event('paste', { cancelable: true })
  event.clipboardData = { getData: () => text }
  input.dispatchEvent(event)
}

function submit(element) {
  element.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
}

function expectClearFeedback(element) {
  const alert = alertOf(element)
  expect(alert.classList.contains('hidden')).toBe(true)
  expect(alert.textContent).toBe('')
  expect(element.querySelector('[role="group"]').hasAttribute('aria-describedby')).toBe(
    false,
  )
  for (const input of inputsOf(element)) {
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(input.hasAttribute('aria-describedby')).toBe(false)
  }
}

function expectErrorFeedback(element, message) {
  const alert = alertOf(element)
  expect(alert.classList.contains('hidden')).toBe(false)
  expect(alert.classList.contains('text-red-700')).toBe(true)
  expect(alert.textContent).toBe(message)
  expect(element.querySelector('[role="group"]').getAttribute('aria-describedby')).toBe(
    alert.id,
  )
  for (const input of inputsOf(element)) {
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(alert.id)
    expect(input.className).toContain('aria-invalid:border-red-400')
    expect(input.className).toContain('aria-invalid:text-red-600')
  }
}

describe('introducción del código de 6 caracteres', () => {
  let element

  beforeEach(() => {
    element = unirseEscuadronScreen()
    document.body.replaceChildren(element)
  })

  it('ofrece seis casillas de un carácter', () => {
    const inputs = inputsOf(element)
    expect(inputs).toHaveLength(6)
    inputs.forEach((input, index) => {
      expect(input.maxLength).toBe(1)
      expect(input.getAttribute('aria-label')).toBe(`Carácter ${index + 1} del código`)
      expect(input.value).toBe('')
    })
  })

  it('escribe el código en mayúsculas y avanza casilla a casilla', () => {
    typeCode(element, 'x8k9ql')

    expect(codeOf(element)).toBe('X8K9QL')
    expect(document.activeElement).toBe(inputsOf(element)[5])
    expectClearFeedback(element)
  })

  it('ignora símbolos y no avanza si la casilla queda vacía', () => {
    const [first] = inputsOf(element)
    typeChar(first, '-')

    expect(first.value).toBe('')
    expect(document.activeElement).toBe(first)
  })

  it('distribuye un código pegado y descarta lo que no sea letra o número', () => {
    paste(inputsOf(element)[0], ' x8k-9ql ')

    expect(codeOf(element)).toBe('X8K9QL')
    expect(document.activeElement).toBe(inputsOf(element)[5])
  })

  it('con retroceso en una casilla vacía borra la anterior', () => {
    const inputs = inputsOf(element)
    typeChar(inputs[0], 'A')
    inputs[1].focus()
    inputs[1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true }),
    )

    expect(inputs[0].value).toBe('')
    expect(document.activeElement).toBe(inputs[0])
  })

  it('entrega el código completo al enviar', () => {
    const onSubmit = vi.fn()
    const screen = unirseEscuadronScreen({ onSubmit })
    document.body.replaceChildren(screen)
    typeCode(screen, 'x8k9ql')
    submit(screen)

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit.mock.calls[0][0]).toBe('X8K9QL')
    expectClearFeedback(screen)
  })
})

describe('feedback visual del código', () => {
  let element

  beforeEach(() => {
    element = unirseEscuadronScreen()
    document.body.replaceChildren(element)
  })

  it('empieza sin aviso y con las casillas en estado válido', () => {
    const alert = alertOf(element)
    expect(alert.getAttribute('role')).toBe('alert')
    expect(alert.getAttribute('aria-live')).toBe('polite')
    expect(alert.classList.contains('text-red-700')).toBe(true)
    expectClearFeedback(element)
  })

  it('usa el fondo, la tarjeta y el bocadillo del diseño de acceso', () => {
    expect(element.className).toContain('font-rounded')
    expect(element.querySelector('.access-backdrop')).not.toBeNull()
    expect(element.querySelector('section.glass')).not.toBeNull()
    expect(element.querySelector('.speech-bubble').textContent).toBe(
      '¿Te han pasado un código?',
    )
    expect(element.querySelector('h1').textContent).toBe('Únete a un escuadrón')
    expect(element.querySelectorAll('input')).toHaveLength(6)
    expect(element.querySelector('input').className).toContain('bg-[#f2f2f7]')
    expect(element.querySelector('input').className).toContain('rounded-xl')
  })

  it('marca en rojo las casillas y el aviso si el código está incompleto', () => {
    typeCode(element, 'X8')
    submit(element)

    expectErrorFeedback(element, INCOMPLETE)
    expect(document.activeElement).toBe(inputsOf(element)[2])
  })

  it('retira el marcado rojo en cuanto se corrige una casilla', () => {
    submit(element)
    typeChar(inputsOf(element)[0], 'a')

    expect(inputsOf(element)[0].value).toBe('A')
    expectClearFeedback(element)
  })

  it('pegar un código también retira el aviso', () => {
    submit(element)
    paste(inputsOf(element)[0], 'X8K9QL')

    expect(codeOf(element)).toBe('X8K9QL')
    expectClearFeedback(element)
  })

  it('publica el aviso que devuelve quien procesa el código', () => {
    const screen = unirseEscuadronScreen({
      onSubmit: (_code, { showError }) => showError(`  ${UNKNOWN_CODE}  `),
    })
    document.body.replaceChildren(screen)
    typeCode(screen, 'X8K9QL')
    submit(screen)

    expectErrorFeedback(screen, UNKNOWN_CODE)
  })

  it('ignora un aviso vacío y mantiene las casillas válidas', () => {
    const screen = unirseEscuadronScreen({
      onSubmit: (_code, { showError }) => showError('   '),
    })
    document.body.replaceChildren(screen)
    typeCode(screen, 'X8K9QL')
    submit(screen)

    expectClearFeedback(screen)
  })

  it('desactiva el botón mientras se intenta unir y lo recupera si sale bien', async () => {
    let finish
    const pending = new Promise((resolve) => {
      finish = resolve
    })
    const screen = unirseEscuadronScreen({ onSubmit: () => pending })
    document.body.replaceChildren(screen)
    typeCode(screen, 'X8K9QL')
    submit(screen)

    const button = screen.querySelector('button')
    expect(button.disabled).toBe(true)
    expect(button.className).toContain('disabled:opacity-60')
    expect(button.className).toContain('disabled:cursor-wait')
    expectClearFeedback(screen)

    finish()
    await vi.waitFor(() => {
      expect(button.disabled).toBe(false)
    })
    expectClearFeedback(screen)
  })

  it('muestra el escuadrón cuando el backend confirma la unión', async () => {
    const screen = unirseEscuadronScreen({
      onSubmit: () => Promise.resolve({ nombre: 'Madrugadores' }),
    })
    document.body.replaceChildren(screen)
    typeCode(screen, 'X8K9QL')
    submit(screen)

    await vi.waitFor(() => {
      const success = screen.querySelector('[role="status"]')
      expect(success.textContent).toBe('Te has unido a «Madrugadores».')
      expect(success.classList.contains('hidden')).toBe(false)
    })
  })

  it('muestra el aviso y reactiva el botón si unirse falla', async () => {
    const screen = unirseEscuadronScreen({
      onSubmit: () => Promise.reject(new Error(UNKNOWN_CODE)),
    })
    document.body.replaceChildren(screen)
    typeCode(screen, 'X8K9QL')
    submit(screen)

    const button = screen.querySelector('button')
    expect(button.disabled).toBe(true)
    await vi.waitFor(() => {
      expectErrorFeedback(screen, UNKNOWN_CODE)
    })
    expect(button.disabled).toBe(false)
  })

  it('usa un aviso genérico si el fallo no trae mensaje', async () => {
    const screen = unirseEscuadronScreen({
      onSubmit: () => Promise.reject('sin detalle'),
    })
    document.body.replaceChildren(screen)
    typeCode(screen, 'X8K9QL')
    submit(screen)

    await vi.waitFor(() => {
      expectErrorFeedback(screen, JOIN_FAILED)
    })
  })

  it('permite retirar el aviso desde quien procesa el código', () => {
    const screen = unirseEscuadronScreen({
      onSubmit: (_code, { showError, clearError }) => {
        showError(UNKNOWN_CODE)
        clearError()
      },
    })
    document.body.replaceChildren(screen)
    typeCode(screen, 'X8K9QL')
    submit(screen)

    expectClearFeedback(screen)
  })
})

describe('alternativa a unirse', () => {
  it('enlaza con crear un escuadrón', () => {
    const element = unirseEscuadronScreen()
    const link = element.querySelector('a[href="/escuadrones/nuevo"]')
    expect(link.getAttribute('href')).toBe('/escuadrones/nuevo')
    expect(link.textContent).toBe('¿No tienes código? Crea tu escuadrón')
  })

  it('en la barra de arriba marca la sección Mis escuadrones', () => {
    const actual = unirseEscuadronScreen().querySelector('header [aria-current]')
    expect(actual.textContent).toBe('Mis escuadrones')
    expect(actual.getAttribute('href')).toBe('/escuadrones')
  })
})
