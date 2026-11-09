import { ApiError, castProofVote, getProof, getProofVotes, getSquad } from '../api.js'
import { appLayout } from '../components/appLayout.js'
import { iniciales } from '../components/avatar.js'
import { button, element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import { alertasBoton, escuadronResumen } from '../components/panel/cabecera.js'
import { ESTADOS } from '../components/panel/estados.js'
import { habitText } from './habitoDiario.js'

const cardStyle = 'rounded-3xl border-2 border-white bg-white/85 shadow-sm'
const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'UTC' })
const voteButtonStyle = 'flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50'

function photoCard(proof, name) {
  const image = element('img', 'absolute inset-0 h-full w-full object-contain')
  image.alt = `Foto de prueba de ${name}`
  image.src = proof.foto_url
  const fallback = element('p', 'px-4 text-center text-sm font-bold text-ink-muted', 'No se ha podido mostrar la foto. Vuelve a cargar la pantalla.')
  fallback.hidden = true
  image.addEventListener('error', () => {
    image.hidden = true
    fallback.hidden = false
  })
  const caption = element('figcaption', 'absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-full bg-[#351c5d]/80 px-3 py-2 text-white',
    element('span', 'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c93400] text-xs font-black', iniciales(name)),
    element('div', 'min-w-0',
      element('p', 'truncate text-sm font-extrabold', name),
      element('p', 'text-xs text-white/85', dateFormat.format(new Date(proof.fecha)))))
  return element('div', `${cardStyle} self-start p-2.5 sm:p-3`,
    element('figure', 'relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl bg-accent-soft pb-12 lg:aspect-square',
      image, fallback, caption))
}

function voterRow(name, vote, pendingMessage) {
  const color = vote === 'sí' ? 'bg-[#248a3d] text-white' : 'bg-red-100 text-red-700'
  return element('li', 'flex items-center gap-2 text-sm',
    element('span', `grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black ${vote ? color : 'bg-fill text-ink-muted'}`,
      vote ? icon(vote === 'sí' ? 'check' : 'close', 'h-4 w-4') : iniciales(name)),
    element('span', 'font-extrabold', name),
    element('span', 'font-semibold text-ink-muted', vote ? `ha dicho que ${vote}` : pendingMessage))
}

function voteDetails(result, nameFor, viewerId, isAuthor) {
  const voters = result.votos
    .filter(({ usuario_id }) => usuario_id !== viewerId)
    .map(({ usuario_id, voto }) => voterRow(nameFor(usuario_id), voto))
  if (!isAuthor && (result.estado === 'pendiente' || result.voto_propio)) {
    voters.push(voterRow('Tú', result.voto_propio, 'Te falta tu voto'))
  }
  return [
    element('div', 'flex items-start justify-between gap-3',
      element('div', '',
        element('h2', 'text-sm font-bold text-ink-muted', 'Votos a favor'),
        element('p', 'text-2xl leading-tight font-black', `${result.votos_si} de ${result.votantes_elegibles}`)),
      element('span', 'grid h-8 w-8 place-items-center rounded-xl bg-success/10 text-success', icon('users', 'h-4 w-4'))),
    element('ul', 'mt-2 space-y-1.5', voters),
    element('p', 'mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm font-extrabold text-accent',
      isAuthor && result.estado === 'pendiente' ? 'Pendiente · Es tu prueba' : ESTADOS[result.estado].texto),
  ]
}

function requestError(error, sending) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
    if (error.status === 403) return 'No tienes acceso a esta prueba.'
    if (error.status === 404) return 'No se ha encontrado esta prueba.'
    if ([400, 409].includes(error.status)) return error.data?.detail ?? error.data?.voto?.[0] ?? 'El voto no se ha podido registrar.'
  }
  return sending ? 'No se ha podido confirmar tu voto. Comprueba el estado de la votación.' : 'No se ha podido cargar la prueba. Comprueba tu conexión.'
}

export function votarPruebaScreen() {
  const params = new URLSearchParams(window.location.search)
  const squadId = params.get('escuadron')
  const proofId = params.get('registro')
  const validId = (value) => /^[1-9]\d*$/.test(value ?? '')
  const back = element('a', 'glass grid h-10 w-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-accent', icon('back'))
  back.href = validId(squadId) ? `/escuadrones/panel?id=${squadId}` : '/'
  back.dataset.link = ''
  back.setAttribute('aria-label', 'Volver al escuadrón')

  const title = element('span', '', 'Validar prueba')
  const footer = element('div')
  const status = element('p', 'text-sm font-semibold text-ink-muted')
  status.setAttribute('role', 'status')
  const error = element('p', 'text-sm font-bold text-red-700')
  error.setAttribute('role', 'alert')
  const retry = button('min-h-11 font-bold text-accent underline', load, 'Volver a cargar')
  retry.hidden = true
  const content = element('div')
  const body = element('div', 'mt-4 px-4 lg:mt-6 lg:px-0', content, status, error, retry)
  const screen = appLayout({
    active: 'escuadron', kicker: 'Votación', title, leading: back,
    trailing: [alertasBoton()], sidebarFooter: footer, body, detail: true,
  })
  for (const link of screen.querySelectorAll('nav a[href="/"]')) link.href = back.href
  for (const link of screen.querySelectorAll('nav a[href="/habito"]')) {
    if (validId(squadId)) link.href = `/habito?escuadron=${squadId}`
  }

  let busy = false
  async function load() {
    if (busy) return
    if (!validId(squadId) || !validId(proofId)) {
      error.textContent = 'Selecciona una prueba desde el panel del escuadrón.'
      return
    }
    busy = true
    retry.hidden = true
    error.textContent = ''
    status.textContent = 'Cargando prueba…'
    content.replaceChildren()
    try {
      const [squad, proof, result] = await Promise.all([
        getSquad(squadId), getProof(squadId, proofId), getProofVotes(squadId, proofId),
      ])
      const members = new Map(squad.miembros.map((member) => [member.usuario_id, member]))
      const viewer = squad.miembros.find(({ es_usuario }) => es_usuario)
      const nameFor = (id) => members.get(id)?.nombre || `Miembro ${id}`
      const author = nameFor(proof.usuario_id)
      title.textContent = `Prueba de ${author}`
      footer.replaceChildren(escuadronResumen({ nombre: squad.nombre, miembros: members.size }))
      renderProof(proof, result, viewer, author, nameFor, habitText(members.get(proof.usuario_id)?.habito))
    } catch (cause) {
      error.textContent = requestError(cause, false)
      retry.hidden = false
    } finally {
      busy = false
      status.textContent = ''
    }
  }

  function renderProof(proof, result, viewer, author, nameFor, habit) {
    const isAuthor = viewer?.usuario_id === proof.usuario_id
    const votes = element('section', `${cardStyle} p-4 sm:p-5`)
    votes.setAttribute('aria-label', 'Votos de la prueba')
    votes.setAttribute('aria-live', 'polite')
    const no = button(`${voteButtonStyle} bg-[#f4dce1] text-[#b60012]`, () => vote('no'), icon('close', 'h-4 w-4'), 'No cuenta')
    const yes = button(`${voteButtonStyle} bg-[#248a3d] text-white`, () => vote('sí'), icon('check', 'h-4 w-4'), 'Sí, cuenta')
    const buttons = element('div', 'mt-auto grid grid-cols-2 gap-2 sm:gap-3', no, yes)
    const details = element('section', 'rounded-3xl bg-gradient-to-br from-accent to-accent-hover p-4 text-white shadow-sm sm:p-5',
      element('div', 'flex items-center justify-between gap-3',
        element('div', 'min-w-0',
          element('h2', 'text-xs font-bold text-white/80', 'Su hábito'),
          element('p', 'break-words text-lg font-black', habit ?? 'Sin hábito')),
        element('span', 'grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15', icon('book', 'h-4 w-4'))))
    const panel = element('div', 'flex min-w-0 flex-col gap-3.5', details, votes, !isAuthor && buttons)
    content.replaceChildren(element('div', 'mb-3 grid min-w-0 gap-3.5 lg:grid-cols-2 lg:gap-4',
      photoCard(proof, author), panel))

    function setButtons(enabled) {
      no.disabled = yes.disabled = !enabled
    }

    function update(next) {
      votes.replaceChildren(...voteDetails(next, nameFor, viewer?.usuario_id, isAuthor))
      setButtons(Boolean(viewer) && !isAuthor && next.estado === 'pendiente' && next.voto_propio === null)
    }

    async function vote(value) {
      if (busy || no.disabled) return
      busy = true
      setButtons(false)
      error.textContent = ''
      status.textContent = 'Enviando voto…'
      try {
        update(await castProofVote(squadId, proofId, value))
        status.textContent = 'Voto registrado.'
      } catch (cause) {
        status.textContent = ''
        error.textContent = requestError(cause, true)
        // Otro miembro puede haber cerrado la prueba, o la respuesta haberse perdido.
        try {
          update(await getProofVotes(squadId, proofId))
        } catch {
          retry.hidden = false
        }
      } finally {
        busy = false
      }
    }

    update(result)
  }

  void load()
  return screen
}
