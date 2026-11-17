const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function minutosRestantes(ahora, cierre) {
  const [horas, minutos] = cierre.split(':').map(Number)
  const limite = new Date(ahora)
  limite.setHours(horas, minutos, 0, 0)
  if (limite <= ahora) return null
  return Math.ceil((limite - ahora) / 60000)
}

export function duracion(minutos) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (!horas) return `${resto} min`
  return resto ? `${horas} h ${resto} min` : `${horas} h`
}

export function tiempoRestante(ahora, cierre) {
  const restante = minutosRestantes(ahora, cierre)
  if (restante === null) return null
  const hh = String(Math.floor(restante / 60)).padStart(2, '0')
  const mm = String(restante % 60).padStart(2, '0')
  return `${hh}:${mm} h`
}

export function semanaActual(ahora) {
  const lunes = new Date(ahora)
  lunes.setHours(0, 0, 0, 0)
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  return DIAS.map((letra, indice) => {
    const dia = new Date(lunes)
    dia.setDate(lunes.getDate() + indice)
    return { letra, numero: dia.getDate(), hoy: dia.toDateString() === ahora.toDateString() }
  })
}
