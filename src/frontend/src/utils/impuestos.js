export const TASA_IVA = 0.13

export function redondear(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

// los precios se guardan sin IVA; el 13% se suma al subtotal, igual que en el backend
export function calcularTotales(lineas) {
  const subtotal = redondear(lineas.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0))
  const iva = redondear(subtotal * TASA_IVA)
  const total = redondear(subtotal + iva)
  return { subtotal, iva, total }
}
