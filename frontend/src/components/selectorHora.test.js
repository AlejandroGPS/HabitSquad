import { afterEach, expect, it, vi } from 'vitest'
import { selectorHora } from './selectorHora.js'

afterEach(() => document.body.replaceChildren())
function mount(value = '20:00') {
  const input = document.createElement('input')
  input.type = 'time'
  input.value = value
  const picker = selectorHora(input)
  picker.dialog.showModal = vi.fn(() => { picker.dialog.open = true })
  picker.dialog.close = vi.fn(() => { picker.dialog.open = false; picker.dialog.dispatchEvent(new Event('close')) })
  document.body.replaceChildren(input, picker.trigger, picker.dialog)
  picker.trigger.click()
  const click = (text) => [...picker.dialog.querySelectorAll('button')].find((control) => control.textContent === text || control.getAttribute('aria-label') === text).click()
  return { ...picker, input, click }
}
it('aplica la hora elegida como cambio local y avisa al formulario', () => {
  const { input, dialog, trigger, click } = mount()
  const onInput = vi.fn()
  input.addEventListener('input', onInput)
  dialog.querySelector('[aria-label="Horas"]').value = '21'
  dialog.querySelector('[aria-label="Minutos"]').value = '35'
  expect(input.value).toBe('20:00')
  click('Aplicar hora')
  expect(input.value).toBe('21:35')
  expect(trigger.textContent).toBe('21:35')
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(onInput).toHaveBeenCalledOnce()
})
it('cancelar descarta la selección y vuelve a abrir con la hora original', () => {
  const { input, dialog, trigger, click } = mount()
  click('Aumentar horas')
  click('Cancelar')
  expect(input.value).toBe('20:00')
  trigger.click()
  expect(dialog.querySelector('[aria-label="Horas"]').value).toBe('20')
})
it('los controles recorren los límites de horas y minutos', () => {
  const { input, click } = mount('23:59')
  click('Aumentar horas')
  click('Aumentar minutos')
  click('Aplicar hora')
  expect(input.value).toBe('00:00')
})
