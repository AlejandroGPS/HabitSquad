const example = {
  id: 'demo',
  nombre: 'Los Inquebrantables',
  publico: false,
  capacidad: 5,
  codigo: 'K7P2QX',
  esAdministrador: true,
  miembros: [
    { id: 'ale', nickname: 'alegarcia', esAdministrador: true, esUsuario: true, fotoUrl: null },
    { id: 'laura', nickname: 'laura.run', esAdministrador: false, esUsuario: false, fotoUrl: null },
    { id: 'sergio', nickname: 'sergiofb', esAdministrador: false, esUsuario: false, fotoUrl: null },
  ],
}

const clone = (value) => structuredClone(value)

// Estado aislado del backend y del buscador. Persiste al navegar, hasta recargar.
export function createMockSquadSettings({ esAdministrador = true } = {}) {
  let squad = { ...clone(example), esAdministrador }
  function current(id, admin = false) {
    if (!squad || id !== squad.id) throw new Error('Este escuadrón de ejemplo no está disponible.')
    if (admin && !squad.esAdministrador) throw new Error('Solo el administrador puede configurar este escuadrón.')
    return squad
  }
  return {
    async get(id) { return clone(current(id)) },
    async update(id, { nombre, publico, capacidad }) {
      const value = current(id, true)
      const name = String(nombre ?? '').trim()
      if (!name || name.length > 100) throw new Error('El nombre debe tener entre 1 y 100 caracteres.')
      if (typeof publico !== 'boolean') throw new Error('Elige la visibilidad del escuadrón.')
      if (!Number.isInteger(capacidad) || capacidad < Math.max(2, value.miembros.length) || capacidad > 10) {
        throw new Error('Las plazas deben estar entre 2 y 10 y no pueden ser menos que los miembros actuales.')
      }
      squad = { ...value, nombre: name, publico, capacidad }
      return clone(squad)
    },
    async removeMember(id, memberId) {
      const value = current(id, true)
      const member = value.miembros.find((entry) => entry.id === memberId)
      if (!member) throw new Error('Este miembro ya no está en el escuadrón.')
      if (member.esAdministrador || member.esUsuario) throw new Error('No puedes expulsar al administrador.')
      squad = { ...value, miembros: value.miembros.filter((entry) => entry.id !== memberId) }
      return clone(squad)
    },
    async regenerateInvitation(id) {
      const value = current(id, true)
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const bytes = new Uint8Array(6)
      let code
      do {
        globalThis.crypto.getRandomValues(bytes)
        code = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
      } while (code === value.codigo)
      squad = { ...value, codigo: code }
      return clone(squad)
    },
    async delete(id) { current(id, true); squad = null },
  }
}

export const mockSquadSettings = createMockSquadSettings()
