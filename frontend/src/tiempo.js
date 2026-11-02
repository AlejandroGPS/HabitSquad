const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function tiempoRestante(ahora, cierre) {
  const [horas, minutos] = cierre.split(':').map(Number)
  const limite = new Date(ahora)
  limite.setHours(horas, minutos, 0, 0)
  if (limite <= ahora) return null
  const restante = Math.ceil((limite - ahora) / 60000)
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
