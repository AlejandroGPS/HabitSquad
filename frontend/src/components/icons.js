const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

const FLAME_PATH =
  'M12.3 2.2c.4 3-1.2 4.6-2.6 6.2C8.4 9.9 7 11.4 7 14a5 5 0 0 0 10 0c0-2.4-1.1-4-2.1-5.1-.1 1.3-.7 2.3-1.7 2.7.5-3.1-.2-6.6-.9-9.4z'

const OUTLINE_PATHS = {
  bell: ['M6 16V11a6 6 0 0 1 12 0v5l2 2H4z', 'M10 21h4'],
  book: ['M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z', 'M4 21V5', 'M8 7h7'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
  join: ['M14 4h5v16h-5', 'M10 16l4-4-4-4', 'M14 12H3'],
  logout: ['M10 4H5v16h5', 'M16 16l4-4-4-4', 'M20 12H9'],
  plus: ['M12 5v14', 'M5 12h14'],
  users: [
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7',
    'M16 3.5a4 4 0 0 1 0 7.5',
    'M22 21c0-3-1.8-5.6-4.5-6.6',
  ],
}

function svg(className) {
  const icon = document.createElementNS(SVG_NAMESPACE, 'svg')
  icon.setAttribute('viewBox', '0 0 24 24')
  icon.setAttribute('aria-hidden', 'true')
  icon.className.baseVal = className
  return icon
}

function path(d) {
  const node = document.createElementNS(SVG_NAMESPACE, 'path')
  node.setAttribute('d', d)
  return node
}

export function flameIcon(className = 'h-7 w-7 shrink-0') {
  const icon = svg(className)
  icon.setAttribute('fill', 'currentColor')
  icon.append(path(FLAME_PATH))
  return icon
}

export function icon(name, className = 'h-5 w-5 shrink-0', strokeWidth = 2) {
  if (name === 'flame') return flameIcon(className)
  const node = svg(className)
  node.setAttribute('fill', 'none')
  node.setAttribute('stroke', 'currentColor')
  node.setAttribute('stroke-width', String(strokeWidth))
  node.setAttribute('stroke-linecap', 'round')
  node.setAttribute('stroke-linejoin', 'round')
  node.append(...OUTLINE_PATHS[name].map(path))
  return node
}
