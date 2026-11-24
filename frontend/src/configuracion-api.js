import { getSquad, getSquadConfiguration, updateSquadConfiguration } from './api.js'

function configuration(value) {
  return {
    id: value.id,
    nombre: value.nombre,
    publico: value.es_publico,
    capacidad: value.limite_miembros,
    miembrosActuales: value.miembros_actuales,
    esAdministrador: true,
  }
}

// El endpoint de configuración autoriza al administrador antes de leer el detalle.
export const squadSettingsApi = {
  async get(id) {
    const settings = await getSquadConfiguration(id)
    const squad = await getSquad(id)
    return {
      ...configuration(settings),
      codigo: squad.codigo_invitacion,
      miembros: squad.miembros.map((member) => ({
        id: String(member.usuario_id),
        nickname: member.nickname || `Miembro ${member.usuario_id}`,
        esAdministrador: member.es_administrador,
        esUsuario: member.es_usuario,
        fotoUrl: member.foto_url,
      })),
    }
  },
  async update(id, { nombre, publico, capacidad }) {
    return configuration(await updateSquadConfiguration(id, {
      nombre,
      es_publico: publico,
      limite_miembros: capacidad,
    }))
  },
}
