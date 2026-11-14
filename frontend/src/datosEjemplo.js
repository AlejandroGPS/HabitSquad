// TODO: datos falsos para maquetar el panel mientras no existan los endpoints.
// - Escuadrones del usuario: T70 (GET de los escuadrones a los que pertenece).
// - Racha, hábitos y estado diario de cada miembro: PBIs de hábito, prueba y racha.
export const panelEjemplo = {
  escuadron: {
    nombre: 'Los Inquebrantables',
    codigo: 'K7P2QX',
    plazas: 5,
    racha: 12,
    cierre: '23:59',
  },
  miembros: [
    { nombre: 'Carlos', habito: 'Gimnasio', estado: 'cumplido' },
    { nombre: 'Laura', habito: 'Leer', estado: 'pendiente' },
    { nombre: 'Alejandro', habito: 'Leer un libro', estado: 'sin-prueba', esUsuario: true },
  ],
}

// TODO: boceto de la configuración del escuadrón (PBI #130). Faltan en el backend la visibilidad y
// el límite de miembros, y los endpoints para guardarlos, cambiar el código, expulsar (PBI #131)
// y eliminar el escuadrón.
export function codigoEjemplo() {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('')
}

export const configuracionEjemplo = {
  escuadron: {
    nombre: 'Los Inquebrantables',
    codigo: 'K7P2QX',
    visibilidad: 'privado',
    plazas: 5,
  },
  miembros: [
    { nombre: 'Alejandro', esUsuario: true, esAdministrador: true },
    { nombre: 'Carlos' },
    { nombre: 'Laura' },
  ],
}
