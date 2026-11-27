import client from './client.js'

// El backend no tiene ruta para "mi caja abierta", así que se guarda el id_caja
// y se consulta con GET /cajas/:id

const clave = (idUsuario) => `origenes_caja_${idUsuario}`

export function recordarCaja(idUsuario, idCaja) {
  if (idUsuario && idCaja) localStorage.setItem(clave(idUsuario), String(idCaja))
}

export function olvidarCaja(idUsuario) {
  localStorage.removeItem(clave(idUsuario))
}

export function cajaRecordada(idUsuario) {
  const id = Number(localStorage.getItem(clave(idUsuario)))
  return id > 0 ? id : null
}

// caja abierta, null si no hay, undefined si no se sabe
export async function obtenerCajaAbierta(idUsuario) {
  try {
    const respuesta = await client.get('/cajas/actual')
    if (respuesta?.caja?.id_caja) recordarCaja(idUsuario, respuesta.caja.id_caja)
    return respuesta?.caja ? respuesta : null
  } catch (err) {
    // 400/404: /cajas/actual todavía no existe
    if (err.status !== 400 && err.status !== 404) throw err
  }

  const id = cajaRecordada(idUsuario)
  if (!id) return undefined

  try {
    const respuesta = await client.get(`/cajas/${id}`)
    return respuesta.caja?.estado === 'ABIERTA' ? respuesta : null
  } catch (err) {
    if (err.status !== 404) throw err
  }
  olvidarCaja(idUsuario)
  return undefined
}
