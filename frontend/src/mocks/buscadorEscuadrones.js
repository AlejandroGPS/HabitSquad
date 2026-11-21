// Adaptador temporal. No utiliza los endpoints ni los identificadores de escuadrones reales.
const PEOPLE = [
  ['laura.run', 'Correr 30 minutos'], ['pablo.s', 'Leer 20 minutos'],
  ['marta.ruiz', 'Meditar 10 minutos'], ['noa.g', 'Caminar 8.000 pasos'],
  ['carlos_gym', 'Ir al gimnasio'],
]

const EXAMPLES = [
  ['lectores', 'Lectores nocturnos', 'Lectura', 'Leer 20 minutos antes de dormir', 34, 3, 'violet'],
  ['madrugadores', 'Madrugadores 6:30', 'Deporte', 'Correr o caminar 30 minutos', 21, 2, 'orange'],
  ['mente', 'Mente en calma', 'Meditación', 'Meditar 10 minutos', 12, 4, 'sky'],
  ['azucar', 'Sin azúcar', 'Alimentación', 'Un día sin azúcar añadido', 58, 5, 'green'],
  ['club', 'Club de lectura Zaragoza', 'Lectura', 'Un capítulo al día', 9, 2, 'orange'],
  ['pasos', 'Un paso más', 'Deporte', 'Caminar 8.000 pasos cada día', 17, 3, 'sky'],
  ['foco', 'Modo foco', 'Estudio', 'Estudiar una hora sin distracciones', 28, 4, 'violet'],
  ['pausa', 'Una pausa consciente', 'Meditación', 'Respirar y desconectar 10 minutos', 7, 2, 'green'],
  ['cocina', 'Cocina de casa', 'Alimentación', 'Preparar una comida casera', 15, 3, 'orange'],
  ['paginas', 'Entre páginas', 'Lectura', 'Leer 15 páginas al día', 42, 5, 'sky'],
  ['examenes', 'A por ese examen', 'Estudio', 'Repasar un tema cada día', 6, 1, 'green'],
  ['movimiento', 'Siempre en movimiento', 'Deporte', 'Moverse al menos 20 minutos', 3, 4, 'violet'],
]

export function createMockSquadSearch() {
  const squads = EXAMPLES.map(([id, nombre, categoria, habito, racha, count, color]) => ({
    id, nombre, categoria, habito, racha, color, capacidad: 5, publico: true,
    unido: false, habitoPropio: '',
    miembros: PEOPLE.slice(0, count).map(([nickname, habito]) => ({ nickname, habito })),
  }))
  const copy = (value) => structuredClone(value)
  function find(id) {
    const squad = squads.find((entry) => entry.id === id)
    if (!squad) throw new Error('Este escuadrón ya no está disponible.')
    return squad
  }
  return {
    async list() { return copy(squads.filter((squad) => squad.publico)) },
    async join(id) {
      const squad = find(id)
      if (!squad.unido) {
        if (squad.miembros.length >= squad.capacidad) throw new Error('El escuadrón se acaba de completar. Prueba con otro.')
        squad.miembros.push({ nickname: 'tú', habito: 'Hábito por elegir' })
        squad.unido = true
      }
      return copy(squad)
    },
    async saveHabit(id, text) {
      const squad = find(id)
      if (!squad.unido) throw new Error('Primero tienes que unirte al escuadrón.')
      const habit = text.trim()
      if (!habit || habit.length > 60) throw new Error('Escribe un hábito de entre 1 y 60 caracteres.')
      squad.habitoPropio = habit
      squad.miembros.at(-1).habito = habit
      return copy(squad)
    },
  }
}

// Los cambios sobreviven a la navegación y se reinician al recargar la aplicación.
export const mockSquadSearch = createMockSquadSearch()
