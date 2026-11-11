import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conSiguiente, normalizarCodigo, rutaUnirse } from '../components/landing/empezar.js'
import { destinoTrasAcceso, guard, routes } from '../routes.js'
import { saveSession } from '../session.js'
import { presentacionScreen } from './presentacion.js'

const TITULO = 'Cumple tu hábito. Que no caiga la racha.'
const UNIRSE_K7P2QX = '/escuadrones/unirse?codigo=K7P2QX'

function ruta(path) {
  return routes.find((route) => route.path === path)
}

function mount(navigate = vi.fn()) {
  const element = presentacionScreen({ navigate })
  document.body.replaceChildren(element)
  return { element, navigate }
}

function enlace(contenedor, texto) {
  return [...contenedor.querySelectorAll('a')].find((a) => a.textContent.trim() === texto)
}

function escribirCodigo(element, valor) {
  const input = element.querySelector('#codigo-portada')
  input.value = valor
  input.dispatchEvent(new Event('input'))
  return input
}

function botonDe(element, texto) {
  return [...element.querySelectorAll('#tengo-codigo button')].find((b) => b.textContent === texto)
}

let pendientes = []

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
  pendientes = []
  vi.stubGlobal('requestAnimationFrame', (callback) => pendientes.push(callback))
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('página de presentación', () => {
  it('sin sesión, / muestra la presentación con sus tres secciones', () => {
    const inicio = ruta('/')
    expect(guard(inicio)).toBeNull()

    const element = inicio.view({ navigate: vi.fn() })
    expect(element.querySelector('h1').textContent).toBe(TITULO)
    for (const id of ['como-funciona', 'tu-escuadron', 'tengo-codigo']) {
      expect(element.querySelector(`#${id}`)).not.toBeNull()
    }
  })

  it('con sesión, / no muestra la presentación', () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    const element = ruta('/').view({ navigate: vi.fn() })
    expect(element.querySelector('h1').textContent).not.toBe(TITULO)
  })

  it('los botones del principio llevan a registro y a inicio de sesión', () => {
    const { element } = mount()
    const hero = element.querySelector('#inicio')

    expect(enlace(hero, 'Crear cuenta').getAttribute('href')).toBe('/registro')
    expect(enlace(hero, 'Ya tengo cuenta').getAttribute('href')).toBe('/login')
  })

  it('la barra lleva a iniciar sesión y a registrarse', () => {
    const { element } = mount()
    const cuenta = element.querySelector('nav[aria-label="Cuenta"]')

    expect(enlace(cuenta, 'Iniciar sesión').getAttribute('href')).toBe('/login')
    expect(enlace(cuenta, 'Registrarme').getAttribute('href')).toBe('/registro')
    expect(cuenta.querySelector('[aria-current]')).toBeNull()
  })

  it('el pie lleva a iniciar sesión y a registrarse', () => {
    const { element } = mount()
    const pie = element.querySelector('footer')

    expect(enlace(pie, 'Iniciar sesión').getAttribute('href')).toBe('/login')
    expect(enlace(pie, 'Registrarme').getAttribute('href')).toBe('/registro')
  })

  it('los enlaces del enrutador van a rutas que existen', () => {
    const { element } = mount()
    const paths = routes.map((route) => route.path)
    const hrefs = [...element.querySelectorAll('a[data-link]')].map(
      (a) => new URL(a.getAttribute('href'), window.location.origin).pathname,
    )

    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.filter((href) => !paths.includes(href))).toEqual([])
  })

  it('los enlaces de sección bajan a su sección sin cambiar la URL', () => {
    const { element } = mount()
    const enlaces = [...element.querySelectorAll('a[data-seccion]')]
    expect(enlaces.map((a) => a.textContent)).toEqual(['Cómo funciona', 'Tu escuadrón', 'Tengo un código'])

    for (const link of enlaces) {
      const destino = document.getElementById(link.dataset.seccion)
      const click = new MouseEvent('click', { bubbles: true, cancelable: true })
      link.dispatchEvent(click)

      expect(click.defaultPrevented).toBe(true)
      expect(destino.scrollIntoView).toHaveBeenCalled()
    }
    expect(window.location.hash).toBe('')
  })

  it('al llegar con /#seccion baja a esa sección', () => {
    window.history.replaceState({}, '', '/#tu-escuadron')
    const { element } = mount()
    for (const callback of pendientes.splice(0)) callback()

    const seccion = element.querySelector('#tu-escuadron')
    expect(seccion.scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('«Crear mi escuadrón» pasa por el registro y vuelve a crear el escuadrón', () => {
    const { element } = mount()
    expect(enlace(element, 'Crear mi escuadrón').getAttribute('href')).toBe(
      '/registro?siguiente=%2Fescuadrones%2Fnuevo',
    )
  })
})

describe('unirse con código desde la presentación', () => {
  it('pasa el código a mayúsculas y quita lo que no es letra o número', () => {
    const { element } = mount()
    expect(escribirCodigo(element, ' k7-p2 qx ').value).toBe('K7P2QX')
  })

  it('no deja seguir con un código incompleto', () => {
    const { element, navigate } = mount()
    const input = escribirCodigo(element, 'K7P')
    botonDe(element, 'Unirme al escuadrón').click()

    expect(navigate).not.toHaveBeenCalled()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(element.querySelector('#codigo-portada-error').classList.contains('hidden')).toBe(false)
  })

  it('al volver a escribir se quita el aviso de código incompleto', () => {
    const { element } = mount()
    escribirCodigo(element, 'K7P')
    botonDe(element, 'Unirme al escuadrón').click()
    const input = escribirCodigo(element, 'K7P2')

    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(element.querySelector('#codigo-portada-error').classList.contains('hidden')).toBe(true)
  })

  it('«Unirme al escuadrón» lleva a unirse con el código', () => {
    const { element, navigate } = mount()
    escribirCodigo(element, 'k7p2qx')
    botonDe(element, 'Unirme al escuadrón').click()

    expect(navigate).toHaveBeenCalledWith(UNIRSE_K7P2QX)
  })

  it('«Crear cuenta y unirme» pasa por el registro y después a unirse', () => {
    const { element, navigate } = mount()
    escribirCodigo(element, 'K7P2QX')
    botonDe(element, 'Crear cuenta y unirme').click()

    expect(navigate).toHaveBeenCalledWith(`/registro?siguiente=${encodeURIComponent(UNIRSE_K7P2QX)}`)
  })

  it('arma las rutas de unirse y de vuelta tras el acceso', () => {
    expect(normalizarCodigo(null)).toBe('')
    expect(rutaUnirse('K7P2QX')).toBe(UNIRSE_K7P2QX)
    expect(conSiguiente('/login', UNIRSE_K7P2QX)).toBe(
      '/login?siguiente=%2Fescuadrones%2Funirse%3Fcodigo%3DK7P2QX',
    )
  })
})

describe('vuelta a unirse tras iniciar sesión o registrarse', () => {
  it('sin sesión, unirse manda a iniciar sesión recordando la ruta', () => {
    window.history.replaceState({}, '', UNIRSE_K7P2QX)
    expect(guard(ruta('/escuadrones/unirse'))).toBe(conSiguiente('/login', UNIRSE_K7P2QX))
  })

  it('sin sesión, crear escuadrón también recuerda la ruta', () => {
    window.history.replaceState({}, '', '/escuadrones/nuevo')
    expect(guard(ruta('/escuadrones/nuevo'))).toBe(conSiguiente('/login', '/escuadrones/nuevo'))
  })

  it('tras el acceso vuelve a la ruta pedida', () => {
    window.history.replaceState({}, '', conSiguiente('/login', UNIRSE_K7P2QX))
    expect(destinoTrasAcceso()).toBe(UNIRSE_K7P2QX)
  })

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'escuadrones'])(
    'no acepta %s como destino y vuelve al inicio',
    (siguiente) => {
      window.history.replaceState({}, '', conSiguiente('/login', siguiente))
      expect(destinoTrasAcceso()).toBe('/')
    },
  )

  it('sin ?siguiente= vuelve al inicio', () => {
    window.history.replaceState({}, '', '/login')
    expect(destinoTrasAcceso()).toBe('/')
  })

  it('unirse rellena las casillas con el código de la URL', () => {
    saveSession({ access: 'access-token', refresh: 'refresh-token' })
    window.history.replaceState({}, '', UNIRSE_K7P2QX)
    const element = ruta('/escuadrones/unirse').view({ navigate: vi.fn() })
    const codigo = [...element.querySelectorAll('input')].map((input) => input.value).join('')

    expect(codigo).toBe('K7P2QX')
  })
})
