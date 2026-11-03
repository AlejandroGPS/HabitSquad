import { appMark } from '../brand.js'
import { element } from '../dom.js'
import { INK_SUAVE } from './textos.js'

function enlace(href, text) {
  const link = element('a', 'inline-flex min-h-11 items-center font-bold text-accent hover:underline', text)
  link.href = href
  link.dataset.link = ''
  return link
}

export function landingFooter() {
  return element(
    'footer',
    'mx-auto flex w-full max-w-md flex-col items-center gap-2 border-t border-black/10 px-4 pt-6 pb-10 text-center lg:max-w-6xl lg:flex-row lg:justify-between lg:px-8 lg:text-start',
    element(
      'div',
      'flex flex-col items-center gap-3 lg:flex-row',
      appMark('h-10 w-10'),
      element(
        'div',
        '',
        element('p', 'text-[1.125rem] font-black', 'HabitSquad'),
        element(
          'p',
          `text-[0.8125rem] font-semibold text-balance ${INK_SUAVE}`,
          'Grupo 05 · Gestión de Proyecto Software · Universidad de Zaragoza, 2026/27',
        ),
      ),
    ),
    element('nav', 'flex gap-6', enlace('/login', 'Iniciar sesión'), enlace('/registro', 'Registrarme')),
  )
}
