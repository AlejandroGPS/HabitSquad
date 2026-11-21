import { describe, expect, it } from 'vitest'
import { createMockSquadSettings } from './configuracionEscuadron.js'

describe('configuración mock', () => {
  it('aísla las copias y conserva las operaciones hasta volver a crear el mock', async () => {
    const api = createMockSquadSettings()
    const initial = await api.get('demo')
    initial.miembros.pop()
    expect((await api.get('demo')).miembros).toHaveLength(3)
    await api.update('demo', { nombre: '  Otro nombre  ', publico: true, capacidad: 8 })
    expect(await api.get('demo')).toMatchObject({ nombre: 'Otro nombre', publico: true, capacidad: 8 })
    expect((await createMockSquadSettings().get('demo')).nombre).toBe('Los Inquebrantables')
  })
  it.each([1, 2, 11, 4.5, NaN])('rechaza plazas inválidas: %s', async (capacidad) => {
    const api = createMockSquadSettings()
    await expect(api.update('demo', { nombre: 'Equipo', publico: false, capacidad })).rejects.toThrow('plazas')
    expect((await api.get('demo')).capacidad).toBe(5)
  })
  it.each(['', '   ', 'x'.repeat(101)])('rechaza un nombre inválido sin modificar el escuadrón', async (nombre) => {
    const api = createMockSquadSettings()
    await expect(api.update('demo', { nombre, publico: false, capacidad: 5 })).rejects.toThrow('nombre')
    expect((await api.get('demo')).nombre).toBe('Los Inquebrantables')
  })
  it('impide expulsar al administrador y libera la plaza del miembro expulsado', async () => {
    const api = createMockSquadSettings()
    await expect(api.removeMember('demo', 'ale')).rejects.toThrow('administrador')
    const updated = await api.removeMember('demo', 'laura')
    expect(updated.miembros.map((member) => member.id)).toEqual(['ale', 'sergio'])
    expect(updated.capacidad).toBe(5)
    await expect(api.removeMember('demo', 'laura')).rejects.toThrow('ya no está')
    await expect(api.update('demo', { nombre: 'Dúo', publico: false, capacidad: 2 })).resolves.toMatchObject({ capacidad: 2 })
  })
  it('sustituye el código y elimina el escuadrón', async () => {
    const api = createMockSquadSettings()
    const updated = await api.regenerateInvitation('demo')
    expect(updated.codigo).toMatch(/^[A-Z2-9]{6}$/)
    expect(updated.codigo).not.toBe('K7P2QX')
    expect((await api.get('demo')).codigo).toBe(updated.codigo)
    await api.delete('demo')
    await expect(api.get('demo')).rejects.toThrow('no está disponible')
    await expect(api.regenerateInvitation('demo')).rejects.toThrow('no está disponible')
  })
  it('deniega todas las escrituras a quien no administra', async () => {
    const api = createMockSquadSettings({ esAdministrador: false })
    expect((await api.get('demo')).esAdministrador).toBe(false)
    for (const operation of [
      () => api.update('demo', { nombre: 'Otro', publico: true, capacidad: 6 }),
      () => api.removeMember('demo', 'laura'),
      () => api.regenerateInvitation('demo'),
      () => api.delete('demo'),
    ]) await expect(operation()).rejects.toThrow('Solo el administrador')
  })
})
