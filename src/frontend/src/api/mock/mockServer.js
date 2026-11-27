// Servidor falso para trabajar sin backend (VITE_USE_MOCK=true).
// Cada módulo de mock/modulos exporta sus "rutas"; se revisan en orden.
import { usuarios } from './mockData.js'
import { fallar } from './db.js'

const modulos = import.meta.glob('./modulos/*.mock.js', { eager: true })
const rutas = Object.values(modulos).flatMap((modulo) => modulo.rutas || [])

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function crearToken(usuario) {
  const codificar = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '')
  const payload = {
    id: usuario.id,
    rol: usuario.rol,
    sucursal_id: usuario.sucursal_id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8
  }
  return `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar(payload)}.firma-de-prueba`
}

function usuarioDelToken(token) {
  if (!token) fallar(401, 'Token requerido')
  let payload
  try {
    payload = JSON.parse(atob(token.split('.')[1]))
  } catch {
    fallar(401, 'Token inválido')
  }
  const usuario = usuarios.find((u) => u.id === payload.id)
  if (!usuario) fallar(401, 'Token inválido')
  return usuario
}

function sinPassword(usuario) {
  const { password, ...resto } = usuario
  return resto
}

// '/cajas/:id/cerrar' con '/cajas/4/cerrar' devuelve { id: '4' }
function coincide(patron, path) {
  const partesPatron = patron.split('/')
  const partesPath = path.split('/')
  if (partesPatron.length !== partesPath.length) return null

  const params = {}
  for (let i = 0; i < partesPatron.length; i++) {
    if (partesPatron[i].startsWith(':')) {
      params[partesPatron[i].slice(1)] = decodeURIComponent(partesPath[i])
    } else if (partesPatron[i] !== partesPath[i]) {
      return null
    }
  }
  return params
}

export async function mockRequest(metodo, ruta, body, token, headers = {}) {
  await esperar(350)
  const [path, queryTexto = ''] = ruta.split('?')
  const query = Object.fromEntries(new URLSearchParams(queryTexto))

  if (metodo === 'POST' && path === '/auth/login') {
    const nombre = (body.username || body.correo || '').trim()
    const usuario = usuarios.find((u) => (u.username === nombre || u.correo === nombre) && u.password === body.password)
    if (!usuario) fallar(401, 'Credenciales incorrectas')
    return { token: crearToken(usuario), usuario: sinPassword(usuario) }
  }

  const usuario = usuarioDelToken(token)

  if (metodo === 'GET' && path === '/auth/perfil') {
    return sinPassword(usuario)
  }

  for (const r of rutas) {
    if (r.metodo !== metodo) continue
    const params = coincide(r.ruta, path)
    if (!params) continue
    if (r.roles && !r.roles.includes(usuario.rol)) {
      fallar(403, 'Tu rol no tiene permiso para esta acción')
    }
    // copia, para que la pantalla no modifique los datos guardados
    const respuesta = await r.manejar({ params, query, body, usuario, headers })
    return respuesta === undefined ? null : structuredClone(respuesta)
  }

  fallar(404, `Ruta simulada no encontrada: ${metodo} ${ruta}`)
}