import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

const codigo = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../public/sw-avisos.js'), 'utf8')

function ventanaFalsa({ navegable = true } = {}) {
  return {
    focus: vi.fn().mockResolvedValue(undefined),
    navigate: navegable ? vi.fn().mockResolvedValue(undefined) : vi.fn().mockRejectedValue(new TypeError('no controlada')),
  }
}

function cargarServiceWorker({ ventanas = [] } = {}) {
  const oyentes = {}
  const self = {
    location: { origin: 'https://habitsquad.example' },
    registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
    clients: { matchAll: vi.fn().mockResolvedValue(ventanas), openWindow: vi.fn().mockResolvedValue(null) },
    addEventListener: (tipo, oyente) => { oyentes[tipo] = oyente },
  }
  new Function('self', codigo)(self)

  async function lanzar(tipo, evento) {
    let pendiente
    oyentes[tipo]({ ...evento, waitUntil: (promesa) => { pendiente = promesa } })
    await pendiente
  }
  return { self, lanzar }
}

const datos = (valor) => ({ json: () => (valor instanceof Error ? (() => { throw valor })() : valor) })

describe('service worker de avisos: push', () => {
  it('muestra el aviso que manda el servidor', async () => {
    const { self, lanzar } = cargarServiceWorker()
    await lanzar('push', { data: datos({ title: 'HabitSquad', body: 'Todavía no has subido la prueba de hoy.' }) })

    expect(self.registration.showNotification).toHaveBeenCalledWith('HabitSquad', {
      body: 'Todavía no has subido la prueba de hoy.',
      icon: '/icons/icon-192.png',
      lang: 'es',
      tag: 'aviso-prueba',
    })
  })

  it('completa con el texto por defecto lo que no venga en el aviso', async () => {
    const { self, lanzar } = cargarServiceWorker()
    await lanzar('push', { data: datos({ body: 'Quedan dos horas.' }) })

    expect(self.registration.showNotification).toHaveBeenCalledWith('HabitSquad', expect.objectContaining({ body: 'Quedan dos horas.' }))
  })

  it('sin datos o con datos que no son JSON muestra el aviso por defecto', async () => {
    const { self, lanzar } = cargarServiceWorker()
    await lanzar('push', { data: null })
    await lanzar('push', { data: datos(new SyntaxError('Unexpected token')) })
    await lanzar('push', { data: datos('texto suelto') })

    expect(self.registration.showNotification).toHaveBeenCalledTimes(3)
    for (const [titulo, opciones] of self.registration.showNotification.mock.calls) {
      expect(titulo).toBe('HabitSquad')
      expect(opciones.body).toBe('Todavía no has subido la prueba de hoy.')
    }
  })
})

describe('service worker de avisos: pulsar el aviso', () => {
  it('cierra el aviso y lleva una ventana abierta a Mis escuadrones', async () => {
    const ventana = ventanaFalsa()
    const notification = { close: vi.fn() }
    const { self, lanzar } = cargarServiceWorker({ ventanas: [ventana] })
    await lanzar('notificationclick', { notification })

    expect(notification.close).toHaveBeenCalledOnce()
    expect(self.clients.matchAll).toHaveBeenCalledWith({ type: 'window', includeUncontrolled: true })
    expect(ventana.focus).toHaveBeenCalledOnce()
    expect(ventana.navigate).toHaveBeenCalledWith('https://habitsquad.example/escuadrones')
    expect(self.clients.openWindow).not.toHaveBeenCalled()
  })

  it('si no hay ventanas abiertas abre una nueva', async () => {
    const { self, lanzar } = cargarServiceWorker()
    await lanzar('notificationclick', { notification: { close: vi.fn() } })

    expect(self.clients.openWindow).toHaveBeenCalledWith('https://habitsquad.example/escuadrones')
  })

  it('salta las ventanas que no puede mover y abre una nueva si ninguna sirve', async () => {
    const ajena = ventanaFalsa({ navegable: false })
    const { self, lanzar } = cargarServiceWorker({ ventanas: [ajena] })
    await lanzar('notificationclick', { notification: { close: vi.fn() } })

    expect(ajena.navigate).toHaveBeenCalled()
    expect(self.clients.openWindow).toHaveBeenCalledWith('https://habitsquad.example/escuadrones')
  })
})
