import { element } from '../dom.js'
import { icon } from '../icons.js'

const SALIDA = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const REBOTE = 'cubic-bezier(0.3, 1.6, 0.5, 1)'

export function anim(node, ...animaciones) {
  node.dataset.anim = ''
  node.style.setProperty('--anim', animaciones.join(', '))
  return node
}

function escena(fondo, ...children) {
  return anim(
    element(
      'div',
      `paso-escena relative grid h-52 place-items-center overflow-hidden rounded-[2rem] bg-gradient-to-br ring-1 ring-white/70 ${fondo}`,
      ...children,
    ),
    `paso-aparecer 0.5s ${SALIDA} both`,
  )
}

function checkBadge(className, retraso) {
  return anim(
    element(
      'span',
      `absolute grid h-6 w-6 place-items-center rounded-full bg-[#248a3d] text-white ring-2 ring-white ${className}`,
      icon('check', 'h-3.5 w-3.5 shrink-0', 3.2),
    ),
    `paso-pop 0.4s ${REBOTE} ${retraso} both`,
  )
}

const HABITOS = [
  { icono: 'book', texto: 'Leer 20 min' },
  { icono: 'dumbbell', texto: 'Ir al gimnasio' },
  { icono: 'leaf', texto: 'Meditar' },
]

export function escenaHabito() {
  const chips = HABITOS.map(({ icono, texto }, indice) => {
    const elegido = indice === 0
    const chip = element(
      'span',
      [
        'relative flex items-center gap-2 rounded-full px-4 py-2 text-[0.9375rem] font-extrabold',
        'shadow-[0_6px_16px_-10px_rgb(60_30_140/0.5)]',
        elegido ? 'bg-accent text-white' : 'bg-white text-ink opacity-45',
      ].join(' '),
      icon(icono, 'h-4.5 w-4.5 shrink-0'),
      texto,
      elegido && checkBadge('-top-1.5 -right-1.5', '1.25s'),
    )
    if (elegido) {
      anim(chip, `paso-elegir 0.35s ease-out 1s both`, `paso-flotar 3s ease-in-out 1.8s infinite`)
    } else {
      anim(chip, `paso-apagar 0.35s ease-out 1s both`)
    }
    return anim(element('span', 'flex', chip), `paso-entrar 0.45s ${SALIDA} ${200 + indice * 120}ms both`)
  })
  return escena('from-[#f1ecff] to-[#e2d8ff]', element('div', 'flex flex-col items-center gap-2.5', ...chips))
}

const MIEMBROS = [
  { inicial: 'C', color: 'bg-[#7c5cff]', posicion: 'left-2 top-5', desde: '-2.5rem 1rem' },
  { inicial: 'A', color: 'bg-sky', posicion: 'top-0 left-1/2 -ml-5', desde: '0 -2.5rem' },
  { inicial: 'L', color: 'bg-streak', posicion: 'right-2 top-5', desde: '2.5rem 1rem' },
]

export function escenaEscuadron({ codigo = 'K7P2QX' } = {}) {
  const latido = anim(
    element('span', 'absolute inset-0 rounded-2xl border-2 border-accent opacity-0'),
    `paso-latido 1.8s ease-out 1.5s infinite`,
  )
  const centro = anim(
    element(
      'span',
      'absolute bottom-0 left-1/2 -ml-7 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-[1.25rem] font-black text-white shadow-[0_10px_24px_-10px_rgb(91_44_240/0.8)]',
      latido,
      'LI',
    ),
    `paso-pop 0.45s ${REBOTE} 0.2s both`,
  )
  const miembros = MIEMBROS.map(({ inicial, color, posicion, desde }, indice) => {
    const avatar = element(
      'span',
      `absolute grid h-10 w-10 place-items-center rounded-xl font-black text-white ring-2 ring-white ${color} ${posicion}`,
      inicial,
    )
    avatar.style.setProperty('--desde', desde)
    return anim(avatar, `paso-unirse 0.55s ${SALIDA} ${500 + indice * 150}ms both`)
  })
  const letras = [...codigo].map((letra, indice) =>
    anim(element('span', '', letra), `paso-tecla 0.3s ease-out ${1150 + indice * 80}ms both`),
  )
  const pill = anim(
    element(
      'span',
      'mt-3 flex rounded-full bg-white px-4 py-1.5 font-black tracking-[0.25em] text-ink shadow-[0_6px_16px_-10px_rgb(0_60_140/0.5)]',
      ...letras,
    ),
    `paso-subir 0.35s ${SALIDA} 1s both`,
  )
  return escena(
    'from-[#eaf4ff] to-[#d3e7ff]',
    element(
      'div',
      'flex flex-col items-center',
      element('div', 'relative h-28 w-48', centro, ...miembros),
      pill,
    ),
  )
}

export function escenaPrueba({ antes = 11 } = {}) {
  const flash = anim(
    element('span', 'pointer-events-none absolute inset-0 bg-white opacity-0'),
    `paso-flash 0.6s ease-out 0.35s both`,
  )
  const foto = anim(
    element(
      'span',
      'relative block rotate-[-6deg] rounded-xl bg-white p-2 pb-5 shadow-[0_12px_24px_-12px_rgb(120_40_0/0.6)]',
      element(
        'span',
        'grid h-20 w-24 place-items-center rounded-md bg-gradient-to-br from-[#ffb27a] to-[#d4460c] text-white',
        icon('image', 'h-8 w-8 shrink-0'),
      ),
      checkBadge('-top-2 -right-2', '1.1s'),
    ),
    `paso-caer 0.6s ${SALIDA} 0.5s both`,
  )
  const contador = element(
    'span',
    'flex flex-col [translate:0_-50%]',
    element('span', 'h-[1.25em]', String(antes)),
    element('span', 'h-[1.25em]', String(antes + 1)),
  )
  anim(contador, `paso-contar 0.45s ${REBOTE} 1.55s both`)
  const llama = anim(icon('flame', 'h-5 w-5 shrink-0'), `paso-flotar 1.6s ease-in-out 2s infinite`)
  const racha = anim(
    element(
      'span',
      'flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 font-black text-[#c93400] shadow-[0_6px_16px_-10px_rgb(120_40_0/0.5)]',
      llama,
      element('span', 'h-[1.25em] overflow-hidden leading-[1.25em]', contador),
      'días',
    ),
    `paso-subir 0.35s ${SALIDA} 1.25s both`,
  )
  return escena(
    'from-[#fff3ea] to-[#ffdcc4]',
    element('div', 'flex flex-col items-center gap-4', foto, racha),
    flash,
  )
}
