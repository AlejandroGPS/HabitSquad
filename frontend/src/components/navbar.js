import { landingNav } from './landing/landingNav.js'
import { selectorCuenta } from './selectorCuenta.js'

// Misma barra que la portada, con el selector de cuenta a la derecha. Sin enlaces de cuenta
// (pantallas con sesión iniciada) tampoco tiene sentido enlazar a las secciones de la portada.
export function accessNavbar({ active = null, showAccountLinks = true } = {}) {
  return landingNav({
    cuenta: showAccountLinks ? selectorCuenta({ activa: active }) : null,
    conSecciones: showAccountLinks,
  })
}
