import { appLayout } from '../components/appLayout.js'
import { iniciales, squadAvatar } from '../components/avatar.js'
import { pillClass, pillLink } from '../components/buttons.js'
import { button, element } from '../components/dom.js'
import { clearFormAlert, formAlert, showFormAlert } from '../components/forms.js'
import { icon } from '../components/icons.js'
import { NAME_MAX_LENGTH, validateSquadName } from './crearEscuadron.js'

export const PLAZAS_MIN = 2
export const PLAZAS_MAX = 10

const CHIPS = {
  morado: 'bg-[#efeaff] text-[#5b32ea]',
  verde: 'bg-[#e8f5ec] text-[#248a3d]',
  azul: 'bg-[#e6f3ff] text-[#0878c9]',
  rojo: 'bg-[#ffebeb] text-[#d70015]',
}

const AVATARES = ['bg-[#5b32ea]', 'bg-[#0878c9]', 'bg-[#248a3d]', 'bg-[#c93400]']

const VISIBILIDADES = {
  privado: { titulo: 'Privado', icono: 'lock', descripcion: 'Solo entra quien tenga el código.' },
  publico: { titulo: 'Público', icono: 'globe', descripcion: 'Sale en el buscador y cualquiera puede unirse.' },
}

const cardClass = 'overflow-hidden rounded-[1.75rem] bg-white shadow-sm'
const filaClass = 'flex flex-col gap-3 border-t border-black/5 px-5 py-4 first:border-t-0 lg:flex-row lg:items-center lg:gap-4'
const controlClass = 'w-full lg:ms-auto lg:w-80 lg:shrink-0'
const chicoClass = [
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4',
  'text-[0.9375rem] font-bold disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
].join(' ')
const grisClass = `${chicoClass} bg-[#f2f2f7] text-[#1d1d1f]`
const moradoClass = `${chicoClass} bg-[#efeaff] text-[#5b32ea]`
const rojoClass = `${chicoClass} bg-[#ffebeb] text-[#d70015]`
const pasoClass = [
  'grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#1d1d1f] disabled:opacity-35',
  'focus-visible:outline-2 focus-visible:outline-accent',
].join(' ')

// El límite nunca baja de los miembros que ya hay: nadie sale del escuadrón por cambiarlo.
export function limitesPlazas(miembros) {
  return { minimo: Math.max(PLAZAS_MIN, miembros), maximo: Math.max(PLAZAS_MAX, miembros) }
}

function plazasTexto(miembros, plazas) {
  const libres = plazas - miembros
  if (libres <= 0) return `Sois ${miembros} · Completo, nadie más puede unirse`
  return `Sois ${miembros} · ${libres === 1 ? 'Queda 1 plaza' : `Quedan ${libres} plazas`}`
}

function chip(iconName, color) {
  return element('span', `grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`, icon(iconName))
}

function fila({ inicio, titulo, descripcion, control }) {
  return element(
    'div',
    filaClass,
    element(
      'div',
      'flex min-w-0 items-center gap-3.5',
      inicio,
      element(
        'div',
        'min-w-0',
        element('p', 'font-extrabold text-[#1d1d1f]', titulo),
        element('p', 'text-[0.875rem] font-semibold text-[#6e6e73]', descripcion),
      ),
    ),
    control,
  )
}

function seccionTitulo(texto) {
  return element('h2', 'mb-2 text-sm font-bold text-[#6e6e73]', texto)
}

function pestanas(opciones, onCambio) {
  const lista = element('div', 'inline-flex rounded-full bg-black/5 p-1')
  lista.setAttribute('role', 'tablist')
  lista.setAttribute('aria-label', 'Secciones de la configuración')
  const botones = opciones.map(({ id, titulo }) => {
    const tab = element(
      'button',
      [
        'min-h-11 rounded-full px-6 text-[0.9375rem] font-bold text-[#1d1d1f]',
        'aria-selected:bg-white aria-selected:text-accent aria-selected:shadow-sm',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      ].join(' '),
      titulo,
    )
    tab.type = 'button'
    tab.id = `pestana-${id}`
    tab.setAttribute('role', 'tab')
    tab.setAttribute('aria-controls', `panel-${id}`)
    tab.addEventListener('click', () => onCambio(id))
    return tab
  })
  lista.append(...botones)
  lista.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    const actual = botones.indexOf(document.activeElement)
    const siguiente = botones[(actual + (event.key === 'ArrowRight' ? 1 : -1) + botones.length) % botones.length]
    siguiente.focus()
    siguiente.click()
  })
  const marcar = (id) => {
    for (const tab of botones) {
      const activa = tab.id === `pestana-${id}`
      tab.setAttribute('aria-selected', String(activa))
      tab.tabIndex = activa ? 0 : -1
    }
  }
  return { lista, marcar }
}

function soloAdministrador({ miembros, volverA }) {
  const administrador = miembros.find(({ esAdministrador }) => esAdministrador)
  return element(
    'div',
    'mt-4 px-4 lg:mt-6 lg:px-0',
    element(
      'section',
      `${cardClass} max-w-xl p-5`,
      element(
        'div',
        'flex items-center gap-3.5',
        chip('lock', CHIPS.morado),
        element('h2', 'font-black text-[#1d1d1f]', 'Solo el administrador puede cambiar la configuración'),
      ),
      element(
        'p',
        'mt-3 font-semibold text-[#6e6e73]',
        administrador
          ? `Si quieres cambiar algo del escuadrón, habla con ${administrador.nombre}.`
          : 'Si quieres cambiar algo del escuadrón, habla con quien lo administra.',
      ),
      pillLink({ href: volverA, className: 'mt-4' }, 'Volver al panel'),
    ),
  )
}

export function configuracionEscuadronScreen({ escuadron, miembros: miembrosIniciales = [], acciones = {} } = {}) {
  const { nombre, visibilidad = 'privado', plazas = 5 } = escuadron
  const volverA = escuadron.id ? `/escuadrones/panel?id=${escuadron.id}` : '/'
  let miembros = [...miembrosIniciales]
  const usuario = miembros.find(({ esUsuario }) => esUsuario)

  const back = element('a', 'glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink', icon('back'))
  back.href = volverA
  back.dataset.link = ''
  back.setAttribute('aria-label', 'Volver al panel')

  const titulo = element('span', '', nombre)
  const layout = (body) =>
    appLayout({ active: 'configuracion', kicker: titulo, title: 'Configuración', leading: back, body, detail: true })

  if (!usuario?.esAdministrador) return layout(soloAdministrador({ miembros, volverA }))

  const limitesIniciales = limitesPlazas(miembros.length)
  let guardado = {
    nombre,
    visibilidad,
    plazas: Math.min(Math.max(plazas, limitesIniciales.minimo), limitesIniciales.maximo),
  }
  let actual = { ...guardado }
  let guardando = false
  let recienGuardado = false

  // General

  const cabeceraAvatar = element('div')
  const cabeceraNombre = element('p', 'truncate text-[1.125rem] font-black text-[#1d1d1f]')
  const cabeceraEstado = element('p', 'text-[0.875rem] font-semibold text-[#6e6e73]')
  const cabecera = element(
    'div',
    'flex items-center gap-3.5 px-5 py-4',
    cabeceraAvatar,
    element('div', 'min-w-0', cabeceraNombre, cabeceraEstado),
  )

  const nombreInput = element(
    'input',
    [
      'h-12 w-full min-w-0 rounded-xl border-2 border-transparent bg-[#f2f2f7] ps-3 pe-16',
      'font-semibold text-[#1d1d1f] outline-none focus:border-accent aria-invalid:border-red-600 disabled:opacity-60',
    ].join(' '),
  )
  nombreInput.id = 'nombre-escuadron'
  nombreInput.name = 'nombre'
  nombreInput.maxLength = NAME_MAX_LENGTH
  nombreInput.autocomplete = 'off'
  nombreInput.placeholder = 'Ej. Gym Bros'
  nombreInput.value = nombre
  nombreInput.setAttribute('aria-label', 'Nombre del escuadrón')
  const contador = element(
    'span',
    'pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-bold text-[#6e6e73]',
  )
  const nombreError = element('p', 'mt-1.5 hidden text-[0.8125rem] font-bold text-red-700')
  nombreError.id = 'nombre-escuadron-error'
  nombreError.setAttribute('role', 'alert')
  const nombreFila = fila({
    inicio: chip('pencil', CHIPS.morado),
    titulo: 'Nombre',
    descripcion: 'Cómo os ven los demás',
    control: element('div', controlClass, element('div', 'relative', nombreInput, contador), nombreError),
  })

  const visibilidadRadios = []
  const segmento = element(
    'div',
    'grid grid-cols-2 rounded-full bg-[#f2f2f7] p-1',
    Object.entries(VISIBILIDADES).map(([valor, opcion]) => {
      const radio = element('input', 'peer sr-only')
      radio.type = 'radio'
      radio.name = 'visibilidad'
      radio.value = valor
      visibilidadRadios.push(radio)
      return element(
        'label',
        [
          'flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[0.9375rem] font-bold text-[#1d1d1f]',
          'has-checked:bg-white has-checked:text-accent has-checked:shadow-sm',
          'has-focus-visible:outline-2 has-focus-visible:outline-accent',
        ].join(' '),
        radio,
        icon(opcion.icono, 'h-4 w-4 shrink-0'),
        opcion.titulo,
      )
    }),
  )
  const visibilidadSet = element('fieldset', controlClass, element('legend', 'sr-only', 'Visibilidad'), segmento)
  const visibilidadFila = fila({
    inicio: chip('globe', CHIPS.verde),
    titulo: 'Visibilidad',
    descripcion: '',
    control: visibilidadSet,
  })
  const visibilidadDescripcion = visibilidadFila.querySelectorAll('p')[1]

  const plazasValor = element('output', 'min-w-8 text-center text-[1.125rem] font-black tabular-nums text-[#1d1d1f]')
  plazasValor.setAttribute('aria-live', 'polite')
  plazasValor.setAttribute('aria-label', 'Plazas')
  const menos = button(pasoClass, () => cambiarPlazas(-1), icon('minus'))
  menos.setAttribute('aria-label', 'Quitar una plaza')
  const mas = button(pasoClass, () => cambiarPlazas(1), icon('plus'))
  mas.setAttribute('aria-label', 'Añadir una plaza')
  const plazasFila = fila({
    inicio: chip('users', CHIPS.azul),
    titulo: 'Plazas',
    descripcion: '',
    control: element(
      'div',
      `${controlClass} flex justify-start lg:justify-end`,
      element('div', 'flex items-center gap-2 rounded-full bg-[#f2f2f7] p-0.5', menos, plazasValor, mas),
    ),
  })
  const plazasDescripcion = plazasFila.querySelectorAll('p')[1]

  const estado = element('p', 'text-[0.875rem] font-semibold text-[#6e6e73] lg:me-auto')
  estado.setAttribute('role', 'status')
  const descartar = button(
    `${pillClass('secondary')} border border-black/10 shadow-none disabled:opacity-50`,
    descartarCambios,
    'Descartar',
  )
  const guardar = element('button', `${pillClass('primary')} disabled:opacity-50`)
  guardar.type = 'submit'
  const pie = element(
    'div',
    'flex flex-col gap-3 border-t border-black/5 px-5 py-4 lg:flex-row lg:items-center',
    estado,
    element('div', 'grid grid-cols-2 gap-2 lg:flex', descartar, guardar),
  )
  const alerta = formAlert()
  alerta.classList.add('mx-5', 'mb-1')

  const general = element(
    'form',
    '',
    element(
      'section',
      cardClass,
      cabecera,
      element('div', 'border-t border-black/5', nombreFila, visibilidadFila, plazasFila),
      pie,
    ),
  )
  general.noValidate = true

  // Miembros

  let codigo = escuadron.codigo ?? ''
  const codigoTexto = element('span', 'font-black tracking-[0.15em] text-[#1d1d1f] select-all')
  const codigoEstado = element('p', 'hidden px-5 pb-4 text-[0.875rem] font-semibold text-[#6e6e73]')
  codigoEstado.setAttribute('role', 'status')
  const avisarCodigo = (texto) => {
    codigoEstado.textContent = texto
    codigoEstado.classList.remove('hidden')
  }
  const copiar = button(
    moradoClass,
    async () => {
      try {
        await navigator.clipboard.writeText(codigo)
        avisarCodigo('Código copiado. Pásaselo a tus amigos.')
      } catch {
        avisarCodigo('No se ha podido copiar. Cópialo a mano.')
      }
    },
    icon('copy', 'h-4 w-4 shrink-0'),
    'Copiar código',
  )
  const generar = button(
    grisClass,
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
  const invitarFila = fila({
    inicio: chip('userPlus', CHIPS.morado),
    titulo: 'Invitar',
    descripcion: '',
    control: element('div', 'flex flex-wrap gap-2 lg:ms-auto', copiar, generar),
  })
  invitarFila.querySelectorAll('p')[1].append('Código ', codigoTexto)

  const miembrosTitulo = seccionTitulo('')
  const miembrosLista = element('div')

  function miembroFila(miembro, indice) {
    const expulsar =
      !miembro.esAdministrador &&
      button(grisClass, acciones.expulsar && (() => expulsarMiembro(miembro, expulsar)), 'Expulsar')
    return fila({
      inicio: element(
        'span',
        `grid h-11 w-11 shrink-0 place-items-center rounded-full font-black text-white ${AVATARES[indice % AVATARES.length]}`,
        iniciales(miembro.nombre),
      ),
      titulo: miembro.nombre,
      descripcion: [miembro.esAdministrador ? 'Administrador' : 'Miembro', miembro.esUsuario && 'Tú']
        .filter(Boolean)
        .join(' · '),
      control: expulsar && element('div', 'lg:ms-auto', expulsar),
    })
  }

  function plazaLibreFila() {
    return fila({
      inicio: element('span', 'h-11 w-11 shrink-0 rounded-full border-2 border-dashed border-black/15'),
      titulo: 'Plaza libre',
      descripcion: 'Entra quien use el código',
    })
  }

  async function expulsarMiembro(miembro, boton) {
    if (boton.dataset.confirmar !== 'true') {
      boton.dataset.confirmar = 'true'
      boton.className = rojoClass
      boton.textContent = `¿Expulsar a ${miembro.nombre}?`
      return
    }
    boton.disabled = true
    try {
      await acciones.expulsar(miembro)
      miembros = miembros.filter((otro) => otro !== miembro)
      sync()
    } catch {
      boton.disabled = false
      avisarCodigo(`No se ha podido expulsar a ${miembro.nombre}. Inténtalo de nuevo.`)
    }
  }

  const eliminarDescripcion = 'Se borran la racha y las fotos de todos. No se puede deshacer.'
  const eliminar = button(rojoClass, acciones.eliminar && eliminarEscuadron, icon('trash', 'h-4 w-4 shrink-0'), 'Eliminar')
  const eliminarFila = fila({
    inicio: chip('trash', CHIPS.rojo),
    titulo: 'Eliminar escuadrón',
    descripcion: eliminarDescripcion,
    control: element('div', 'lg:ms-auto', eliminar),
  })

  async function eliminarEscuadron() {
    if (eliminar.dataset.confirmar !== 'true') {
      eliminar.dataset.confirmar = 'true'
      eliminar.replaceChildren(icon('trash', 'h-4 w-4 shrink-0'), 'Sí, eliminar')
      eliminarFila.querySelectorAll('p')[1].textContent = 'Pulsa otra vez para confirmar. Se perderá todo.'
      return
    }
    eliminar.disabled = true
    try {
      await acciones.eliminar()
    } catch {
      eliminar.disabled = false
      eliminarFila.querySelectorAll('p')[1].textContent = 'No se ha podido eliminar. Inténtalo de nuevo.'
    }
  }

  const miembrosPanel = element(
    'div',
    'space-y-4',
    element(
      'div',
      '',
      miembrosTitulo,
      element('section', cardClass, invitarFila, codigoEstado, element('div', 'border-t border-black/5', miembrosLista)),
    ),
    element('section', cardClass, eliminarFila),
  )

  // Pestañas

  const paneles = { general, miembros: miembrosPanel }
  for (const [id, panel] of Object.entries(paneles)) {
    panel.id = `panel-${id}`
    panel.setAttribute('role', 'tabpanel')
    panel.setAttribute('aria-labelledby', `pestana-${id}`)
  }
  const tabs = pestanas(
    [
      { id: 'general', titulo: 'General' },
      { id: 'miembros', titulo: 'Miembros' },
    ],
    mostrar,
  )

  function mostrar(id) {
    tabs.marcar(id)
    for (const [clave, panel] of Object.entries(paneles)) panel.hidden = clave !== id
  }

  // Estado

  function hayCambios() {
    return (
      actual.nombre.trim() !== guardado.nombre ||
      actual.visibilidad !== guardado.visibilidad ||
      actual.plazas !== guardado.plazas
    )
  }

  function sync() {
    const limites = limitesPlazas(miembros.length)
    const cambios = hayCambios()

    titulo.textContent = guardado.nombre
    cabeceraAvatar.replaceChildren(squadAvatar({ nombre: guardado.nombre }))
    cabeceraNombre.textContent = guardado.nombre
    cabeceraEstado.textContent = `${VISIBILIDADES[guardado.visibilidad].titulo} · ${miembros.length} de ${guardado.plazas} miembros`

    nombreInput.disabled = guardando
    contador.textContent = `${nombreInput.value.length}/${NAME_MAX_LENGTH}`
    for (const radio of visibilidadRadios) radio.checked = radio.value === actual.visibilidad
    visibilidadSet.disabled = guardando
    visibilidadDescripcion.textContent = VISIBILIDADES[actual.visibilidad].descripcion
    plazasValor.textContent = String(actual.plazas)
    plazasDescripcion.textContent = plazasTexto(miembros.length, actual.plazas)
    menos.disabled = guardando || actual.plazas <= limites.minimo
    mas.disabled = guardando || actual.plazas >= limites.maximo

    estado.textContent = guardando
      ? 'Guardando los cambios…'
      : cambios
        ? 'Tienes cambios sin guardar'
        : recienGuardado
          ? 'Cambios guardados'
          : 'Sin cambios'
    descartar.disabled = guardando || !cambios
    guardar.disabled = guardando || !cambios || typeof acciones.guardar !== 'function'
    guardar.textContent = guardando ? 'Guardando…' : 'Guardar cambios'
    general.setAttribute('aria-busy', String(guardando))

    codigoTexto.textContent = codigo
    miembrosTitulo.textContent = `Miembros · ${miembros.length} de ${guardado.plazas}`
    miembrosLista.replaceChildren(
      ...miembros.map(miembroFila),
      ...Array.from({ length: Math.max(guardado.plazas - miembros.length, 0) }, plazaLibreFila),
    )
  }

  function editar(cambio) {
    actual = { ...actual, ...cambio }
    recienGuardado = false
    clearFormAlert(alerta)
    sync()
  }

  function cambiarPlazas(paso) {
    const { minimo, maximo } = limitesPlazas(miembros.length)
    editar({ plazas: Math.min(Math.max(actual.plazas + paso, minimo), maximo) })
  }

  function limpiarErrorNombre() {
    nombreError.textContent = ''
    nombreError.classList.add('hidden')
    nombreInput.removeAttribute('aria-invalid')
    nombreInput.removeAttribute('aria-describedby')
  }

  function descartarCambios() {
    nombreInput.value = guardado.nombre
    limpiarErrorNombre()
    editar(guardado)
  }

  nombreInput.addEventListener('input', () => {
    limpiarErrorNombre()
    editar({ nombre: nombreInput.value })
  })
  visibilidadSet.addEventListener('change', (event) => editar({ visibilidad: event.target.value }))

  general.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (guardar.disabled) return
    const resultado = validateSquadName(actual.nombre)
    if (!resultado.ok) {
      nombreError.textContent = resultado.error
      nombreError.classList.remove('hidden')
      nombreInput.setAttribute('aria-invalid', 'true')
      nombreInput.setAttribute('aria-describedby', nombreError.id)
      nombreInput.focus()
      return
    }
    clearFormAlert(alerta)
    guardando = true
    sync()
    try {
      await acciones.guardar({ ...actual, nombre: resultado.name })
      guardado = { ...actual, nombre: resultado.name }
      actual = { ...guardado }
      nombreInput.value = guardado.nombre
      recienGuardado = true
    } catch (error) {
      showFormAlert(alerta, error.message, pie)
    } finally {
      guardando = false
      sync()
    }
  })

  mostrar('general')
  sync()
  return layout(element('div', 'mt-4 space-y-4 px-4 lg:mt-6 lg:px-0', tabs.lista, general, miembrosPanel))
}
