import { element } from './dom.js'
import { icon } from './icons.js'

export const cardClass = [
  'relative rounded-[1.75rem] bg-white p-4 lg:p-5',
  'shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-14px_rgb(60_30_140/0.25)]',
].join(' ')

export const pillButtonClass = [
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-accent/10 px-4',
  'text-[0.9375rem] font-bold text-accent disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
].join(' ')

export function card(className = '', ...children) {
  return element('section', `${cardClass} ${className}`.trim(), ...children)
}

export function cardLabel(text, { icon: iconName, className = 'text-ink-muted' } = {}) {
  return element(
    'p',
    `flex items-center gap-1.5 text-[0.8125rem] font-extrabold ${className}`,
    iconName && icon(iconName, 'h-4 w-4 shrink-0'),
    text,
  )
}

export function cardChip(iconName, className) {
  return element(
    'span',
    `absolute top-3.5 right-3.5 grid h-8 w-8 place-items-center rounded-xl ${className}`,
    icon(iconName, 'h-4.5 w-4.5 shrink-0'),
  )
}

export function cardValue(text) {
  return element('p', 'text-[1.875rem] leading-tight font-black', text)
}

export function cardNote(text) {
  return element('p', 'text-[0.8125rem] font-bold text-ink-muted', text)
}

export function progressBars(colors, className = 'mt-2') {
  return element(
    'div',
    `${className} flex gap-1`,
    ...colors.map((color) => element('span', `h-2.5 flex-1 rounded-full ${color}`)),
  )
}
