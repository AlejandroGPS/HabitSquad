import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter } from '../router.js'
import { guard, notFound, routes } from '../routes.js'
import { clearSession, saveSession } from '../session.js'

// Expectativas independientes de la lista que utiliza la vista.
const squads = [
  { id: 'inquebrantables', name: 'Los Inquebrantables', members: 3, streak: 12 },
  { id: 'gym-bros', name: 'Gym Bros', members: 2, streak: 7 },
  { id: 'paso-a-paso', name: 'Paso a paso', members: 4, streak: 5 },
]

describe('cambio de escuadrón desde el selector sin backend', () => {
  let root
  let router
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn(() => { throw new Error('El selector mock no debe consultar la red') })
    vi.stubGlobal('fetch', fetchMock)
    saveSession({ access: 'mock-access', refresh: 'mock-refresh' })
    window.history.replaceState({}, '', '/menu')
    root = document.createElement('div')
    document.body.replaceChildren(root)
    router = createRouter({ routes, notFound, root, guard })
    router.start()
  })

  afterEach(() => {
    router.stop()
    clearSession()
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
    vi.unstubAllGlobals()
  })

  function selectSquad(squad) {
    const entry = root.querySelector(`[aria-label="Abrir panel de ${squad.name}"]`)
    expect(entry).not.toBeNull()
    entry.click()
  }

  function expectPanel(squad) {
    expect(window.location.pathname).toBe('/escuadrones/panel')
    expect(new URLSearchParams(window.location.search).get('id')).toBe(squad.id)
    expect(root.querySelector('h1').textContent).toBe('Panel del escuadrón')
    expect(root.querySelector('h2').textContent).toBe(squad.name)
    expect(root.textContent).toContain(`${squad.streak} días`)
    expect(root.textContent).toContain(`${squad.members} miembros`)
  }

  it.each([
    { first: squads[0], second: squads[1] },
    { first: squads[1], second: squads[2] },
    { first: squads[2], second: squads[0] },
  ])('cambia de $first.name a $second.name al volver al selector y elegir otro', ({ first, second }) => {
    selectSquad(first)
    expectPanel(first)

    root.querySelector('a.squad-back').click()
    expect(root.querySelector('#squad-list-title').textContent).toBe('Mis escuadrones')

    selectSquad(second)
    expectPanel(second)
    expect(root.textContent).not.toContain(first.name)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('recupera el escuadrón seleccionado desde la URL al volver a montar el router', () => {
    selectSquad(squads[1])
    router.stop()
    root.replaceChildren()
    router = createRouter({ routes, notFound, root, guard })
    router.start()

    expectPanel(squads[1])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
