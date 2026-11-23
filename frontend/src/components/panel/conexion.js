import { element } from '../dom.js'

const ESTADOS_CONEXION = {
  conectado: { texto: 'En directo', punto: 'bg-[#248a3d] motion-safe:animate-pulse' },
  reconectando: { texto: 'Reconectando…', punto: 'bg-[#c93400]' },
  desconectado: { texto: 'Desconectado', punto: 'bg-ink-muted' },
}

export function conexionEnDirecto() {
  const nodo = element('p', 'flex items-center gap-1.5 text-[0.8125rem] font-bold text-ink-muted empty:hidden')
  nodo.setAttribute('aria-live', 'polite')
  return nodo
}

// Mientras se conecta por primera vez no se muestra nada, para que el aviso no parpadee al abrir el panel.
export function mostrarConexion(nodo, estado) {
  const datos = ESTADOS_CONEXION[estado]
  if (datos) nodo.dataset.estado = estado
  else delete nodo.dataset.estado
  nodo.replaceChildren(...(datos ? [element('span', `h-2 w-2 shrink-0 rounded-full ${datos.punto}`), datos.texto] : []))
}
