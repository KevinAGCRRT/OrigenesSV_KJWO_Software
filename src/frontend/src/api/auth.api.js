import client from './client.js'
import { normalizarUsuario } from './adaptadores.js'

export async function login(username, password) {
  const respuesta = await client.post('/auth/login', { username, password })
  return { token: respuesta.token, usuario: normalizarUsuario(respuesta.usuario) }
}

export async function obtenerPerfil() {
  const respuesta = await client.get('/auth/perfil')
  return respuesta.usuario ?? respuesta
}