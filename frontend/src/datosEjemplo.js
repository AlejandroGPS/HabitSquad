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
