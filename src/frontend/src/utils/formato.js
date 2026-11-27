const formatoDinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function dinero(valor) {
  return formatoDinero.format(Number(valor) || 0)
}

export function fecha(valor) {
  if (!valor) return ''
  return new Date(valor).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fechaHora(valor) {
  if (!valor) return ''
  return new Date(valor).toLocaleString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function hoyISO() {
  const hoy = new Date()
  hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset())
  return hoy.toISOString().slice(0, 10)
}

// en la API van en mayúscula (EFECTIVO, CHIVO_WALLET...)
export const METODOS_PAGO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  bitcoin: 'Bitcoin',
  chivo_wallet: 'Chivo Wallet'
}

export const metodoParaApi = (metodo) => metodo.toUpperCase()
export const metodoDesdeApi = (metodo) => (metodo ? metodo.toLowerCase() : null)

export const DOCUMENTOS = {
  FCF: 'Factura consumidor final',
  CCF: 'Comprobante de crédito fiscal'
}
