import { accountMenu } from '../components/accountMenu.js'
import { appLayout } from '../components/appLayout.js'
import { squadAvatar } from '../components/avatar.js'
import { element } from '../components/dom.js'
import {
  alertasBoton,
  escuadronResumen,
  habitoCard,
  hoyCard,
  invitaCard,
  miembrosCard,
  rachaCard,
  rachaChip,
  semanaCard,
  semanaDe,
} from '../components/panel/index.js'

export function panelEscuadronScreen({ escuadron, miembros = [], ahora = new Date(), acciones = {} }) {
  const { nombre, codigo, plazas = 5, racha = 0, cierre = '23:59' } = escuadron
  const usuario = miembros.find(({ esUsuario }) => esUsuario)

  const body = element(
    'div',
    'mt-4 grid grid-cols-2 gap-3 px-4 lg:mt-6 lg:grid-cols-4 lg:gap-4 lg:px-0',
    hoyCard({ miembros, cierre, ahora }),
    rachaCard({ racha }),
    habitoCard({
      habito: usuario?.habito,
      cierre,
      semana: usuario && semanaDe(usuario, ahora),
      onSubirPrueba: acciones.subirPrueba,
      onElegirHabito: acciones.elegirHabito,
    }),
    semanaCard({ miembros, ahora }),
    miembrosCard({ miembros, plazas, onVerFoto: acciones.verFoto, onVotar: acciones.votar }),
    invitaCard({ codigo, libres: plazas - miembros.length, plazas, nombre }),
  )

  return appLayout({
    active: 'escuadron',
    kicker: 'Escuadrón',
    title: nombre,
    leading: squadAvatar({ nombre }),
    trailing: [
      rachaChip({ racha }),
      alertasBoton(),
      accountMenu({ nombre: usuario?.nombre, onLogout: acciones.cerrarSesion }),
    ],
    sidebarFooter: escuadronResumen({ nombre, miembros: miembros.length, plazas }),
    body,
  })
}
