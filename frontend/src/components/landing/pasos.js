import { element } from '../dom.js'
import { encabezadoSeccion, seccion } from './encabezado.js'
import { anim, escenaEscuadron, escenaHabito, escenaPrueba } from './escenasPasos.js'

const SALIDA = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const PAUSA_ENTRE_PASOS = 700

export const PASOS = [
  {
    escena: escenaHabito,
    titulo: 'Elige tu hábito',
    texto: 'Uno solo y tuyo: leer 20 minutos, ir al gimnasio, meditar…',
  },
  {
    escena: escenaEscuadron,
    titulo: 'Forma tu escuadrón',
    texto: 'Crea uno y pasa el código de 6 caracteres a tus amigos o a tu pareja.',
  },
  {
    escena: escenaPrueba,
    titulo: 'Demuéstralo cada día',
    texto: 'Sube una foto antes de las 23:59. Si todos cumplís, la racha suma un día.',
  },
]

function conector() {
  const node = element(
    'span',
    [
      'paso-conector absolute top-10 -bottom-7 left-5 -ml-0.5 w-1 rounded-full bg-accent/15',
      'lg:top-[15.375rem] lg:right-[calc(-50%+0.25rem)] lg:bottom-auto lg:left-[calc(50%+1.75rem)] lg:ml-0 lg:h-1 lg:w-auto',
    ].join(' '),
    element('span', 'block h-full w-full origin-top rounded-full bg-accent lg:origin-left'),
  )
  node.setAttribute('aria-hidden', 'true')
  return node
}

function paso({ escena, titulo, texto }, indice, { ultimo }) {
  const marca = anim(
    element(
      'span',
      'col-start-1 row-start-1 -mt-1.5 grid h-10 w-10 place-items-center rounded-full bg-accent font-black text-white shadow-[0_0_0_6px_rgb(91_50_234/0.15)] lg:row-start-2 lg:mx-auto lg:mt-5',
      String(indice + 1),
    ),
    `paso-pop 0.4s cubic-bezier(0.3, 1.6, 0.5, 1) both`,
  )
  const ilustracion = escena()
  ilustracion.classList.add('col-start-2', 'row-start-2', 'mt-4', 'lg:col-start-1', 'lg:row-start-1', 'lg:mt-0')
  ilustracion.setAttribute('aria-hidden', 'true')

  const textos = anim(
    element(
      'div',
      'col-start-2 row-start-1 lg:col-start-1 lg:row-start-3 lg:mt-4 lg:text-center',
      element('p', 'sr-only', `Paso ${indice + 1}`),
      element('h3', 'text-[1.25rem] leading-snug font-black', titulo),
      element('p', 'mt-1 text-[0.9375rem] font-semibold text-pretty text-ink-muted', texto),
    ),
    `paso-subir 0.5s ${SALIDA} 0.25s both`,
  )

  return element(
    'li',
    'paso relative grid grid-cols-[2.5rem_1fr] gap-x-4 lg:grid-cols-1 lg:gap-x-0',
    !ultimo && conector(),
    marca,
    ilustracion,
    textos,
  )
}

function repetir(escena) {
  const animados = [escena, ...escena.querySelectorAll('[data-anim]')]
  for (const node of animados) node.style.animation = 'none'
  void escena.offsetWidth
  for (const node of animados) node.style.animation = ''
}

// Los pasos se encienden en orden aunque entren varios a la vez en pantalla.
export function animarPasos(lista, pasos) {
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reducir || !('IntersectionObserver' in window)) return

  lista.dataset.animar = ''
  let vistos = -1
  let activos = 0
  let esperando = false

  function avanzar() {
    if (esperando || activos > vistos || activos >= pasos.length) return
    if (activos > 0) pasos[activos - 1].dataset.conectado = ''
    pasos[activos].dataset.activo = ''
    activos += 1
    esperando = true
    setTimeout(() => {
      esperando = false
      avanzar()
    }, PAUSA_ENTRE_PASOS)
  }

  for (const node of pasos) {
    const escena = node.querySelector('.paso-escena')
    let ultima = 0
    escena.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || activos < pasos.length || Date.now() - ultima < 2500) return
      ultima = Date.now()
      repetir(escena)
    })
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) vistos = Math.max(vistos, pasos.indexOf(entry.target))
      }
      avanzar()
      if (vistos === pasos.length - 1) observer.disconnect()
    },
    { threshold: 0.35 },
  )
  for (const node of pasos) observer.observe(node)
}

export function pasosSection() {
  const pasos = PASOS.map((datos, indice) => paso(datos, indice, { ultimo: indice === PASOS.length - 1 }))
  const lista = element(
    'ol',
    'pasos relative mx-auto mt-8 grid max-w-md gap-10 lg:mt-12 lg:max-w-6xl lg:grid-cols-3 lg:gap-6',
    ...pasos,
  )
  animarPasos(lista, pasos)

  return seccion(
    { id: 'como-funciona', tituloId: 'como-funciona-titulo', className: 'px-4 py-10 lg:px-8 lg:py-14' },
    encabezadoSeccion({ id: 'como-funciona-titulo', kicker: 'Cómo funciona', titulo: 'Tres pasos y a por la racha' }),
    lista,
  )
}
