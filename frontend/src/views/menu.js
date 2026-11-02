export function menuScreen() {
  const main = document.createElement('main')
  main.className =
    'mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-[#f4f2fb] px-6 py-10'

  const title = document.createElement('h1')
  title.className = 'text-3xl font-extrabold tracking-tight text-[#5b32ea]'
  title.textContent = 'Menú principal'

  const text = document.createElement('p')
  text.className = 'text-[#544f76]'
  text.textContent = 'Tu cuenta está creada.'

  const nav = document.createElement('nav')
  nav.className = 'flex flex-col gap-3'
  for (const [href, label] of [
    ['/habito', 'Mi hábito diario'],
    ['/escuadrones/votar', 'Revisar pruebas'],
    ['/escuadrones/nuevo', 'Crear un escuadrón'],
    ['/escuadrones/unirse', 'Unirme a un escuadrón'],
  ]) {
    const link = document.createElement('a')
    link.href = href
    link.dataset.link = ''
    link.className = 'font-medium text-[#5b32ea] underline'
    link.textContent = label
    nav.append(link)
  }

  main.append(title, text, nav)
  return main
}
