// Avisos push de HabitSquad (contrato en docs/ALERTAS.md). El service worker que genera Workbox lo
// carga con importScripts (vite.config.js), así que se escribe como script clásico sobre `self`.
const AVISO = { title: 'HabitSquad', body: 'Todavía no has subido la prueba de hoy.' }

// El aviso no dice de qué escuadrón es: se abre «Mis escuadrones» para elegirlo.
const DESTINO = '/escuadrones'

function leerAviso(data) {
  try {
    const datos = data?.json()
    return datos && typeof datos === 'object' ? { ...AVISO, ...datos } : AVISO
  } catch {
    return AVISO
  }
}

self.addEventListener('push', (event) => {
  const aviso = leerAviso(event.data)
  event.waitUntil(self.registration.showNotification(aviso.title, {
    body: aviso.body,
    icon: '/icons/icon-192.png',
    lang: 'es',
    tag: 'aviso-prueba',
  }))
})

async function abrirApp() {
  const url = new URL(DESTINO, self.location.origin).href
  const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const ventana of ventanas) {
    try {
      await ventana.focus()
      await ventana.navigate(url)
      return
    } catch {
      // Una ventana que no controla este service worker no se puede llevar a otra página.
    }
  }
  await self.clients.openWindow(url)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(abrirApp())
})
