import { mockRequest } from './mock/mockServer.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const TOKEN_KEY = 'origenes_token'
export const USUARIO_KEY = 'origenes_usuario'

// Error propio para que las pantallas sepan el status y el mensaje del backend
export class ApiError extends Error {
  constructor(mensaje, status, detalles = null, codigo = null) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.detalles = detalles
    this.codigo = codigo
  }
}

function cerrarSesionLocal() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USUARIO_KEY)
}

// Todas las llamadas a la API pasan por aquí: agrega el token,
// convierte la respuesta a JSON y lanza ApiError si algo sale mal.
async function request(metodo, ruta, body = null, headersExtra = {}) {
  const token = localStorage.getItem(TOKEN_KEY)

  if (USE_MOCK) {
    try {
      return await mockRequest(metodo, ruta, body, token, headersExtra)
    } catch (err) {
      throw new ApiError(err.mensaje || 'Error en datos simulados', err.status || 500, err.detalles, err.codigo)
    }
  }

  const opciones = {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...headersExtra }
  }
  if (token) {
    opciones.headers.Authorization = `Bearer ${token}`
  }
  if (body) {
    opciones.body = JSON.stringify(body)
  }

  let respuesta
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones)
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa que la API esté encendida.', 0)
  }

  let datos = null
  if (respuesta.status !== 204) {
    try {
      datos = await respuesta.json()
    } catch {
      datos = null
    }
  }

  if (respuesta.status === 401 && ruta !== '/auth/login') {
    cerrarSesionLocal()
    window.location.href = '/login?expirada=1'
    throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401)
  }

  if (!respuesta.ok) {
    const mensaje = datos?.mensaje || datos?.message || `Error ${respuesta.status}`
    throw new ApiError(mensaje, respuesta.status, datos?.detalles, datos?.codigo)
  }

  return datos
}

// headers: opcional, por ejemplo { 'Idempotency-Key': '...' } al registrar una venta
const client = {
  get: (ruta, headers) => request('GET', ruta, null, headers),
  post: (ruta, body, headers) => request('POST', ruta, body, headers),
  put: (ruta, body, headers) => request('PUT', ruta, body, headers),
  patch: (ruta, body, headers) => request('PATCH', ruta, body, headers),
  delete: (ruta, headers) => request('DELETE', ruta, null, headers)
}

export default client
