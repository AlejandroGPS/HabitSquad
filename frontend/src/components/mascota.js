import mascotUrl from '../assets/mascota.webp'

export function mascota(className = 'h-24 w-auto') {
  const image = document.createElement('img')
  image.className = `${className} shrink-0 select-none`
  image.src = mascotUrl
  image.alt = ''
  image.width = 312
  image.height = 360
  image.decoding = 'async'
  image.draggable = false
  return image
}
