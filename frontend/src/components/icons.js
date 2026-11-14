const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

const FLAME_PATH =
  'M12.3 2.2c.4 3-1.2 4.6-2.6 6.2C8.4 9.9 7 11.4 7 14a5 5 0 0 0 10 0c0-2.4-1.1-4-2.1-5.1-.1 1.3-.7 2.3-1.7 2.7.5-3.1-.2-6.6-.9-9.4z'

const OUTLINE_PATHS = {
  back: ['m15 18-6-6 6-6'],
  dumbbell: ['M6 5v14M3 8v8M18 5v14M21 8v8M6 12h12'],
  leaf: ['M20 4C9 2 3 8 6 16c8 5 15-2 14-12z', 'M7 17 16 8'],
  route: ['M4 6h12a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h12', 'm17 15 3 3-3 3'],
  moon: ['M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11z'],
  pencil: ['m4 16 12-12 4 4L8 20H4z', 'm13 7 4 4'],
  bell: ['M6 16V11a6 6 0 0 1 12 0v5l2 2H4z', 'M10 21h4'],
  book: ['M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z', 'M4 21V5', 'M8 7h7'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  close: ['m18 6-12 12M6 6l12 12'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
  dumbbell: ['M6 7v10', 'M18 7v10', 'M3 9.5v5', 'M21 9.5v5', 'M6 12h12'],
  globe: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M3 12h18',
    'M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z',
  ],
  image: ['M4 5h16v14H4z', 'M4 16l5-5 4 4 2-2 5 5'],
  join: ['M14 4h5v16h-5', 'M10 16l4-4-4-4', 'M14 12H3'],
  leaf: ['M5 19c0-8 5-14 15-14 0 10-6 15-14 15', 'M5 19c3-4 6-6 9-8'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  logout: ['M10 4H5v16h5', 'M16 16l4-4-4-4', 'M20 12H9'],
  minus: ['M5 12h14'],
  plus: ['M12 5v14', 'M5 12h14'],
  refresh: ['M20 11a8 8 0 0 0-14.8-4.2', 'M4 4v4h4', 'M4 13a8 8 0 0 0 14.8 4.2', 'M20 20v-4h-4'],
  settings: ['M4 6h9', 'M17 6h3', 'M15 4v4', 'M4 12h3', 'M11 12h9', 'M9 10v4', 'M4 18h11', 'M19 18h1', 'M17 16v4'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  upload: ['M12 15V4', 'm7 9 5-5 5 5', 'M5 20h14'],
  userPlus: [
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M2 21c0-3.9 3.1-7 7-7 2 0 3.7.8 5 2',
    'M19 14v6',
    'M16 17h6',
  ],
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
