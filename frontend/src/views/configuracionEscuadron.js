import { accountMenu } from '../components/accountMenu.js'
import { appLayout } from '../components/appLayout.js'
import { iniciales } from '../components/avatar.js'
import { pillClass, pillLink } from '../components/buttons.js'
import { card, cardChip, cardLabel, cardNote, pillButtonClass, progressBars } from '../components/card.js'
import { button, element } from '../components/dom.js'
import {
  clearFieldError,
  clearFormAlert,
  formAlert,
  labeledField,
  setFieldError,
  showFormAlert,
} from '../components/forms.js'
import { icon } from '../components/icons.js'
import { alertasBoton, escuadronResumen } from '../components/panel/cabecera.js'
import { plazasLibres } from '../components/panel/invitaCard.js'
import { NAME_MAX_LENGTH, validateSquadName } from './crearEscuadron.js'

export const PLAZAS_MIN = 2
export const PLAZAS_MAX = 10

const VISIBILIDADES = [
  {
    valor: 'privado',
    titulo: 'Privado',
    icono: 'lock',
    color: 'bg-accent/10 text-accent',
    descripcion: 'Solo entra quien tenga el código de invitación.',
  },
  {
    valor: 'publico',
    titulo: 'Público',
    icono: 'globe',
    color: 'bg-sky/10 text-sky',
    descripcion: 'Sale en el buscador y cualquiera puede unirse mientras queden plazas.',
  },
]

const labelClass = 'text-[0.8125rem] font-extrabold text-ink-muted'

const pasoClass = [
  'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent disabled:opacity-40',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
].join(' ')

const peligroClass = [
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-4',
  'text-[0.9375rem] font-bold text-red-700 disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700',
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

function opcionVisibilidad(opcion) {
  const radio = element('input', 'peer sr-only')
  radio.type = 'radio'
  radio.name = 'visibilidad'
  radio.value = opcion.valor
  const label = element(
    'label',
    [
      'flex min-w-0 cursor-pointer items-start gap-3 rounded-[1.25rem] border-2 border-hairline p-3',
      'has-checked:border-accent has-checked:bg-accent-soft',
      'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
    ].join(' '),
    radio,
    element('span', `grid h-10 w-10 shrink-0 place-items-center rounded-xl ${opcion.color}`, icon(opcion.icono)),
    element(
      'span',
      'min-w-0 flex-1',
      element('span', 'block font-extrabold', opcion.titulo),
      element('span', 'block text-[0.8125rem] font-bold text-ink-muted', opcion.descripcion),
    ),
    element(
      'span',
      'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-hairline text-transparent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white',
      icon('check', 'h-3.5 w-3.5 shrink-0', 3.2),
    ),
  )
  return { label, radio }
}

function miembroFila(miembro, onExpulsar) {
  return element(
    'li',
    'flex items-center gap-3 py-1.5 lg:rounded-xl lg:bg-fill/60 lg:p-3',
    element(
      'span',
      'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft font-black text-accent',
      iniciales(miembro.nombre),
    ),
    element(
      'div',
      'min-w-0 flex-1',
      element('p', 'truncate font-extrabold', miembro.esUsuario ? 'Tú' : miembro.nombre),
      element('p', 'text-[0.8125rem] font-bold text-ink-muted', miembro.esAdministrador ? 'Administrador' : 'Miembro'),
    ),
    !miembro.esAdministrador &&
      button(`${peligroClass} lg:px-3.5`, onExpulsar && (() => onExpulsar(miembro)), 'Expulsar'),
  )
}

function soloAdministrador({ miembros, volverA }) {
  const administrador = miembros.find(({ esAdministrador }) => esAdministrador)
  return element(
    'div',
    'mt-4 grid grid-cols-2 gap-3 px-4 lg:mt-6 lg:grid-cols-4 lg:gap-4 lg:px-0',
    card(
      'col-span-2',
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
          ? `Si quieres cambiar algo del escuadrón, habla con ${administrador.nombre}.`
          : 'Si quieres cambiar algo del escuadrón, habla con quien lo administra.',
      ),
      pillLink({ href: volverA, className: 'mt-4' }, 'Volver al panel'),
    ),
  )
}

export function configuracionEscuadronScreen({ escuadron, miembros = [], acciones = {} } = {}) {
  const { nombre, visibilidad = 'privado', plazas = 5 } = escuadron
  const volverA = escuadron.id ? `/escuadrones/panel?id=${escuadron.id}` : '/'
  const usuario = miembros.find(({ esUsuario }) => esUsuario)

  const back = element(
    'a',
    'glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink focus-visible:outline-2 focus-visible:outline-accent',
    icon('back'),
  )
  back.href = volverA
  back.dataset.link = ''
  back.setAttribute('aria-label', 'Volver al panel')

  const titulo = element('span', '', nombre)
  const footer = element('div', '', escuadronResumen({ nombre, miembros: miembros.length, plazas }))
  const layout = (body) =>
    appLayout({
      active: 'configuracion',
      kicker: titulo,
      title: 'Configuración',
      leading: back,
      trailing: [alertasBoton(), accountMenu({ nombre: usuario?.nombre, onLogout: acciones.cerrarSesion })],
      sidebarFooter: footer,
      body,
      detail: true,
    })

  if (!usuario?.esAdministrador) return layout(soloAdministrador({ miembros, volverA }))

  const limites = limitesPlazas(miembros.length)
  let guardado = { nombre, visibilidad, plazas: Math.min(Math.max(plazas, limites.minimo), limites.maximo) }
  let actual = { ...guardado }
  let guardando = false
  let recienGuardado = false

  const nombreCampo = labeledField({
    label: 'Nombre del escuadrón',
    id: 'nombre-escuadron',
    name: 'nombre',
    type: 'text',
    placeholder: 'Ej. Gym Bros',
    autocomplete: 'off',
  })
  nombreCampo.wrapper.querySelector('label').className = labelClass
  nombreCampo.input.maxLength = NAME_MAX_LENGTH
  nombreCampo.input.value = nombre
  const nombreCard = card(
    'col-span-2',
    cardChip('pencil', 'bg-accent/10 text-accent'),
    nombreCampo.wrapper,
    element('div', 'mt-2', cardNote('Lo ven todos los miembros en su panel.')),
  )

  const opciones = VISIBILIDADES.map(opcionVisibilidad)
  const visibilidadSet = element(
    'fieldset',
    'min-w-0',
    element('legend', labelClass, 'Visibilidad'),
    element('div', 'mt-2 grid gap-2.5 sm:grid-cols-2', opciones.map(({ label }) => label)),
  )
  const visibilidadCard = card('col-span-2', visibilidadSet)

  const limiteLabel = cardLabel('Límite de miembros', { icon: 'users' })
  limiteLabel.id = 'limite-miembros-etiqueta'
  const valor = element('output', 'text-[1.875rem] leading-tight font-black tabular-nums')
  valor.setAttribute('aria-labelledby', limiteLabel.id)
  valor.setAttribute('aria-live', 'polite')
  const menos = button(pasoClass, () => cambiarPlazas(-1), icon('minus'))
  menos.setAttribute('aria-label', 'Quitar una plaza')
  const mas = button(pasoClass, () => cambiarPlazas(1), icon('plus'))
  mas.setAttribute('aria-label', 'Añadir una plaza')
  const barras = element('div')
  const libresNota = cardNote('')
  const limiteCard = card(
    'col-span-2',
    limiteLabel,
    element(
      'div',
      'flex items-center justify-between gap-3',
      element('p', 'flex items-baseline gap-1.5', valor, element('span', 'font-extrabold text-ink-muted', 'miembros')),
      element('div', 'flex gap-2', menos, mas),
    ),
    barras,
    element('div', 'mt-2', libresNota, cardNote(rangoTexto(limites, miembros.length))),
  )

  let codigo = escuadron.codigo ?? ''
  const codigoTexto = element('p', 'mt-1 text-[1.5rem] font-black tracking-[0.2em] select-all', codigo)
  const codigoEstado = element('p', 'mt-2 hidden text-[0.8125rem] font-bold text-ink-muted')
  codigoEstado.setAttribute('role', 'status')
  const avisarCodigo = (texto) => {
    codigoEstado.textContent = texto
    codigoEstado.classList.remove('hidden')
  }
  const copiar = button(
    pillButtonClass,
    async () => {
      try {
        await navigator.clipboard.writeText(codigo)
        avisarCodigo('Código copiado.')
      } catch {
        avisarCodigo('No se ha podido copiar. Cópialo a mano.')
      }
    },
    icon('copy', 'h-4 w-4 shrink-0'),
    'Copiar',
  )
  const generar = button(
    pillButtonClass,
    acciones.generarCodigo &&
      (async () => {
        generar.disabled = true
        try {
          codigo = await acciones.generarCodigo()
          codigoTexto.textContent = codigo
          avisarCodigo('Código nuevo listo. El anterior ya no sirve.')
        } catch {
          avisarCodigo('No se ha podido generar otro código. Inténtalo de nuevo.')
        } finally {
          generar.disabled = false
        }
      }),
    icon('refresh', 'h-4 w-4 shrink-0'),
    'Generar otro',
  )
  const codigoCard = card(
    'col-span-2 flex flex-col',
    cardChip('userPlus', 'bg-success/10 text-success'),
    cardLabel('Código de invitación'),
    codigoTexto,
    cardNote('Si generas otro, el actual deja de servir.'),
    element('div', 'mt-3 flex flex-wrap gap-2 lg:mt-auto lg:pt-3', copiar, generar),
    codigoEstado,
  )

  const miembrosTotal = element('span', 'font-bold')
  const miembrosCard = card(
    'col-span-2 lg:col-span-3',
    element(
      'h2',
      'mb-1 flex items-center justify-between text-[0.8125rem] font-extrabold text-ink-muted',
      'Miembros',
      miembrosTotal,
    ),
    element(
      'ul',
      'lg:mt-2 lg:grid lg:grid-cols-3 lg:gap-3',
      miembros.map((miembro) => miembroFila(miembro, acciones.expulsar)),
    ),
  )

  const eliminarCard = card(
    'col-span-2 flex flex-col lg:col-span-1',
    cardChip('trash', 'bg-red-50 text-red-700'),
    cardLabel('Eliminar escuadrón'),
    element('p', 'mt-1 pe-10 font-extrabold', 'Se borran la racha, los hábitos y las pruebas de todos.'),
    button(`mt-3 self-start lg:mt-auto ${peligroClass}`, acciones.eliminar, icon('trash', 'h-4 w-4 shrink-0'), 'Eliminar'),
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
    'glass sticky bottom-4 z-10 col-span-2 flex flex-wrap items-center gap-2 rounded-[1.75rem] p-1.5 lg:col-span-4 lg:flex-nowrap lg:rounded-full',
    estado,
    descartar,
    guardar,
  )
  const alerta = formAlert()
  alerta.classList.add('col-span-2', 'lg:col-span-4')

  const form = element(
    'form',
    'mt-4 grid grid-cols-2 gap-3 px-4 lg:mt-6 lg:grid-cols-4 lg:gap-4 lg:px-0',
    nombreCard,
    visibilidadCard,
    limiteCard,
    codigoCard,
    miembrosCard,
    eliminarCard,
    barra,
  )
  form.noValidate = true

  function hayCambios() {
    return (
      actual.nombre.trim() !== guardado.nombre ||
      actual.visibilidad !== guardado.visibilidad ||
      actual.plazas !== guardado.plazas
    )
  }

  function sync() {
    const cambios = hayCambios()
    const libres = actual.plazas - miembros.length
    nombreCampo.input.disabled = guardando
    for (const { radio } of opciones) radio.checked = radio.value === actual.visibilidad
    visibilidadSet.disabled = guardando
    valor.textContent = String(actual.plazas)
    menos.disabled = guardando || actual.plazas <= limites.minimo
    mas.disabled = guardando || actual.plazas >= limites.maximo
    barras.replaceChildren(
      progressBars([...Array(miembros.length).fill('bg-accent'), ...Array(Math.max(libres, 0)).fill('bg-fill')]),
    )
    libresNota.textContent = libres > 0 ? plazasLibres(libres) : 'Escuadrón completo: nadie más podrá unirse.'
    libresNota.classList.toggle('text-ink-muted', libres > 0)
    libresNota.classList.toggle('text-accent', libres <= 0)
    miembrosTotal.textContent = `${miembros.length} de ${actual.plazas} miembros`
    titulo.textContent = guardado.nombre
    footer.replaceChildren(escuadronResumen({ nombre: guardado.nombre, miembros: miembros.length, plazas: guardado.plazas }))
    estado.textContent = guardando
      ? 'Guardando los cambios…'
      : cambios
        ? 'Tienes cambios sin guardar.'
        : recienGuardado
          ? 'Cambios guardados.'
          : 'Sin cambios.'
    descartar.disabled = guardando || !cambios
    guardar.disabled = guardando || !cambios || typeof acciones.guardar !== 'function'
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
    nombreCampo.input.value = guardado.nombre
    clearFieldError(nombreCampo.input, nombreCampo.error)
    editar(guardado)
  }

  nombreCampo.input.addEventListener('input', () => {
    clearFieldError(nombreCampo.input, nombreCampo.error)
    editar({ nombre: nombreCampo.input.value })
  })
  visibilidadSet.addEventListener('change', (event) => editar({ visibilidad: event.target.value }))

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (guardar.disabled) return
    const resultado = validateSquadName(actual.nombre)
    if (!resultado.ok) {
      setFieldError(nombreCampo.input, nombreCampo.error, resultado.error)
      nombreCampo.input.focus()
      return
    }
    clearFormAlert(alerta)
    guardando = true
    sync()
    try {
      await acciones.guardar({ ...actual, nombre: resultado.name })
      guardado = { ...actual, nombre: resultado.name }
      actual = { ...guardado }
      nombreCampo.input.value = guardado.nombre
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
