import fotoGimnasio from '../../assets/prueba-gimnasio.webp'
import fotoLeer from '../../assets/prueba-leer.webp'
import { element } from '../dom.js'
import { icon } from '../icons.js'
import { encabezadoSeccion, seccion } from './encabezado.js'
import { anim } from './escenasPasos.js'
import { INK_SUAVE } from './textos.js'

const SALIDA = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const REBOTE = 'cubic-bezier(0.3, 1.6, 0.5, 1)'

const COLORES = { C: 'bg-[#7c5cff]', L: 'bg-streak', A: 'bg-sky' }

export const PRUEBAS = [
  {
    nombre: 'Carlos',
    inicial: 'C',
    habito: 'Gimnasio',
    hora: '19:12',
    foto: fotoGimnasio,
    sello: { texto: 'Cumplido', clase: 'border-[#248a3d] text-[#248a3d]' },
    votos: [
      { inicial: 'L', si: true },
      { inicial: 'A', si: true },
    ],
    giro: '-4deg',
  },
  {
    nombre: 'Tú',
    inicial: 'A',
    habito: 'Leer 20 min',
    hora: '20:05',
    foto: fotoLeer,
    sello: { texto: 'Falta 1 voto', clase: 'border-[#c93400] text-[#c93400]' },
    votos: [
      { inicial: 'C', si: true },
      { inicial: 'L', si: false },
    ],
    giro: '3deg',
  },
  {
    nombre: 'Laura',
    inicial: 'L',
    habito: 'Meditar',
    pendiente: 'Quedan 3 h 41 min',
    giro: '-2deg',
  },
]

function avatar(inicial, className) {
  return element(
    'span',
    `grid shrink-0 place-items-center font-black text-white ${COLORES[inicial]} ${className}`,
    inicial,
  )
}

function votos(lista, retraso) {
  const aprobados = lista.filter((voto) => voto.si).length
  const caras = lista.map(({ inicial, si }, indice) =>
    anim(
      element(
        'span',
        'relative',
        avatar(inicial, `h-6 w-6 rounded-full text-[0.6875rem] ${si ? '' : 'opacity-35'}`),
        si &&
          element(
            'span',
            'absolute -right-1 -bottom-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#248a3d] text-white ring-2 ring-white',
            icon('check', 'h-2.5 w-2.5 shrink-0', 3.5),
          ),
      ),
      `paso-pop 0.4s ${REBOTE} ${retraso + indice * 180}ms backwards`,
    ),
  )
  return element(
    'span',
    'ms-auto flex items-center gap-1.5',
    element('span', 'flex gap-1.5', ...caras),
    element('span', 'sr-only', `${aprobados} de ${lista.length} votos`),
  )
}

function foto(prueba, retraso) {
  if (!prueba.foto) {
    return element(
      'div',
      'grid aspect-square place-items-center rounded-[0.25rem] border-2 border-dashed border-black/15 bg-[#f6f4fb] text-center',
      element(
        'div',
        'flex flex-col items-center gap-2 px-4',
        anim(
          element('span', 'grid h-12 w-12 place-items-center rounded-full bg-white text-ink-muted shadow-sm', icon('camera')),
          `muro-latido 2s ease-in-out ${retraso + 900}ms infinite`,
        ),
        element('p', 'font-black text-ink', 'Aún sin foto'),
        element('p', `text-[0.8125rem] font-bold ${INK_SUAVE}`, prueba.pendiente),
        anim(
          element(
            'span',
            'mt-1 rounded-full bg-accent px-3 py-1 text-[0.8125rem] font-extrabold text-white shadow-[0_6px_14px_-8px_rgb(91_44_240/0.8)]',
            'Carlos le ha dado un toque',
          ),
          `muro-toque 0.6s ${REBOTE} ${retraso + 1400}ms backwards`,
        ),
      ),
    )
  }
  const imagen = element('img', 'h-full w-full object-cover')
  Object.assign(imagen, { src: prueba.foto, alt: '', width: 560, height: 560, loading: 'lazy', decoding: 'async' })
  anim(imagen, `muro-revelar 1.4s ease-out ${retraso + 350}ms backwards`)
  return element('div', 'aspect-square overflow-hidden rounded-[0.25rem] bg-[#2a2a2e]', imagen)
}

function polaroid(prueba, indice) {
  const retraso = indice * 220
  const sello =
    prueba.sello &&
    anim(
      element(
        'span',
        `absolute top-6 right-5 rotate-[-10deg] rounded-lg border-[3px] bg-white/85 px-2.5 py-0.5 text-[0.875rem] font-black tracking-wide uppercase ${prueba.sello.clase}`,
        prueba.sello.texto,
      ),
      `muro-sello 0.45s ${REBOTE} ${retraso + 1500}ms backwards`,
    )

  const tarjeta = element(
    'div',
    'muro-polaroid relative rounded-[0.375rem] bg-white p-3 pb-4 shadow-[0_24px_40px_-24px_rgb(40_20_90/0.55),0_2px_6px_rgb(40_20_90/0.08)]',
    element('span', 'absolute -top-3 left-1/2 -ml-8 h-6 w-16 rotate-[-4deg] rounded-[2px] bg-[#ffe7a8]/80', ''),
    foto(prueba, retraso),
    sello,
    element(
      'div',
      'mt-3 flex items-center gap-2.5',
      avatar(prueba.inicial, 'h-9 w-9 rounded-xl text-[0.9375rem]'),
      element(
        'div',
        'min-w-0',
        element('p', 'leading-tight font-black', prueba.nombre),
        element(
          'p',
          'text-[0.8125rem] font-bold text-ink-muted',
          prueba.hora ? `${prueba.habito} · ${prueba.hora}` : prueba.habito,
        ),
      ),
      prueba.votos && votos(prueba.votos, retraso + 1100),
    ),
  )
  tarjeta.style.setProperty('--giro', prueba.giro)

  return anim(
    element(
      'li',
      [
        'w-[82%] max-w-[18rem] lg:w-72 lg:self-auto',
        indice % 2 ? 'self-end' : 'self-start',
        indice ? 'mt-6 lg:mt-0' : '',
        indice === 1 ? 'lg:mt-10' : '',
      ].join(' '),
      tarjeta,
    ),
    `muro-caer 0.7s ${SALIDA} ${retraso}ms backwards`,
  )
}

const TRAMOS = [
  { quien: 'Carlos', clase: 'bg-[#248a3d]' },
  { quien: 'Tú', clase: 'bg-[#ff9f5a]' },
  { quien: 'Laura', clase: 'bg-black/10' },
]

function cierreDia() {
  const tramos = TRAMOS.map(({ quien, clase }, indice) => {
    const tramo = element('span', `block h-2.5 w-12 origin-left rounded-full lg:w-16 ${clase}`)
    tramo.title = quien
    return anim(tramo, `muro-tramo 0.5s ${SALIDA} ${1700 + indice * 200}ms backwards`)
  })
  const racha = anim(
    element(
      'span',
      'ms-3 flex items-center gap-1.5 text-[1.5rem] font-black text-[#c93400]',
      icon('flame', 'h-7 w-7 shrink-0'),
      '12',
      element('span', 'text-[1.125rem] text-[#c93400]/35', '→ 13'),
    ),
    `paso-pop 0.45s ${REBOTE} 2.4s backwards`,
  )
  const barra = element('div', 'flex items-center justify-center gap-2', ...tramos, racha)
  barra.setAttribute('aria-hidden', 'true')
  return element(
    'div',
    'mt-12 lg:mt-16',
    barra,
    element('p', 'sr-only', 'Hoy ha cumplido 1 de 3. Racha: 12 días.'),
    anim(
      element('p', `mt-3 text-center text-[0.9375rem] font-bold ${INK_SUAVE}`, 'Si cumplís los tres, mañana 13.'),
      `paso-subir 0.5s ${SALIDA} 2.6s backwards`,
    ),
  )
}

function animarMuro(muro) {
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reducir || !('IntersectionObserver' in window)) return
  muro.dataset.animar = ''
  const observer = new IntersectionObserver(
    ([entrada]) => {
      if (!entrada.isIntersecting) return
      muro.dataset.visible = ''
      observer.disconnect()
    },
    { threshold: 0.3 },
  )
  observer.observe(muro)
}

export function escuadronSection() {
  const fotos = element(
    'ul',
    'mx-auto mt-10 flex max-w-sm flex-col lg:mt-14 lg:max-w-none lg:flex-row lg:items-start lg:justify-center lg:gap-x-8',
    ...PRUEBAS.map(polaroid),
  )
  fotos.setAttribute('aria-label', 'Fotos de hoy del escuadrón')

  const muro = element('div', 'muro', fotos, cierreDia())
  animarMuro(muro)

  return seccion(
    {
      id: 'tu-escuadron',
      tituloId: 'tu-escuadron-titulo',
      className: 'mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16',
    },
    encabezadoSeccion({
      id: 'tu-escuadron-titulo',
      kicker: 'Tu escuadrón',
      titulo: 'Cada día, una foto de cada uno',
      entradilla: 'Subes tu foto, solo la ve tu escuadrón y ellos la votan. Si estáis todos, la racha sigue.',
    }),
    muro,
  )
}
