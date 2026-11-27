// Convierte las respuestas del backend al formato que usan las pantallas

function stockPorInsumo(inventario) {
  const mapa = new Map()
  inventario.forEach((fila) => mapa.set(fila.id_insumo, Number(fila.stock_actual) || 0))
  return mapa
}

// unidades que alcanzan con el inventario; en elaborados manda el insumo que se acaba primero
export function calcularDisponibles(producto, stock) {
  if (!stock) return null

  if (producto.es_elaborado) {
    const receta = producto.receta || []
    if (receta.length === 0) return 0
    return Math.min(
      ...receta.map((r) => Math.floor((stock.get(r.id_insumo) || 0) / Number(r.cantidad_requerida)))
    )
  }
  return Math.floor(stock.get(producto.id_insumo_reventa) || 0)
}

export function normalizarProductos(productos, inventario = null) {
  const stock = Array.isArray(inventario) ? stockPorInsumo(inventario) : null

  return productos.map((p) => {
    const tipo = p.es_elaborado ? 'elaborado' : 'reventa'
    return {
      id: p.id_producto,
      nombre: p.nombre,
      precio: Number(p.precio_venta),
      tipo,
      // productos todavía no tiene categoría
      categoria: p.categoria || (tipo === 'reventa' ? 'Para llevar' : 'Menú'),
      // null si no llegó el inventario
      disponibles: calcularDisponibles(p, stock)
    }
  })
}

// usuario que devuelve el login
export function normalizarUsuario(u) {
  if (u.id !== undefined && u.sucursal_id !== undefined) return u // datos simulados
  return {
    id: u.id_usuario,
    id_empleado: u.id_empleado,
    username: u.username,
    nombre: [u.nombre, u.apellido].filter(Boolean).join(' '),
    rol: u.rol,
    sucursal_id: u.id_sucursal,
    // el login todavía no trae el nombre de la sucursal
    sucursal: u.sucursal || u.nombre_sucursal || String(u.id_sucursal)
  }
}

// ventas
const ESTADOS = { completada: 'emitida', anulada: 'anulada', emitida: 'emitida' }

export function formatoCorrelativo(tipo, numero) {
  if (typeof numero === 'string' && numero.includes('-')) return numero
  return `${tipo}-${String(numero).padStart(6, '0')}`
}

// nombres: id_producto -> nombre (el detalle solo trae ids)
export function normalizarVenta(v, nombres = new Map()) {
  if (v.id !== undefined && typeof v.correlativo === 'string') return v // datos simulados

  return {
    id: v.id_venta,
    correlativo: formatoCorrelativo(v.tipo_documento, v.correlativo),
    tipo_documento: v.tipo_documento,
    fecha: v.fecha || new Date().toISOString(),
    estado: ESTADOS[v.estado] || v.estado,
    sucursal_id: v.id_sucursal,
    sucursal: v.sucursal || String(v.id_sucursal),
    cajero: v.cajero || null,
    metodo_pago: v.metodo_pago ? v.metodo_pago.toLowerCase() : null,
    id_caja: v.id_caja ?? null,
    monto_recibido: v.monto_recibido != null ? Number(v.monto_recibido) : null,
    cambio: v.cambio != null ? Number(v.cambio) : null,
    cliente: v.cliente || null,
    motivo_anulacion: v.motivo_anulacion || null,
    inventario_reintegrado: v.inventario_reintegrado,
    subtotal: Number(v.subtotal),
    iva: Number(v.iva),
    total: Number(v.total),
    detalle: (v.detalle || []).map((d) => ({
      producto_id: d.id_producto,
      nombre: d.nombre || nombres.get(d.id_producto) || `Producto ${d.id_producto}`,
      cantidad: d.cantidad,
      precio_unitario: Number(d.precio_unitario),
      total: Number(d.total_producto ?? d.importe)
    }))
  }
}

// el backend todavía no filtra por fecha ni tipo, así que se filtra aquí
export function filtrarVentas(ventas, filtros = {}) {
  const dia = (iso) => {
    const fecha = new Date(iso)
    fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset())
    return fecha.toISOString().slice(0, 10)
  }
  return ventas.filter(
    (v) =>
      (!filtros.tipo_documento || v.tipo_documento === filtros.tipo_documento) &&
      (!filtros.estado || v.estado === filtros.estado) &&
      (!filtros.desde || dia(v.fecha) >= filtros.desde) &&
      (!filtros.hasta || dia(v.fecha) <= filtros.hasta)
  )
}