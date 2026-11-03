import { element } from './dom.js'

const BASE = [
  'inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-full px-6',
  'text-[1.0625rem] font-bold transition-[transform,opacity] duration-75 active:scale-[0.98] active:opacity-85',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
].join(' ')

const VARIANTS = {
  primary: 'bg-accent text-white shadow-[0_6px_16px_-8px_rgb(91_44_240/0.7)] hover:bg-accent-hover',
  secondary: 'bg-white text-accent shadow-[0_1px_2px_rgb(0_0_0/0.08)]',
  onColor: 'bg-white text-accent',
}

export function pillClass(variant = 'primary') {
  return `${BASE} ${VARIANTS[variant]}`
}

export function pillLink({ href, variant = 'primary', className = '' }, ...children) {
  const link = element('a', `${pillClass(variant)} ${className}`.trim(), ...children)
  link.href = href
  link.dataset.link = ''
  return link
}
