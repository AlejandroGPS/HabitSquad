const STORAGE_KEY = 'habitsquad.session'
const SQUAD_KEY = 'habitsquad.escuadron'

export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (session?.access && session?.refresh) return session
  } catch {
    // Un valor que no es JSON cuenta como sesión inexistente.
  }
  return null
}

export function hasSession() {
  return getSession() !== null
}

export function saveSession({ access, refresh }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ access, refresh }))
}

export function rememberSquad(id) {
  if (/^[1-9]\d*$/.test(String(id ?? ''))) sessionStorage.setItem(SQUAD_KEY, String(id))
}

export function rememberedSquad() {
  return sessionStorage.getItem(SQUAD_KEY)
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(SQUAD_KEY)
}
