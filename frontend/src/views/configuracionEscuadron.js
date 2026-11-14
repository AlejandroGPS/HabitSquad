import { appLayout } from '../components/appLayout.js'
import { iniciales } from '../components/avatar.js'
import { pillClass, pillLink } from '../components/buttons.js'
import { card, cardChip, cardLabel, cardNote } from '../components/card.js'
import { button, element } from '../components/dom.js'
import { clearFormAlert, formAlert, showFormAlert } from '../components/forms.js'
import { icon } from '../components/icons.js'
import { escuadronResumen } from '../components/panel/cabecera.js'
import { plazasLibres } from '../components/panel/invitaCard.js'

export const PLAZAS_MIN = 2
export const PLAZAS_MAX = 10

const VISIBILIDADES = [
  {
    valor: 'privado',
    titulo: 'Privado',
    icono: 'lock',
    color: 'bg-accent/10 text-accent',
    descripcion: (codigo) => `Solo entra quien tenga el código ${codigo}.`,
  },
  {
    valor: 'publico',
    titulo: 'Público',
    icono: 'globe',
    color: 'bg-[#e6f2ff] text-[#0066cc]',
    descripcion: () => 'Sale en el buscador y cualquiera puede unirse mientras queden plazas.',
  },
]

const stepClass = [
  'grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/10 text-accent',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40',
].join(' ')

// El límite nunca baja de los miembros que ya hay: nadie sale del escuadrón por cambiarlo.
export function limitesPlazas(miembros) {
  return { minimo: Math.max(PLAZAS_MIN, miembros), maximo: Math.max(PLAZAS_MAX, miembros) }
}

function rangoTexto({ minimo, maximo }, miembros) {
  return miembros > PLAZAS_MIN
    ? `Mínimo ${minimo}, porque ya sois ${miembros}. Máximo ${maximo}.`
    : `Entre ${minimo} y ${maximo} miembros.`
}

function opcionVisibilidad(opcion, codigo) {
  const radio = element('input', 'peer sr-only')
  radio.type = 'radio'
  radio.name = 'visibilidad'
  radio.value = opcion.valor
  const label = element(
    'label',
    [
      'flex min-w-0 cursor-pointer items-start gap-3 rounded-[1.25rem] border-2 border-hairline bg-white p-3.5',
      'has-checked:border-accent has-checked:bg-accent-soft',
      'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
    ].join(' '),
    radio,
    element('span', `grid h-10 w-10 shrink-0 place-items-center rounded-xl ${opcion.color}`, icon(opcion.icono)),
    element(
      'span',
      'min-w-0 flex-1',
      element('span', 'block font-extrabold', opcion.titulo),
      element('span', 'block text-[0.8125rem] font-bold text-ink-muted', opcion.descripcion(codigo)),
    ),
    element(
      'span',
      'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-hairline text-transparent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white',
      icon('check', 'h-3.5 w-3.5 shrink-0', 3.2),
    ),
  )
  return { label, radio }
}

function miembroFila(miembro) {
  return element(
    'li',
    'flex items-center gap-3 py-1.5',
    element(
      'span',
      'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f2f2f7] font-black text-ink-muted',
      iniciales(miembro.nombre),
    ),
    element('p', 'min-w-0 flex-1 truncate font-extrabold', miembro.esUsuario ? 'Tú' : miembro.nombre),
    miembro.esAdministrador
      ? element('span', 'rounded-full bg-accent-soft px-2.5 py-1 text-[0.75rem] font-extrabold text-accent', 'Administrador')
      : element('span', 'text-[0.8125rem] font-bold text-ink-muted', 'Miembro'),
  )
}

function soloAdministrador({ miembros, volverA }) {
  const administrador = miembros.find(({ esAdministrador }) => esAdministrador)
  return element(
    'div',
    'mt-4 px-4 lg:mt-6 lg:px-0',
    card(
      'max-w-xl',
      cardChip('lock', 'bg-accent/10 text-accent'),
      cardLabel('Configuración del escuadrón'),
      element(
        'h2',
        'mt-1 pe-10 text-[1.25rem] leading-tight font-black',
        'Solo el administrador puede cambiar la configuración',
      ),
      element(
        'p',
        'mt-2 font-bold text-ink-muted',
        administrador
          ? `Si quieres cambiar la visibilidad o el límite de miembros, habla con ${administrador.nombre}.`
          : 'Si quieres cambiar la visibilidad o el límite de miembros, habla con quien administra el escuadrón.',
      ),
      pillLink({ href: volverA, className: 'mt-4' }, 'Volver al panel'),
    ),
  )
}

export function configuracionEscuadronScreen({ escuadron, miembros = [], onGuardar } = {}) {
  const { nombre, codigo = '', visibilidad = 'privado', plazas = 5 } = escuadron
  const volverA = escuadron.id ? `/escuadrones/panel?id=${escuadron.id}` : '/'
  const esAdministrador = Boolean(miembros.find(({ esUsuario }) => esUsuario)?.esAdministrador)

  const back = element(
    'a',
    'glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink focus-visible:outline-2 focus-visible:outline-accent',
    icon('back'),
  )
  back.href = volverA
  back.dataset.link = ''
  back.setAttribute('aria-label', 'Volver al panel')

  const footer = element('div')
  const layout = (body) =>
    appLayout({
      active: 'escuadron',
      kicker: nombre,
      title: 'Configuración',
      leading: back,
      sidebarFooter: footer,
      body,
      detail: true,
    })

  if (!esAdministrador) {
    footer.append(escuadronResumen({ nombre, miembros: miembros.length, plazas }))
    return layout(soloAdministrador({ miembros, volverA }))
  }

  const limites = limitesPlazas(miembros.length)
  let guardado = { visibilidad, plazas: Math.min(Math.max(plazas, limites.minimo), limites.maximo) }
  let actual = { ...guardado }
  let guardando = false
  let recienGuardado = false

  const opciones = VISIBILIDADES.map((opcion) => opcionVisibilidad(opcion, codigo))
  const visibilidadSet = element(
    'fieldset',
    'min-w-0',
    element('legend', 'text-[0.8125rem] font-extrabold text-ink-muted', 'Visibilidad'),
    element('div', 'mt-2 grid gap-2.5 sm:grid-cols-2', opciones.map(({ label }) => label)),
  )
  const visibilidadCard = card('', visibilidadSet)

  const valor = element('output', 'block min-w-16 text-center text-[2.5rem] leading-none font-black tabular-nums')
  valor.id = 'limite-miembros'
  const limiteLabel = cardLabel('Límite de miembros', { icon: 'users' })
  limiteLabel.id = 'limite-miembros-etiqueta'
  valor.setAttribute('aria-labelledby', limiteLabel.id)
  valor.setAttribute('aria-live', 'polite')

  const menos = button(stepClass, () => cambiarPlazas(-1), icon('minus'))
  menos.setAttribute('aria-label', 'Quitar una plaza')
  const mas = button(stepClass, () => cambiarPlazas(1), icon('plus'))
  mas.setAttribute('aria-label', 'Añadir una plaza')

  const huecos = element('div', 'flex flex-wrap gap-1.5')
  huecos.setAttribute('aria-hidden', 'true')
  const libresNota = cardNote('')
  const limiteCard = card(
    '',
    limiteLabel,
    element(
      'div',
      'mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
      element(
        'div',
        'flex items-center gap-3',
        menos,
        element('div', '', valor, element('p', 'text-center text-[0.8125rem] font-bold text-ink-muted', 'miembros')),
        mas,
      ),
      huecos,
    ),
    element('div', 'mt-3', libresNota, cardNote(rangoTexto(limites, miembros.length))),
  )

  const miembrosTotal = element('span', 'font-bold')
  const miembrosCard = card(
    'self-start',
    element(
      'h2',
      'mb-1 flex items-center justify-between text-[0.8125rem] font-extrabold text-ink-muted',
      'Miembros',
      miembrosTotal,
    ),
    element('ul', '', miembros.map(miembroFila)),
  )

  const estado = element(
    'p',
    'w-full px-3 pt-1 text-center text-[0.8125rem] font-bold text-ink-muted lg:w-auto lg:flex-1 lg:pt-0 lg:text-start lg:text-[0.9375rem]',
  )
  estado.setAttribute('role', 'status')
  const descartar = button(`${pillClass('secondary')} flex-1 disabled:opacity-50 lg:flex-none`, descartarCambios, 'Descartar')
  const guardar = element('button', `${pillClass('primary')} flex-1 disabled:opacity-50 lg:flex-none`)
  guardar.type = 'submit'
  const barra = element(
    'div',
    'glass sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-[1.75rem] p-1.5 lg:col-span-2 lg:flex-nowrap lg:rounded-full',
    estado,
    descartar,
    guardar,
  )
  const alerta = formAlert()
  alerta.classList.add('lg:col-span-2')

  const form = element(
    'form',
    'mt-4 grid min-w-0 gap-3 px-4 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-4 lg:px-0',
    element('div', 'flex min-w-0 flex-col gap-3 lg:gap-4', visibilidadCard, limiteCard),
    miembrosCard,
    barra,
  )
  form.noValidate = true

  function hayCambios() {
    return actual.visibilidad !== guardado.visibilidad || actual.plazas !== guardado.plazas
  }

  function sync() {
    const cambios = hayCambios()
    const libres = actual.plazas - miembros.length
    for (const { radio } of opciones) radio.checked = radio.value === actual.visibilidad
    visibilidadSet.disabled = guardando
    valor.textContent = String(actual.plazas)
    menos.disabled = guardando || actual.plazas <= limites.minimo
    mas.disabled = guardando || actual.plazas >= limites.maximo
    huecos.replaceChildren(
      ...miembros.map((miembro) =>
        element(
          'span',
          'grid h-9 w-9 place-items-center rounded-full bg-accent text-[0.75rem] font-black text-white',
          iniciales(miembro.nombre),
        ),
      ),
      ...Array.from({ length: libres }, () =>
        element('span', 'h-9 w-9 rounded-full border-2 border-dashed border-accent-line'),
      ),
    )
    libresNota.textContent = libres > 0 ? plazasLibres(libres) : 'Escuadrón completo: nadie más podrá unirse.'
    libresNota.classList.toggle('text-ink-muted', libres > 0)
    libresNota.classList.toggle('text-[#c93400]', libres <= 0)
    miembrosTotal.textContent = `${miembros.length} de ${actual.plazas} miembros`
    footer.replaceChildren(escuadronResumen({ nombre, miembros: miembros.length, plazas: actual.plazas }))
    estado.textContent = guardando
      ? 'Guardando los cambios…'
      : cambios
        ? 'Tienes cambios sin guardar.'
        : recienGuardado
          ? 'Cambios guardados.'
          : 'Sin cambios.'
    descartar.disabled = guardando || !cambios
    guardar.disabled = guardando || !cambios || typeof onGuardar !== 'function'
    guardar.textContent = guardando ? 'Guardando…' : 'Guardar'
    form.setAttribute('aria-busy', String(guardando))
  }

  function editar(cambio) {
    actual = { ...actual, ...cambio }
    recienGuardado = false
    clearFormAlert(alerta)
    sync()
  }

  function cambiarPlazas(paso) {
    editar({ plazas: Math.min(Math.max(actual.plazas + paso, limites.minimo), limites.maximo) })
  }

  function descartarCambios() {
    editar(guardado)
  }

  visibilidadSet.addEventListener('change', (event) => editar({ visibilidad: event.target.value }))

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (guardar.disabled) return
    clearFormAlert(alerta)
    guardando = true
    sync()
    try {
      await onGuardar({ ...actual })
      guardado = { ...actual }
      recienGuardado = true
    } catch (error) {
      showFormAlert(alerta, error.message, barra)
    } finally {
      guardando = false
      sync()
    }
  })

  sync()
  return layout(form)
}
