import { ApiError, getDailyHabit, getSquad, uploadProof } from '../api.js'
import { appLayout } from '../components/appLayout.js'
import { element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import { tiempoRestante } from '../tiempo.js'

const CIERRE = '23:59'
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FOTO_BYTES = 5 * 1024 * 1024
const MAX_LADO = 1600
const PREDEFINED = { gimnasio: 'Ir al gimnasio', leer: 'Leer', estudiar: 'Estudiar' }

function habitText(habit) {
  if (!habit) return null
  return habit.opcion === 'otro' ? habit.texto_personalizado : PREDEFINED[habit.opcion]
}

export function votantes(miembros = []) {
  const otros = Math.max(miembros.length - 1, 0)
  if (otros === 0) return 'Aún no hay nadie más en el escuadrón'
  return otros === 1 ? '1 compañero' : `${otros} compañeros`
}

// Las fotos del móvil pueden pasar de 5 MB o venir en HEIC: se reducen a JPEG antes de enviarlas.
export async function prepararFoto(file) {
  if (TIPOS_FOTO.includes(file.type) && file.size <= MAX_FOTO_BYTES) return file
  try {
    const bitmap = await createImageBitmap(file)
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (blob && blob.size <= MAX_FOTO_BYTES) return new File([blob], 'prueba.jpg', { type: 'image/jpeg' })
  } catch {
    // El navegador no sabe abrir la imagen: se avisa al usuario más abajo.
  }
  return null
}

function errorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      const value = error.data?.foto ?? error.data?.detail
      if (Array.isArray(value)) return value.join(' ')
      if (typeof value === 'string') return value
      return 'La foto no es válida. Prueba con otra.'
    }
    if (error.status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
    if (error.status === 403) return 'No perteneces a este escuadrón.'
    if (error.status === 404) return 'El escuadrón ya no existe. Vuelve a Mis escuadrones.'
  }
  return 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.'
}

function fileInput({ camera }) {
  const input = element('input', 'sr-only')
  input.type = 'file'
  input.accept = TIPOS_FOTO.join(',')
  if (camera) input.setAttribute('capture', 'environment')
  return input
}

function infoCard(label, chip, ...children) {
  return element('section', 'relative min-w-0 rounded-[1.75rem] bg-white p-4 shadow-sm lg:p-5',
    element('p', 'text-[0.8125rem] font-extrabold text-[#6e6e73]', label),
    element('span', `absolute top-3.5 right-3.5 grid h-8 w-8 place-items-center rounded-xl ${chip[1]}`, icon(chip[0], 'h-4.5 w-4.5 shrink-0')),
    ...children)
}

export function pruebaDiaScreen({
  navigate,
  api = { getSquad, getDailyHabit, uploadProof },
  ahora = () => new Date(),
} = {}) {
  const squadId = new URLSearchParams(window.location.search).get('escuadron')
  const validSquadId = Boolean(squadId && /^[1-9]\d*$/.test(squadId))
  const panelHref = validSquadId ? `/escuadrones/panel?id=${squadId}` : '/'
  const habitTitle = element('span', '', 'Tu prueba de hoy')

  const camera = fileInput({ camera: true })
  camera.setAttribute('aria-label', 'Hacer la foto con la cámara')
  const gallery = fileInput({ camera: false })
  gallery.setAttribute('aria-label', 'Elegir una foto de la galería')
  const cameraButton = element('label', 'grid h-24 w-24 cursor-pointer place-items-center rounded-full bg-accent text-white shadow-[0_6px_0_rgb(63_31_179/0.35)] has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent has-disabled:cursor-default has-disabled:opacity-50',
    camera, icon('camera', 'h-9 w-9 shrink-0'))
  const galleryLabel = element('span', '', 'Elegir de la galería')
  const galleryButton = element('label', 'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent/10 px-5 font-bold text-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent has-disabled:cursor-default has-disabled:opacity-50',
    gallery, icon('image', 'h-4 w-4 shrink-0'), galleryLabel)
  const preview = element('img', 'max-h-[26rem] w-full rounded-[1.25rem] object-contain')
  preview.alt = 'Foto de prueba de hoy'
  preview.hidden = true
  const empty = element('div', 'flex flex-col items-center',
    element('h2', 'mt-5 text-lg font-black', 'Haz la foto ahora'),
    element('p', 'mt-2 max-w-[16rem] text-sm font-semibold text-[#6e6e73]', 'Que se vea bien lo que has hecho hoy.'))
  const dropzone = element('div', 'flex min-h-[20rem] flex-col items-center justify-center gap-4 rounded-[1.5rem] border-2 border-dashed border-[#d1d1d6] bg-[#f9f9fb] p-5 text-center lg:min-h-[24rem]',
    preview, cameraButton, empty, galleryButton)
  const photoCard = element('section', 'rounded-[1.75rem] bg-white p-3 shadow-sm lg:p-4', dropzone)

  const remaining = element('p', 'text-[0.8125rem] font-bold text-[#6e6e73]')
  const deadline = infoCard('Tienes hasta', ['clock', 'bg-[#e6f3ff] text-[#0878c9]'],
    element('p', 'mt-1 text-[1.875rem] leading-tight font-black', CIERRE), remaining)
  const voters = element('p', 'mt-2 text-[0.9375rem] font-extrabold', '—')
  const votersCard = infoCard('La votan', ['users', 'bg-[#e8f5ec] text-[#248a3d]'], voters,
    element('p', 'text-[0.8125rem] font-bold text-[#6e6e73]', 'Tu escuadrón'))

  const status = element('p', 'text-sm font-semibold text-[#6e6e73]')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  const error = element('p', 'text-sm font-bold text-red-700')
  error.setAttribute('role', 'alert')
  const retry = element('button', 'min-h-11 font-bold text-accent underline', 'Reintentar')
  retry.type = 'button'
  retry.hidden = true
  const chooseHabit = element('a', 'inline-flex min-h-11 items-center font-bold text-accent', 'Elegir mi hábito')
  chooseHabit.href = validSquadId ? `/habito?escuadron=${squadId}` : '/habito'
  chooseHabit.dataset.link = ''
  chooseHabit.hidden = true
  const backToPanel = element('a', 'inline-flex min-h-11 items-center font-bold text-accent', 'Volver al panel')
  backToPanel.href = panelHref
  backToPanel.dataset.link = ''
  backToPanel.hidden = true
  const notices = element('div', 'space-y-2', status, error, retry, chooseHabit, backToPanel)

  const sendLabel = element('span', '', 'Enviar prueba')
  const send = element('button', 'flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-[1.0625rem] font-extrabold text-white disabled:opacity-50',
    icon('upload'), sendLabel)
  send.type = 'button'

  const back = element('a', 'glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink')
  back.href = panelHref
  back.dataset.link = ''
  back.setAttribute('aria-label', 'Volver al panel')
  back.append(icon('back'))

  const body = element('div', 'mt-4 grid gap-4 px-4 lg:mt-6 lg:grid-cols-2 lg:px-0',
    photoCard,
    element('div', 'flex min-w-0 flex-col gap-4',
      element('div', 'grid grid-cols-2 gap-4', deadline, votersCard),
      notices,
      element('div', 'min-h-0 flex-1'),
      send))

  let loading = true
  let sending = false
  let ready = false
  let photo = null
  let sent = false
  let previewUrl = null

  function setPreview(src) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = src?.startsWith('blob:') ? src : null
    preview.hidden = !src
    if (src) preview.src = src
    else preview.removeAttribute('src')
    cameraButton.hidden = Boolean(src)
    empty.hidden = Boolean(src)
    galleryLabel.textContent = src ? 'Cambiar foto' : 'Elegir de la galería'
  }
  function sync() {
    const left = tiempoRestante(ahora(), CIERRE)
    remaining.textContent = left ? `Quedan ${left}` : 'El día ya se ha cerrado'
    camera.disabled = sending || !ready
    gallery.disabled = sending || !ready
    send.disabled = loading || sending || !ready || !photo || sent
    sendLabel.textContent = sending ? 'Enviando…' : sent ? 'Prueba enviada' : 'Enviar prueba'
    body.setAttribute('aria-busy', String(loading || sending))
  }

  async function load() {
    if (!validSquadId) {
      loading = false
      status.textContent = 'Elige primero un escuadrón en Mis escuadrones.'
      sync()
      return
    }
    loading = true
    retry.hidden = true
    chooseHabit.hidden = true
    error.textContent = ''
    status.textContent = 'Cargando tu hábito…'
    sync()
    try {
      const squad = await api.getSquad(squadId)
      voters.textContent = votantes(squad.miembros)
      const habit = habitText(await api.getDailyHabit(squadId))
      if (!habit) {
        status.textContent = 'Antes de subir una foto, elige tu hábito en este escuadrón.'
        chooseHabit.hidden = false
        return
      }
      habitTitle.textContent = habit
      ready = true
      status.textContent = ''
    } catch (cause) {
      status.textContent = ''
      error.textContent = errorMessage(cause)
      retry.hidden = false
    } finally {
      loading = false
      sync()
    }
  }

  async function choose(input) {
    const file = input.files?.[0]
    input.value = ''
    if (!file || sending) return
    error.textContent = ''
    status.textContent = 'Preparando la foto…'
    const prepared = await prepararFoto(file)
    if (!prepared) {
      status.textContent = ''
      error.textContent = 'Usa una foto JPG, PNG o WebP de menos de 5 MB.'
      return
    }
    photo = prepared
    sent = false
    backToPanel.hidden = true
    setPreview(URL.createObjectURL(prepared))
    status.textContent = 'Foto lista. Revísala y envíala.'
    sync()
  }

  camera.addEventListener('change', () => choose(camera))
  gallery.addEventListener('change', () => choose(gallery))
  retry.addEventListener('click', load)
  send.addEventListener('click', async () => {
    if (send.disabled) return
    sending = true
    error.textContent = ''
    status.textContent = ''
    sync()
    try {
      const proof = await api.uploadProof(squadId, photo)
      if (navigate) {
        if (page.isConnected) navigate(`/escuadrones/prueba?escuadron=${squadId}&registro=${proof.id}`)
        return
      }
      sent = true
      photo = null
      setPreview(proof.foto_url)
      status.textContent = 'Prueba enviada. Tu escuadrón ya puede verla y votarla.'
      backToPanel.hidden = false
    } catch (cause) {
      error.textContent = errorMessage(cause)
    } finally {
      sending = false
      sync()
    }
  })

  sync()
  void load()
  const page = appLayout({ active: 'habito', kicker: 'Mi hábito', title: habitTitle, leading: back, body, detail: true })
  if (validSquadId) {
    for (const link of page.querySelectorAll('a[href="/habito"]')) {
      link.href = `/habito?escuadron=${squadId}`
    }
  }
  return page
}
