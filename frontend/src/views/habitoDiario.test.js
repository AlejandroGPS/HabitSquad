import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { habitoDiarioScreen, validateDailyHabit } from './habitoDiario.js'

const HABIT_STORAGE_KEY = 'habitsquad.dailyHabit.pendingSync'

function mount() {
  const element = habitoDiarioScreen()
  document.body.replaceChildren(element)
  return element
}

function submit(element) {
  element.querySelector('form').dispatchEvent(
    new Event('submit', { cancelable: true }),
  )
}

function enterHabit(element, value) {
  const input = element.querySelector('input[name="habito"]')
  input.value = value
  input.dispatchEvent(new Event('input'))
  return input
}

describe('validateDailyHabit', () => {
  it('recorta espacios y devuelve el hábito personalizado', () => {
    expect(validateDailyHabit('  Practicar guitarra  ')).toEqual({
      ok: true,
      habit: 'Practicar guitarra',
    })
  })

  it('rechaza el campo vacío o con solo espacios', () => {
    expect(validateDailyHabit('')).toEqual({
      ok: false,
      error: 'Elige una idea o escribe tu propio hábito.',
    })
    expect(validateDailyHabit('   ')).toEqual({
      ok: false,
      error: 'Elige una idea o escribe tu propio hábito.',
    })
  })

  it('acepta 60 caracteres y rechaza más de 60', () => {
    expect(validateDailyHabit('a'.repeat(60))).toEqual({
      ok: true,
      habit: 'a'.repeat(60),
    })
    expect(validateDailyHabit('a'.repeat(61))).toEqual({
      ok: false,
      error: 'El hábito puede tener como máximo 60 caracteres.',
    })
  })
})

describe('habitoDiarioScreen', () => {
  let fetchMock

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.replaceChildren()
  })

  it('muestra seis ideas predefinidas y el campo de texto libre', () => {
    const element = mount()
    const input = element.querySelector('input[name="habito"]')
    const choices = [...element.querySelectorAll('input[name="idea-habito"]')]

    expect(element.querySelector('h1').textContent).toBe('Mi hábito diario')
    expect(input.maxLength).toBe(60)
    expect(input.placeholder).toBe('Ej. Leer 20 minutos')
    expect(choices.map((choice) => choice.value)).toEqual([
      'Leer 20 minutos',
      'Ir al gimnasio',
      'Meditar 10 minutos',
      'Caminar 8.000 pasos',
      'Sin móvil en la cama',
      'Estudiar 1 hora',
    ])
    expect(element.textContent).toContain('La sincronización con el escuadrón queda pendiente.')
  })

  it('muestra el menú lateral del diseño con el hábito activo y datos de ejemplo', () => {
    const element = mount()
    const sidebar = element.querySelector('aside[aria-label="Menú principal"]')

    expect(sidebar).not.toBeNull()
    expect(sidebar.textContent).toContain('Escuadrón')
    expect(sidebar.textContent).toContain('Racha')
    expect(sidebar.textContent).toContain('Alertas')
    expect(sidebar.textContent).toContain('Los Inquebrantables')
    expect(sidebar.textContent).toContain('3 de 5 miembros')
    expect(sidebar.querySelector('[aria-current="page"]').textContent).toContain(
      'Mi hábito',
    )
    expect(element.querySelector('nav[aria-label="Navegación principal"]')).not.toBeNull()
  })

  it.each(['Leer 20 minutos', 'Ir al gimnasio', 'Estudiar 1 hora'])(
    'al seleccionar «%s» copia la idea al campo',
    (habit) => {
      const element = mount()
      const choice = [...element.querySelectorAll('input[name="idea-habito"]')].find(
        (radio) => radio.value === habit,
      )

      choice.click()

      expect(choice.checked).toBe(true)
      expect(element.querySelector('input[name="habito"]').value).toBe(habit)
      expect(element.querySelector('#habito-diario-contador').textContent).toBe(
        `${habit.length}/60`,
      )
    },
  )

  it('permite escribir un hábito personalizado y desmarca las ideas', () => {
    const element = mount()
    const input = enterHabit(element, 'Practicar guitarra')

    expect(input.value).toBe('Practicar guitarra')
    expect(element.querySelector('#habito-diario-contador').textContent).toBe(
      '18/60',
    )
    expect(
      [...element.querySelectorAll('input[name="idea-habito"]')].some(
        (radio) => radio.checked,
      ),
    ).toBe(false)
  })

  it('avisa si se intenta guardar sin elegir ni escribir un hábito', () => {
    const element = mount()

    submit(element)

    const input = element.querySelector('input[name="habito"]')
    expect(element.querySelector('[role="alert"]').textContent).toBe(
      'Elige una idea o escribe tu propio hábito.',
    )
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(localStorage.getItem(HABIT_STORAGE_KEY)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('guarda la idea elegida localmente y no llama a la red', () => {
    const element = mount()
    element.querySelector('input[name="idea-habito"]').click()

    submit(element)

    expect(localStorage.getItem(HABIT_STORAGE_KEY)).toBe('Leer 20 minutos')
    expect(element.querySelector('[role="status"]').textContent).toContain(
      'Hábito guardado en este dispositivo.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('guarda un hábito personalizado y lo recupera al volver a abrir la pantalla', () => {
    const element = mount()
    enterHabit(element, 'Practicar guitarra')
    submit(element)

    expect(localStorage.getItem(HABIT_STORAGE_KEY)).toBe('Practicar guitarra')
    expect(fetchMock).not.toHaveBeenCalled()

    const reopened = mount()
    expect(reopened.querySelector('input[name="habito"]').value).toBe(
      'Practicar guitarra',
    )
    expect(
      [...reopened.querySelectorAll('input[name="idea-habito"]')].some(
        (radio) => radio.checked,
      ),
    ).toBe(false)
  })
})
