export function element(tag, className = '', ...children) {
  const node = document.createElement(tag)
  node.className = className
  node.append(...children.flat().filter((child) => child != null && child !== false))
  return node
}

// Sin onClick el botón queda desactivado: así se ve qué acciones faltan por conectar.
// Tailwind v4 ya no pone mano en los button: la añadimos aquí salvo que la clase ya fije el cursor.
export function button(className, onClick, ...children) {
  const classes = String(className || '')
  const withCursor = /\bcursor-/.test(classes) ? classes : `${classes} cursor-pointer`.trim()
  const node = element('button', withCursor, ...children)
  node.type = 'button'
  if (onClick) node.addEventListener('click', onClick)
  else node.disabled = true
  return node
}
