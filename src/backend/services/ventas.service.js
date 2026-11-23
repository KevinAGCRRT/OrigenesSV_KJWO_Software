const { getConnection, sql } = require("../config/coneccionSQLserver");
const { descontarInventarioPorVenta } = require("./inventario.service");

function fallo(status, mensaje) { const error = new Error(mensaje); error.status = status; throw error; }
function centavos(valor) {    

  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0 || numero > 10000000) fallo(400, "Precio inválido");
  return Math.round((numero + Number.EPSILON) * 100);
}

function moneda(cent) { return (cent / 100).toFixed(2); }

// Precios almacenados SIN IVA 
async function obtenerDetalleVenta(transaction, productos) {
  const detalle = [];
  let subtotalCentavos = 0;
  for (const producto of productos) {
    const resultado = await new sql.Request(transaction)
      .input("id_producto", sql.Int, producto.id_producto)
      .query("select id_producto, nombre, precio_venta, activo from productos where id_producto = @id_producto");
    
    const db = resultado.recordset[0];
    if (!db || !db.activo) fallo(400, `Producto ${producto.id_producto} inexistente o inactivo`);
    
    const precioCentavos = centavos(db.precio_venta);
    
    const importeCentavos = precioCentavos * producto.cantidad;
    if (!Number.isSafeInteger(importeCentavos)) fallo(400, "Importe fuera de rango");
    subtotalCentavos += importeCentavos;
    if (!Number.isSafeInteger(subtotalCentavos) || subtotalCentavos > 9999999999) fallo(400, "Venta demasiado grande");
    detalle.push({ id_producto: db.id_producto, nombre: db.nombre, cantidad: producto.cantidad,
      precio_unitario: moneda(precioCentavos), total_producto: moneda(importeCentavos) });
  }
  
  const ivaCentavos = Math.round(subtotalCentavos * 0.13);
  return { detalle, subtotal: moneda(subtotalCentavos), iva: moneda(ivaCentavos),
    total: moneda(subtotalCentavos + ivaCentavos) };
}

async function obtenerPool() {
  
  const pool = await getConnection();
  if (!pool) fallo(500, "No se pudo conectar a SQL Server");
  return pool;
}

async function registrarVenta({ id_sucursal, tipo_documento, productos }) {
  const pool = await obtenerPool();
  const t = new sql.Transaction(pool);
  let iniciada = false;
  
  try {
    await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    iniciada = true;
  
    const sucursal = await new sql.Request(t).input("id", sql.Int, id_sucursal)
      .query("select id_sucursal from sucursales where id_sucursal = @id and estado_sucursal = 1");
    if (!sucursal.recordset.length) fallo(400, "Sucursal no existe o está inactiva");
  
    const montos = await obtenerDetalleVenta(t, productos);

    // Correlativos separados por sucursal y tipo. El bloqueo previene duplicados concurrentes.
    const correlativoRes = await new sql.Request(t)
      .input("sucursal", sql.Int, id_sucursal)
      .input("tipo", sql.VarChar(3), tipo_documento)
      .query(`
        update correlativos_documento with (updlock, holdlock)
        set ultimo_numero = ultimo_numero + 1
        output inserted.ultimo_numero
        where id_sucursal = @sucursal and tipo_documento = @tipo;
      `);
    let correlativo;
    if (correlativoRes.recordset.length) {
      correlativo = correlativoRes.recordset[0].ultimo_numero;
    } else {
  
      const nuevo = await new sql.Request(t)
        .input("sucursal", sql.Int, id_sucursal)
        .input("tipo", sql.VarChar(3), tipo_documento)
        .query(`insert into correlativos_documento (id_sucursal, tipo_documento, ultimo_numero)
                output inserted.ultimo_numero values (@sucursal, @tipo, 1)`);
      correlativo = nuevo.recordset[0].ultimo_numero;
    }
  
    const ventaInsertada = await new sql.Request(t)
      .input("sucursal", sql.Int, id_sucursal)
      .input("tipo", sql.VarChar(3), tipo_documento)
      .input("correlativo", sql.Int, correlativo)
      .input("subtotal", sql.Decimal(12,2), montos.subtotal)
      .input("iva", sql.Decimal(12,2), montos.iva)
      .input("total", sql.Decimal(12,2), montos.total)
      .query(`insert into ventas (id_sucursal, tipo_documento, correlativo, subtotal, iva, total)
              output inserted.id_venta
              values (@sucursal, @tipo, @correlativo, @subtotal, @iva, @total)`);
  

   const id_venta = ventaInsertada.recordset[0].id_venta;
    for (const item of montos.detalle) {
      await new sql.Request(t)
        .input("venta", sql.Int, id_venta)
        .input("producto", sql.Int, item.id_producto)
        .input("cantidad", sql.Int, item.cantidad)
        .input("precio", sql.Decimal(12,2), item.precio_unitario)
        .input("importe", sql.Decimal(12,2), item.total_producto)
        .query(`insert into detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, importe)
                values (@venta, @producto, @cantidad, @precio, @importe)`);
    }
    await descontarInventarioPorVenta(t, id_sucursal, productos, id_venta);
    await t.commit(); iniciada = false;
    return { id_venta, id_sucursal, tipo_documento, correlativo, ...montos, estado: "completada" };
  } catch (error) {
    if (iniciada) { try { await t.rollback(); } catch { /* SQL Server puede haber revertido automáticamente. */ } }
    throw error;
  }
}

async function consultarVentas(idSucursal = null) {
  const pool = await obtenerPool();
  const request = pool.request();
  if (idSucursal !== null) request.input("sucursal", sql.Int, idSucursal);
  const resultado = await request.query(`
    select id_venta, id_sucursal, tipo_documento, correlativo, subtotal, iva, total, estado, fecha
    from ventas ${idSucursal === null ? "" : "where id_sucursal = @sucursal"}
    order by fecha desc, id_venta desc`);
  return resultado.recordset;
}

async function consultarVentaPorId(id) {
  const pool = await obtenerPool();
  const venta = await pool.request().input("id", sql.Int, id)
    .query("select * from ventas where id_venta = @id");
  if (!venta.recordset.length) fallo(404, "Venta no encontrada");
  const detalle = await pool.request().input("id", sql.Int, id)
    .query("select id_producto, cantidad, precio_unitario, importe from detalle_ventas where id_venta = @id");
  return { ...venta.recordset[0], detalle: detalle.recordset };
}

async function anularVentaRegistrada(id, reintegrarInventario) {
  const pool = await obtenerPool();
  const t = new sql.Transaction(pool);
  let iniciada = false;
  
  try {
    await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); iniciada = true;
    
    const consulta = await new sql.Request(t).input("venta", sql.Int, id)
      .query("select id_venta, id_sucursal, estado from ventas with (updlock, holdlock) where id_venta = @venta");
    
    const venta = consulta.recordset[0];
    if (!venta) fallo(404, "Venta no encontrada");
    if (venta.estado === "anulada") fallo(409, "La venta ya está anulada");
    if (reintegrarInventario) {
      // Restituye exactamente lo que se descontó al registrar esta venta.
      
      const movimientos = await new sql.Request(t).input("venta", sql.Int, id)
        .input("sucursal", sql.Int, venta.id_sucursal)
        .query(`select id_insumo, sum(cantidad) as cantidad
                from movimientos_inventario with (updlock, holdlock)
                where referencia_id = @venta and id_sucursal = @sucursal and tipo_movimiento = 'SALIDA_VENTA'
                group by id_insumo`);
      if (!movimientos.recordset.length) fallo(409, "La venta no tiene movimientos de inventario para reintegrar");
      
      for (const mov of movimientos.recordset) {
        
        const actualizado = await new sql.Request(t)
          .input("sucursal", sql.Int, venta.id_sucursal)
          .input("insumo", sql.Int, mov.id_insumo)
          .input("cantidad", sql.Decimal(10,2), mov.cantidad)
          .query(`update inventario_sucursal set stock_actual = stock_actual + @cantidad
                  where id_sucursal = @sucursal and id_insumo = @insumo`);
        if (!actualizado.rowsAffected[0]) fallo(409, "No se encontró inventario para reintegrar");
        await new sql.Request(t)
          .input("sucursal", sql.Int, venta.id_sucursal)
          .input("insumo", sql.Int, mov.id_insumo)
          .input("cantidad", sql.Decimal(10,2), mov.cantidad)
          .input("venta", sql.Int, id)
          .query(`insert into movimientos_inventario
                  (id_sucursal, id_insumo, tipo_movimiento, cantidad, referencia_id)
                  values (@sucursal, @insumo, 'AJUSTE', @cantidad, @venta)`);
      }
    }
    
    await new sql.Request(t).input("venta", sql.Int, id)
      .input("reintegrado", sql.Bit, reintegrarInventario)
      .query(`update ventas set estado = 'anulada', inventario_reintegrado = @reintegrado
              where id_venta = @venta`);
    
    await t.commit(); iniciada = false;
    return { id_venta: id, estado: "anulada", inventario_reintegrado: reintegrarInventario };
  } catch (error) {
    if (iniciada) { try { await t.rollback(); } catch { /* La transacción pudo revertirse previamente. */ } }
    throw error;
  }
}

module.exports = {
  obtenerDetalleVenta,
  registrarVenta,
  consultarVentas,
  consultarVentaPorId,
  anularVentaRegistrada
};
