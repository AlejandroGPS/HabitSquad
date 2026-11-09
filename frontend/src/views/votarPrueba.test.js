import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter } from '../router.js'
import { guard, notFound, routes } from '../routes.js'
import { clearSession, saveSession } from '../session.js'

const proofPath = '/api/escuadrones/7/pruebas/21/'
const votesPath = `${proofPath}votos/`
const voteUrl = '/escuadrones/prueba?escuadron=7&registro=21'
const squad = {
  nombre: 'Lectores',
  codigo_invitacion: 'ABC123',
  miembros: [
    { usuario_id: 1, nombre: 'Laura', habito: { opcion: 'leer' }, prueba_hoy: { id: 21, estado: 'pendiente' } },
    { usuario_id: 2, nombre: 'Carlos' },
    { usuario_id: 3, nombre: 'Ana', es_usuario: true },
  ],
}
const proof = { id: 21, usuario_id: 1, fecha: '2026-11-09', foto_url: 'https://example.com/prueba.jpg' }
const initial = {
  estado: 'pendiente',
  votos_si: 1,
  votantes_elegibles: 2,
  voto_propio: null,
  votos: [{ usuario_id: 2, voto: 'sí' }],
}
const response = (status, data) => ({ ok: status < 400, status, json: async () => data })

describe('validación de una prueba desde el escuadrón', () => {
  let router
  let fetchMock
  let voting
  let voteResponse
  let squadResponse
  let uploadResponse
  let ownHabit

  beforeEach(() => {
    saveSession({ access: 'access', refresh: 'refresh' })
    voting = initial
    squadResponse = squad
    ownHabit = null
    uploadResponse = null
    fetchMock = vi.fn(async (path, options) => {
      if (path === '/api/escuadrones/7/') return response(200, squadResponse)
      if (path === '/api/escuadrones/7/habito/') return response(200, ownHabit)
      if (path === '/api/escuadrones/7/prueba/' && options.method === 'POST') return uploadResponse()
      if (path === proofPath) return response(200, proof)
      if (path === votesPath) return options.method === 'POST' ? voteResponse() : response(200, voting)
      throw new Error(`Petición inesperada: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    router.stop()
    clearSession()
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
    vi.unstubAllGlobals()
  })

  function start(path = voteUrl) {
    window.history.replaceState({}, '', path)
    router = createRouter({ root: document.body, routes, notFound, guard })
    router.start()
  }

  const button = (label) => [...document.querySelectorAll('button')].find((node) => node.textContent === label)
  const votes = () => document.querySelector('[aria-label="Votos de la prueba"]')
  const posts = () => fetchMock.mock.calls.filter(([path, options]) => path === votesPath && options.method === 'POST')

  it('abre la prueba real desde el panel y conserva el contexto al volver', async () => {
    start('/escuadrones/panel?id=7')
    await vi.waitFor(() => expect(button('Votar')).toBeDefined())
    button('Votar').click()

    expect(window.location.pathname + window.location.search).toBe(voteUrl)
    await vi.waitFor(() => expect(votes().textContent).toContain('1 de 2'))
    expect(votes().textContent).toContain('Carlosha dicho que sí')
    expect(votes().textContent).toContain('Te falta tu voto')
    expect(document.querySelector('img[alt="Foto de prueba de Laura"]').src).toBe(proof.foto_url)
    expect(document.body.textContent).toContain('Leer')
    expect(fetchMock).toHaveBeenCalledWith(proofPath, expect.objectContaining({ headers: expect.any(Headers) }))

    document.querySelector('[aria-label="Volver al escuadrón"]').click()
    expect(window.location.pathname + window.location.search).toBe('/escuadrones/panel?id=7')
  })

  it('sube la foto del autor desde el panel y permite abrirla sin autovoto', async () => {
    const author = { ...squad.miembros[0], es_usuario: true, prueba_hoy: null }
    ownHabit = author.habito
    squadResponse = { ...squad, miembros: [author, squad.miembros[1]] }
    uploadResponse = async () => {
      squadResponse = {
        ...squadResponse,
        miembros: [{ ...author, prueba_hoy: { id: proof.id, estado: 'pendiente' } }, squad.miembros[1]],
      }
      return response(201, proof)
    }

    start('/escuadrones/panel?id=7')
    await vi.waitFor(() => expect(button('Subir foto de prueba').disabled).toBe(false))
    const input = document.querySelector('input[type="file"]')
    const photo = new File(['foto'], 'prueba.png', { type: 'image/png' })
    button('Subir foto de prueba').click()
    Object.defineProperty(input, 'files', { value: [photo] })
    input.dispatchEvent(new Event('change'))

    await vi.waitFor(() => expect(votes().textContent).toContain('Es tu prueba'))
    expect(window.location.pathname + window.location.search).toBe(voteUrl)
    expect(button('Sí, cuenta')).toBeUndefined()
    const [, request] = fetchMock.mock.calls.find(([path]) => path === '/api/escuadrones/7/prueba/')
    expect(request.headers.get('Authorization')).toBe('Bearer access')
    expect(request.headers.has('Content-Type')).toBe(false)
    expect(request.body.get('foto')).toBe(photo)

    document.querySelector('[aria-label="Volver al escuadrón"]').click()
    await vi.waitFor(() => expect(button('Ver mi prueba')).toBeDefined())
    expect(button('Subir foto de prueba')).toBeUndefined()
  })

  it.each([
    ['Sí, cuenta', 'sí', 2, 'cumplido', 'Cumplido'],
    ['No cuenta', 'no', 1, 'pendiente', 'Pendiente'],
  ])('envía %s una sola vez y pinta el resultado persistido', async (label, voto, count, state, statusLabel) => {
    let finish
    voteResponse = () => new Promise((resolve) => { finish = resolve })
    start()
    await vi.waitFor(() => expect(button(label).disabled).toBe(false))
    button(label).click()
    button('No cuenta').dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(button('Sí, cuenta').disabled).toBe(true)
    expect(button('No cuenta').disabled).toBe(true)
    expect(posts()).toHaveLength(1)
    const [, options] = posts()[0]
    expect(options.headers.get('Authorization')).toBe('Bearer access')
    expect(JSON.parse(options.body)).toEqual({ voto })

    voting = {
      ...initial,
      estado: state,
      votos_si: count,
      voto_propio: voto,
      votos: [...initial.votos, { usuario_id: 3, voto }],
    }
    finish(response(201, voting))

    await vi.waitFor(() => expect(document.body.textContent).toContain('Voto registrado.'))
    expect(votes().textContent).toContain(`${count} de 2`)
    expect(votes().textContent).toContain(statusLabel)
    expect(votes().textContent).toContain(`Túha dicho que ${voto}`)
    router.navigate(voteUrl)
    await vi.waitFor(() => expect(button(label).disabled).toBe(true))
    expect(votes().textContent).toContain(`Túha dicho que ${voto}`)
  })

  it.each([400, 409])('vuelve a consultar la votación si el servidor rechaza un voto con %s', async (status) => {
    voteResponse = async () => {
      voting = status === 400
        ? { ...initial, estado: 'no_cumplido' }
        : { ...initial, voto_propio: 'no' }
      return response(status, { detail: 'La votación ha cambiado.' })
    }
    start()
    await vi.waitFor(() => expect(button('Sí, cuenta').disabled).toBe(false))
    button('Sí, cuenta').click()

    await vi.waitFor(() => expect(votes().textContent).toContain(status === 400 ? 'No cumplido' : 'Túha dicho que no'))
    expect(document.querySelector('[role="alert"]').textContent).toContain('La votación ha cambiado.')
    expect(button('Sí, cuenta').disabled).toBe(true)
    expect(button('No cuenta').disabled).toBe(true)
    expect(posts()).toHaveLength(1)
  })

  it('permite al autor ver la foto y el recuento sin mostrar botones de voto', async () => {
    squadResponse = { ...squad, miembros: [{ ...squad.miembros[0], es_usuario: true }, squad.miembros[1]] }
    start()
    await vi.waitFor(() => expect(votes().textContent).toContain('Es tu prueba'))
    expect(button('Sí, cuenta')).toBeUndefined()
    expect(button('No cuenta')).toBeUndefined()
    expect(posts()).toHaveLength(0)
  })

  it('requiere sesión para acceder directamente a una prueba', () => {
    clearSession()
    start()
    expect(window.location.pathname).toBe('/login')
    expect(new URLSearchParams(window.location.search).get('siguiente')).toBe(voteUrl)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
