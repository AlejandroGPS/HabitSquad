export function element(tag, className = '', ...children) {
  const node = document.createElement(tag)
  node.className = className
  node.append(...children.flat().filter((child) => child != null && child !== false))
  return node
}

// Sin onClick el botón queda desactivado: así se ve qué acciones faltan por conectar.
export function button(className, onClick, ...children) {
  const node = element('button', className, ...children)
  node.type = 'button'
  if (onClick) node.addEventListener('click', onClick)
  else node.disabled = true
  return node
}
