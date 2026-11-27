import { createContext, useContext, useEffect, useState } from 'react'
import * as authApi from '../api/auth.api.js'
import { TOKEN_KEY, USUARIO_KEY } from '../api/client.js'

const AuthContext = createContext(null)

// fecha de vencimiento del token en milisegundos (null si no trae "exp")
function venceEn(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return 0
  }
}

function tokenVigente(token) {
  const vence = venceEn(token)
  return vence === null || vence > Date.now()
}

function leerSesionGuardada() {
  const token = localStorage.getItem(TOKEN_KEY)
  const usuario = localStorage.getItem(USUARIO_KEY)

  if (!token || !usuario || !tokenVigente(token)) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
    return { token: null, usuario: null }
  }
  return { token, usuario: JSON.parse(usuario) }
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada)

  const iniciarSesion = async (username, password) => {
    const { token, usuario } = await authApi.login(username, password)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario))
    setSesion({ token, usuario })
    return usuario
  }

  const cerrarSesion = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
    setSesion({ token: null, usuario: null })
  }

  // cierra la sesión cuando vence el token
  useEffect(() => {
    if (!sesion.token) return
    const vence = venceEn(sesion.token)
    if (vence === null) return

    const timer = setTimeout(() => {
      cerrarSesion()
      window.location.href = '/login?expirada=1'
    }, Math.min(Math.max(vence - Date.now(), 0), 2147483647))
    return () => clearTimeout(timer)
  }, [sesion.token])

  const tieneRol = (...roles) => Boolean(sesion.usuario) && roles.includes(sesion.usuario.rol)

  const valor = {
    usuario: sesion.usuario,
    token: sesion.token,
    autenticado: Boolean(sesion.token),
    iniciarSesion,
    cerrarSesion,
    tieneRol
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return contexto
}
