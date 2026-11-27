import { ApiError, joinPublicSquad, listPublicSquads, saveDailyHabit } from './api.js'

function summary(value) {
  return {
    id: value.id,
    nombre: value.nombre,
    publico: value.es_publico,
    capacidad: value.limite_miembros,
    miembrosActuales: value.miembros_actuales ?? value.miembros.length,
    color: ['violet', 'orange', 'sky', 'green'][value.id % 4],
  }
}

export const squadSearchApi = {
  async list(query = '') {
    return (await listPublicSquads(query)).map((value) => ({ ...summary(value), racha: value.racha }))
  },
  async join(id) {
    return { ...summary(await joinPublicSquad(id)), unido: true }
  },
  async saveHabit(id, text) {
    const habit = await saveDailyHabit(id, { opcion: 'otro', texto_personalizado: text.trim() })
    return { id, habitoPropio: habit.texto_personalizado }
  },
}

export function squadSearchError(error, fallback) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
    if (error.status === 429) return 'Has hecho demasiadas peticiones. Espera un rato y vuelve a intentarlo.'
    const field = error.data?.texto_personalizado ?? error.data?.opcion
    if (error.status === 400 && Array.isArray(field) && field.length) return field.join(' ')
    if ([400, 403, 404, 409].includes(error.status) && typeof error.data?.detail === 'string') return error.data.detail
  }
  return fallback
}
