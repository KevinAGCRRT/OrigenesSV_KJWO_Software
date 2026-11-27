import client from './client.js'
import { normalizarProductos, normalizarVenta, filtrarVentas } from './adaptadores.js'
import { redondear } from '../utils/impuestos.js'
import { metodoParaApi } from '../utils/formato.js'
import { obtenerCajaAbierta, recordarCaja } from './cajaActual.js'

// el backend pide entre 16 y 100 caracteres
export function nuevaClaveVenta() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

// productos del POS con lo que alcanza según el inventario de la sucursal
export async function getProductosVenta(sucursalId) {
  const productos = await client.get('/productos')

  let inventario = null
  if (productos.some((p) => p.disponibles === undefined)) {
    try {
      inventario = await client.get(`/inventario/${sucursalId}`)
    } catch {
      inventario = null
    }
  }
  return normalizarProductos(productos, inventario)
}

// { turno } o { turno: null }; si no se puede saber lanza error
export async function getEstadoCaja(idUsuario) {
  const abierta = await obtenerCajaAbierta(idUsuario)
  if (abierta === undefined) throw new Error('No se puede saber si hay una caja abierta')
  return { turno: abierta ? abierta.caja : null }
}

// filtros: { tipo_documento, estado, desde, hasta }
export async function getVentas(filtros = {}) {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor) params.append(clave, valor)
  })
  const query = params.toString()
  const ventas = await client.get(query ? `/ventas?${query}` : '/ventas')
  return filtrarVentas(ventas.map((v) => normalizarVenta(v)), filtros)
}

// el detalle solo trae id_producto; los nombres salen de /productos
async function nombresDeProductos() {
  try {
    const productos = await client.get('/productos')
    return new Map(productos.map((p) => [p.id_producto ?? p.id, p.nombre]))
  } catch {
    return new Map()
  }
}

export async function getVenta(id) {
  const venta = await client.get(`/ventas/${id}`)
  const faltanNombres = (venta.detalle || []).some((d) => !d.nombre)
  return normalizarVenta(venta, faltanNombres ? await nombresDeProductos() : undefined)
}

// clave: la misma en cada reintento de la misma orden, para no cobrar dos veces
export async function crearVenta(venta, { clave, idUsuario } = {}) {
  let respuesta
  try {
    respuesta = await client.post(
      '/ventas',
      {
        tipo_documento: venta.tipo_documento,
        metodo_pago: metodoParaApi(venta.metodo_pago),
        productos: venta.detalle.map((d) => ({ id_producto: d.producto_id, cantidad: d.cantidad })),
        monto_recibido: venta.monto_recibido,
        cliente: venta.cliente
      },
      { 'Idempotency-Key': clave || nuevaClaveVenta() }
    )
  } catch (err) {
    // el backend no manda "codigo"; se reconoce por el mensaje
    if (err.status === 409 && /caja abierta/i.test(err.message)) err.codigo = 'CAJA_CERRADA'
    throw err
  }
  const datos = respuesta.venta ?? respuesta
  // si la clave ya se había usado, el backend devuelve la venta sin detalle
  const creada = datos.repetida ? await getVenta(datos.id_venta) : normalizarVenta(datos)
  recordarCaja(idUsuario, creada.id_caja)

  const metodo = creada.metodo_pago ?? venta.metodo_pago
  return {
    ...creada,
    metodo_pago: metodo,
    monto_recibido: creada.monto_recibido ?? venta.monto_recibido,
    cambio: creada.cambio ?? (metodo === 'efectivo' ? redondear(venta.monto_recibido - creada.total) : 0),
    cliente: creada.cliente ?? venta.cliente
  }
}

// después de anular se vuelve a pedir la venta completa
export async function anularVenta(id, motivo) {
  const respuesta = await client.patch(`/ventas/${id}/anular`, { reintegrarInventario: true, motivo })
  const venta = respuesta.venta ?? respuesta
  if (venta.detalle) return normalizarVenta(venta)
  const completa = await getVenta(id)
  return { ...completa, motivo_anulacion: completa.motivo_anulacion ?? motivo }
}
