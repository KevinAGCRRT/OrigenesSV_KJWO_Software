import { mssql } from "../config/coneccionSQLserver.js";

export async function descontarInventarioPorVenta(transaction, idSucursal, itemsVendidos, referenciaId = null) {
  if (!itemsVendidos || itemsVendidos.length === 0) {
    throw new Error("No se proporcionaron productos para procesar el descuento de inventario.");
  }
  const insumosRequeridos = new Map();

  for (const item of itemsVendidos) {
    const idProducto = Number(item.id_producto);
    const cantidadVendida = Number(item.cantidad);

    if (isNaN(idProducto) || isNaN(cantidadVendida) || cantidadVendida <= 0) {
      throw new Error(`Datos de producto inválidos en la venta: ID ${item.id_producto}`);
    }
    const reqProducto = new mssql.Request(transaction);
    const resProducto = await reqProducto
      .input("id_producto", mssql.Int, idProducto)
      .query(`
        SELECT id_producto, nombre, es_elaborado, id_insumo_reventa, activo 
        FROM productos 
        WHERE id_producto = @id_producto
      `);

    const producto = resProducto.recordset[0];
    if (!producto) {
      throw new Error(`El producto con ID ${idProducto} no existe en el catálogo.`);
    }

    if (!producto.activo) {
      throw new Error(`El producto "${producto.nombre}" está marcado como inactivo.`);
    }

    if (producto.es_elaborado) {
      const reqReceta = new mssql.Request(transaction);
      const resReceta = await reqReceta
        .input("id_producto", mssql.Int, idProducto)
        .query(`
          SELECT r.id_insumo, r.cantidad_requerida, i.nombre AS nombre_insumo, i.unidad_medida
          FROM recetas r
          INNER JOIN insumos i ON r.id_insumo = i.id_insumo
          WHERE r.id_producto = @id_producto
        `);

      const ingredientes = resReceta.recordset;
      if (!ingredientes || ingredientes.length === 0) {
        throw new Error(`El producto elaborado "${producto.nombre}" no tiene una receta configurada.`);
      }

      for (const ing of ingredientes) {
        const idInsumo = ing.id_insumo;
        const totalNecesario = Number(ing.cantidad_requerida) * cantidadVendida;

        if (insumosRequeridos.has(idInsumo)) {
          insumosRequeridos.get(idInsumo).cantidadTotal += totalNecesario;
        } else {
          insumosRequeridos.set(idInsumo, {
            id_insumo: idInsumo,
            nombre_insumo: ing.nombre_insumo,
            unidad_medida: ing.unidad_medida,
            cantidadTotal: totalNecesario
          });
        }
      }
    } else {
      if (!producto.id_insumo_reventa) {
        throw new Error(`El producto de reventa "${producto.nombre}" no tiene un insumo asociado en la base de datos.`);
      }

      const idInsumo = producto.id_insumo_reventa;
      const totalNecesario = cantidadVendida;

      if (insumosRequeridos.has(idInsumo)) {
        insumosRequeridos.get(idInsumo).cantidadTotal += totalNecesario;
      } else {
        const reqInsumo = new mssql.Request(transaction);
        const resInsumo = await reqInsumo
          .input("id_insumo", mssql.Int, idInsumo)
          .query(`SELECT nombre, unidad_medida FROM insumos WHERE id_insumo = @id_insumo`);

        const insumoInfo = resInsumo.recordset[0];
        insumosRequeridos.set(idInsumo, {
          id_insumo: idInsumo,
          nombre_insumo: insumoInfo ? insumoInfo.nombre : `Insumo ${idInsumo}`,
          unidad_medida: insumoInfo ? insumoInfo.unidad_medida : "unidad",
          cantidadTotal: totalNecesario
        });
      }
    }
  }
  for (const [idInsumo, reqItem] of insumosRequeridos.entries()) {
    const reqStock = new mssql.Request(transaction);
    const resStock = await reqStock
      .input("id_sucursal", mssql.Int, idSucursal)
      .input("id_insumo", mssql.Int, idInsumo)
      .query(`
        SELECT stock_actual 
        FROM inventario_sucursal WITH (UPDLOCK)
        WHERE id_sucursal = @id_sucursal AND id_insumo = @id_insumo
      `);

    const registroInventario = resStock.recordset[0];
    const stockDisponible = registroInventario ? Number(registroInventario.stock_actual) : 0;

    if (!registroInventario || stockDisponible < reqItem.cantidadTotal) {
      throw new Error(
        `Stock insuficiente en sucursal para "${reqItem.nombre_insumo}". ` +
        `Requerido: ${reqItem.cantidadTotal} ${reqItem.unidad_medida}, ` +
        `Disponible: ${stockDisponible} ${reqItem.unidad_medida}. Transacción abortada.`
      );
    }
  }

  for (const [idInsumo, reqItem] of insumosRequeridos.entries()) {
    const reqUpdate = new mssql.Request(transaction);
    await reqUpdate
      .input("id_sucursal", mssql.Int, idSucursal)
      .input("id_insumo", mssql.Int, idInsumo)
      .input("cantidad_descontar", mssql.Decimal(10, 2), reqItem.cantidadTotal)
      .input("referencia_id", mssql.Int, referenciaId)
      .query(`
        -- Descontar inventario de la sucursal
        UPDATE inventario_sucursal 
        SET stock_actual = stock_actual - @cantidad_descontar
        WHERE id_sucursal = @id_sucursal AND id_insumo = @id_insumo;

        -- Registrar salida en el historial (Kardex)
        INSERT INTO movimientos_inventario 
          (id_sucursal, id_insumo, tipo_movimiento, cantidad, fecha, referencia_id)
        VALUES 
          (@id_sucursal, @id_insumo, 'SALIDA_VENTA', @cantidad_descontar, SYSDATETIME(), @referencia_id);
      `);
  }

  return {
    success: true,
    insumosDescontados: Array.from(insumosRequeridos.values())
  };
}