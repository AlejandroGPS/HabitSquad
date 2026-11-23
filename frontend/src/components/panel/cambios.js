const cumplidos = (miembros) => miembros.filter(({ estado }) => estado === 'cumplido').length

// Las filas de miembros y las barras de «Hoy» siguen el orden de `miembros`.
export function animarCambios(antes, { racha, miembros }, { rachaTarjeta, chip, hoy, miembrosTarjeta }) {
  if (racha !== antes.racha) {
    const clase = racha > antes.racha ? 'vivo-sube' : 'vivo-cae'
    rachaTarjeta.querySelector('[data-racha]')?.classList.add(clase)
    chip.classList.add(clase)
  }
  if (cumplidos(miembros) !== cumplidos(antes.miembros) || miembros.length !== antes.miembros.length) {
    hoy.querySelector('[data-valor]')?.classList.add('vivo-sube')
  }
  const previos = new Map(antes.miembros.map((miembro) => [miembro.id, miembro]))
  const filas = miembrosTarjeta.querySelectorAll('li')
  const barras = hoy.querySelector('[data-barras]')?.children ?? []
  miembros.forEach((miembro, indice) => {
    const previo = previos.get(miembro.id)
    if (!previo) {
      filas[indice]?.classList.add('vivo-llega')
      barras[indice]?.classList.add('vivo-barra')
      return
    }
    if (['estado', 'habito', 'nombre'].some((campo) => previo[campo] !== miembro[campo])) {
      filas[indice]?.classList.add('vivo-destello')
    }
    if ((previo.estado === 'cumplido') !== (miembro.estado === 'cumplido')) {
      barras[indice]?.classList.add('vivo-barra')
    }
  })
}
