const { getConnection, sql } = require("../config/coneccionSQLserver");
const { descontarInventarioPorVenta } = require("./inventario.service");

const METODOS_PAGO = [
  "EFECTIVO",
  "TARJETA",
  "BITCOIN",
  "CHIVO_WALLET"
];

function fallo(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  throw error;
}

function centavos(valor) {
  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero < 0 ||
    numero > 10000000
  ) {
    fallo(400, "Precio inválido");
  }

  return Math.round((numero + Number.EPSILON) * 100);
}

function moneda(cent) {
  return (cent / 100).toFixed(2);
}

// Precios almacenados SIN IVA.
async function obtenerDetalleVenta(transaction, productos) {
  const detalle = [];
  let subtotalCentavos = 0;

  for (const producto of productos) {
    if (
      !Number.isInteger(producto.id_producto) ||
      producto.id_producto <= 0 ||
      !Number.isInteger(producto.cantidad) ||
      producto.cantidad <= 0 ||
      producto.cantidad > 10000
    ) {
      fallo(400, "Producto o cantidad inválida");
    }

    const resultado = await new sql.Request(transaction)
      .input("id_producto", sql.Int, producto.id_producto)
      .query(`
        SELECT id_producto, nombre, precio_venta, activo
        FROM dbo.productos
        WHERE id_producto = @id_producto;
      `);

    const db = resultado.recordset[0];

    if (!db || !db.activo) {
      fallo(400, `Producto ${producto.id_producto} inexistente o inactivo`);
    }

    const precioCentavos = centavos(db.precio_venta);
    const importeCentavos = precioCentavos * producto.cantidad;

    if (!Number.isSafeInteger(importeCentavos)) {
      fallo(400, "Importe fuera de rango");
    }

    subtotalCentavos += importeCentavos;

    if (
      !Number.isSafeInteger(subtotalCentavos) ||
      subtotalCentavos > 9999999999
    ) {
      fallo(400, "Venta demasiado grande");
    }

    detalle.push({
      id_producto: db.id_producto,
      nombre: db.nombre,
      cantidad: producto.cantidad,
      precio_unitario: moneda(precioCentavos),
      total_producto: moneda(importeCentavos)
    });
  }

  const ivaCentavos = Math.round(subtotalCentavos * 0.13);
  const totalCentavos = subtotalCentavos + ivaCentavos;

  return {
    detalle,
    subtotal: moneda(subtotalCentavos),
    iva: moneda(ivaCentavos),
    total: moneda(totalCentavos)
  };
}

async function obtenerPool() {
  const pool = await getConnection();

  if (!pool) {
    fallo(500, "No se pudo conectar a SQL Server");
  }

  return pool;
}

/**
 * Busca una caja abierta del empleado autenticado
 * dentro de su sucursal.
 */
async function obtenerCajaAbierta(transaction, usuario) {
  const resultado = await new sql.Request(transaction)
    .input("empleado", sql.Int, usuario.id_empleado)
    .input("sucursal", sql.Int, usuario.id_sucursal)
    .query(`
      SELECT TOP 1
        id_caja,
        id_empleado,
        id_sucursal,
        estado
      FROM dbo.cajas WITH (UPDLOCK, HOLDLOCK)
      WHERE id_empleado = @empleado
        AND id_sucursal = @sucursal
        AND estado = 'ABIERTA';
    `);

  if (!resultado.recordset.length) {
    fallo(409, "El empleado no tiene una caja abierta");
  }

  return resultado.recordset[0];
}

/**
 * Registra el ingreso de una venta en caja.
 * No modifica monto_esperado: el flujo de arqueo
 * debe calcularse desde los movimientos registrados.
 */
async function registrarIngresoCaja(
  transaction,
  caja,
  venta,
  metodoPago
) {
  if (!METODOS_PAGO.includes(metodoPago)) {
    fallo(400, "Método de pago inválido");
  }

  await new sql.Request(transaction)
    .input("caja", sql.Int, caja.id_caja)
    .input("tipo", sql.VarChar(10), "INGRESO")
    .input("metodo", sql.VarChar(20), metodoPago)
    .input("monto", sql.Decimal(12, 2), venta.total)
    .input(
      "descripcion",
      sql.VarChar(250),
      `Ingreso por venta ${venta.correlativo}`
    )
    .input("referencia_tipo", sql.VarChar(30), "VENTA")
    .input("referencia_id", sql.Int, venta.id_venta)
    .query(`
      INSERT INTO dbo.movimientos_caja (
        id_caja,
        tipo_movimiento,
        metodo_pago,
        monto,
        descripcion,
        referencia_tipo,
        referencia_id
      )
      VALUES (
        @caja,
        @tipo,
        @metodo,
        @monto,
        @descripcion,
        @referencia_tipo,
        @referencia_id
      );
    `);
}

/**
 * Registrar venta.
 *
 * Todo se ejecuta en una sola transacción:
 * - Venta
 * - Detalle
 * - Correlativo
 * - Inventario
 * - Caja
 */
async function registrarVenta({
  usuario,
  tipo_documento,
  productos,
  metodo_pago,
  idempotencia
}) {
  if (!usuario || !usuario.id_usuario || !usuario.id_empleado) {
    fallo(401, "Usuario no autenticado");
  }

  if (!Number.isInteger(usuario.id_sucursal) || usuario.id_sucursal <= 0) {
    fallo(401, "Sucursal del usuario inválida");
  }

  if (!["FCF", "CCF"].includes(tipo_documento)) {
    fallo(400, "Tipo de documento inválido");
  }

  if (!METODOS_PAGO.includes(metodo_pago)) {
    fallo(400, "Método de pago inválido");
  }

  if (
    !Array.isArray(productos) ||
    productos.length === 0 ||
    productos.length > 100
  ) {
    fallo(400, "Lista de productos inválida");
  }

  if (
    typeof idempotencia !== "string" ||
    idempotencia.length < 16 ||
    idempotencia.length > 100
  ) {
    fallo(400, "Clave de idempotencia inválida");
  }

  const pool = await obtenerPool();
  const t = new sql.Transaction(pool);
  let iniciada = false;

  try {
    await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    iniciada = true;

    // 1. Verificar sucursal activa.
    const sucursal = await new sql.Request(t)
      .input("id", sql.Int, usuario.id_sucursal)
      .query(`
        SELECT id_sucursal
        FROM dbo.sucursales WITH (UPDLOCK, HOLDLOCK)
        WHERE id_sucursal = @id
          AND estado_sucursal = 1;
      `);

    if (!sucursal.recordset.length) {
      fallo(403, "Sucursal no existe o está inactiva");
    }

    // 2. Comprobar si la solicitud ya fue procesada.
    const previa = await new sql.Request(t)
      .input("usuario", sql.Int, usuario.id_usuario)
      .input("clave", sql.VarChar(100), idempotencia)
      .query(`
        SELECT id_venta, id_sucursal, tipo_documento,
               correlativo, subtotal, iva, total, estado
        FROM dbo.ventas WITH (UPDLOCK, HOLDLOCK)
        WHERE id_usuario_registro = @usuario
          AND idempotencia = @clave;
      `);

    if (previa.recordset.length) {
      await t.rollback();
      iniciada = false;

      return {
        ...previa.recordset[0],
        repetida: true
      };
    }

    // 3. Verificar caja abierta.
    const caja = await obtenerCajaAbierta(t, usuario);

    // 4. Calcular detalle, subtotal, IVA y total.
    const montos = await obtenerDetalleVenta(t, productos);

    // 5. Generar correlativo.
    const correlativoRes = await new sql.Request(t)
      .input("sucursal", sql.Int, usuario.id_sucursal)
      .input("tipo", sql.VarChar(3), tipo_documento)
      .query(`
        SELECT ultimo_numero
        FROM dbo.correlativos_documento WITH (UPDLOCK, HOLDLOCK)
        WHERE id_sucursal = @sucursal
          AND tipo_documento = @tipo;
      `);

    let correlativo;

    if (correlativoRes.recordset.length) {
      correlativo =
        correlativoRes.recordset[0].ultimo_numero + 1;

      await new sql.Request(t)
        .input("sucursal", sql.Int, usuario.id_sucursal)
        .input("tipo", sql.VarChar(3), tipo_documento)
        .input("numero", sql.Int, correlativo)
        .query(`
          UPDATE dbo.correlativos_documento
          SET ultimo_numero = @numero
          WHERE id_sucursal = @sucursal
            AND tipo_documento = @tipo;
        `);
    } else {
      correlativo = 1;

      await new sql.Request(t)
        .input("sucursal", sql.Int, usuario.id_sucursal)
        .input("tipo", sql.VarChar(3), tipo_documento)
        .input("numero", sql.Int, correlativo)
        .query(`
          INSERT INTO dbo.correlativos_documento (
            id_sucursal,
            tipo_documento,
            ultimo_numero
          )
          VALUES (@sucursal, @tipo, @numero);
        `);
    }

    // 6. Insertar venta.
    const ventaInsertada = await new sql.Request(t)
      .input("sucursal", sql.Int, usuario.id_sucursal)
      .input("tipo", sql.VarChar(3), tipo_documento)
      .input("correlativo", sql.Int, correlativo)
      .input("subtotal", sql.Decimal(12, 2), montos.subtotal)
      .input("iva", sql.Decimal(12, 2), montos.iva)
      .input("total", sql.Decimal(12, 2), montos.total)
      .input("usuario", sql.Int, usuario.id_usuario)
      .input("clave", sql.VarChar(100), idempotencia)
      .query(`
        INSERT INTO dbo.ventas (
          id_sucursal,
          tipo_documento,
          correlativo,
          subtotal,
          iva,
          total,
          id_usuario_registro,
          idempotencia
        )
        OUTPUT INSERTED.id_venta
        VALUES (
          @sucursal,
          @tipo,
          @correlativo,
          @subtotal,
          @iva,
          @total,
          @usuario,
          @clave
        );
      `);

    const id_venta = ventaInsertada.recordset[0].id_venta;

    // 7. Insertar detalle.
    for (const item of montos.detalle) {
      await new sql.Request(t)
        .input("venta", sql.Int, id_venta)
        .input("producto", sql.Int, item.id_producto)
        .input("cantidad", sql.Int, item.cantidad)
        .input("precio", sql.Decimal(12, 2), item.precio_unitario)
        .input("importe", sql.Decimal(12, 2), item.total_producto)
        .query(`
          INSERT INTO dbo.detalle_ventas (
            id_venta,
            id_producto,
            cantidad,
            precio_unitario,
            importe
          )
          VALUES (
            @venta,
            @producto,
            @cantidad,
            @precio,
            @importe
          );
        `);
    }

    // 8. Descontar inventario.
    await descontarInventarioPorVenta(
      t,
      usuario.id_sucursal,
      productos,
      id_venta
    );

    // 9. Registrar ingreso en caja.
    await registrarIngresoCaja(
      t,
      caja,
      {
        id_venta,
        correlativo,
        total: montos.total
      },
      metodo_pago
    );

    // 10. Confirmar.
    await t.commit();
    iniciada = false;

    return {
      id_venta,
      id_sucursal: usuario.id_sucursal,
      id_caja: caja.id_caja,
      tipo_documento,
      correlativo,
      ...montos,
      metodo_pago,
      estado: "completada"
    };

  } catch (error) {
    if (iniciada) {
      try {
        await t.rollback();
      } catch {
        // SQL Server puede haber revertido automáticamente.
      }
    }

    throw error;
  }
}

/**
 * Consultar ventas de una sucursal.
 */
async function consultarVentas(scope) {
  if (!scope || !Number.isInteger(scope.id_sucursal)) {
    fallo(401, "Sucursal no válida");
  }

  const pool = await obtenerPool();

  const resultado = await pool.request()
    .input("sucursal", sql.Int, scope.id_sucursal)
    .query(`
      SELECT
        id_venta,
        id_sucursal,
        tipo_documento,
        correlativo,
        subtotal,
        iva,
        total,
        estado,
        fecha,
        inventario_reintegrado
      FROM dbo.ventas
      WHERE id_sucursal = @sucursal
      ORDER BY fecha DESC, id_venta DESC;
    `);

  return resultado.recordset;
}

/**
 * Consultar una venta por ID dentro de la sucursal.
 */
async function consultarVentaPorId(id, scope) {
  if (!scope || !Number.isInteger(scope.id_sucursal)) {
    fallo(401, "Sucursal no válida");
  }

  const pool = await obtenerPool();

  const venta = await pool.request()
    .input("id", sql.Int, id)
    .input("sucursal", sql.Int, scope.id_sucursal)
    .query(`
      SELECT *
      FROM dbo.ventas
      WHERE id_venta = @id
        AND id_sucursal = @sucursal;
    `);

  if (!venta.recordset.length) {
    fallo(404, "Venta no encontrada");
  }

  const detalle = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT
        id_producto,
        cantidad,
        precio_unitario,
        importe
      FROM dbo.detalle_ventas
      WHERE id_venta = @id;
    `);

  return {
    ...venta.recordset[0],
    detalle: detalle.recordset
  };
}

/**
 * Anular venta.
 *
 * Reversa caja e inventario opcionalmente.
 * Requiere scope autenticado.
 */
async function anularVentaRegistrada(
  id,
  reintegrarInventario,
  scope
) {
  if (!scope || !Number.isInteger(scope.id_sucursal)) {
    fallo(401, "Sucursal no válida");
  }

  if (typeof reintegrarInventario !== "boolean") {
    fallo(400, "Debe especificarse si se reintegra el inventario");
  }

  const pool = await obtenerPool();
  const t = new sql.Transaction(pool);
  let iniciada = false;

  try {
    await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    iniciada = true;

    // 1. Obtener venta dentro de la sucursal.
    const consulta = await new sql.Request(t)
      .input("venta", sql.Int, id)
      .input("sucursal", sql.Int, scope.id_sucursal)
      .query(`
        SELECT id_venta, id_sucursal, estado,
               correlativo, inventario_reintegrado
        FROM dbo.ventas WITH (UPDLOCK, HOLDLOCK)
        WHERE id_venta = @venta
          AND id_sucursal = @sucursal;
      `);

    const venta = consulta.recordset[0];

    if (!venta) {
      fallo(404, "Venta no encontrada");
    }

    if (venta.estado === "anulada") {
      fallo(409, "La venta ya está anulada");
    }

    // 2. Obtener ingreso original y propietario de caja.
    const ingreso = await new sql.Request(t)
      .input("venta", sql.Int, id)
      .query(`
        SELECT TOP 1
          mc.id_movimiento,
          mc.id_caja,
          mc.metodo_pago,
          mc.monto,
          c.id_empleado,
          c.id_sucursal
        FROM dbo.movimientos_caja mc WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.cajas c
          ON c.id_caja = mc.id_caja
        WHERE mc.referencia_tipo = 'VENTA'
          AND mc.referencia_id = @venta
          AND mc.tipo_movimiento = 'INGRESO';
      `);

    if (!ingreso.recordset.length) {
      fallo(409, "No se encontró el ingreso original de caja");
    }

    const movimientoOriginal = ingreso.recordset[0];

    // 3. Validar autorización sobre la caja.
    if (movimientoOriginal.id_sucursal !== scope.id_sucursal) {
      fallo(403, "No puede operar sobre otra sucursal");
    }

    if (
      scope.rol === "cajero" &&
      movimientoOriginal.id_empleado !== scope.id_empleado
    ) {
      fallo(403, "No puede anular ventas de otra caja");
    }

    if (!["cajero", "gerente"].includes(scope.rol)) {
      fallo(403, "Rol no autorizado para anular ventas");
    }

    // 4. Revertir el ingreso con EGRESO.
    await new sql.Request(t)
      .input("caja", sql.Int, movimientoOriginal.id_caja)
      .input("tipo", sql.VarChar(10), "EGRESO")
      .input("metodo", sql.VarChar(20), movimientoOriginal.metodo_pago)
      .input("monto", sql.Decimal(12, 2), movimientoOriginal.monto)
      .input(
        "descripcion",
        sql.VarChar(250),
        `Reversión de venta ${venta.correlativo}`
      )
      .input("referencia_tipo", sql.VarChar(30), "VENTA")
      .input("referencia_id", sql.Int, id)
      .query(`
        INSERT INTO dbo.movimientos_caja (
          id_caja,
          tipo_movimiento,
          metodo_pago,
          monto,
          descripcion,
          referencia_tipo,
          referencia_id
        )
        VALUES (
          @caja,
          @tipo,
          @metodo,
          @monto,
          @descripcion,
          @referencia_tipo,
          @referencia_id
        );
      `);

    // 5. Reintegrar inventario opcionalmente.
    if (reintegrarInventario) {
      if (venta.inventario_reintegrado) {
        fallo(409, "El inventario ya fue reintegrado");
      }

      const movimientos = await new sql.Request(t)
        .input("venta", sql.Int, id)
        .input("sucursal", sql.Int, venta.id_sucursal)
        .query(`
          SELECT id_insumo, SUM(cantidad) AS cantidad
          FROM dbo.movimientos_inventario WITH (UPDLOCK, HOLDLOCK)
          WHERE referencia_id = @venta
            AND id_sucursal = @sucursal
            AND tipo_movimiento = 'SALIDA_VENTA'
          GROUP BY id_insumo;
        `);

      if (!movimientos.recordset.length) {
        fallo(
          409,
          "La venta no tiene movimientos de inventario para reintegrar"
        );
      }

      for (const mov of movimientos.recordset) {
        const actualizado = await new sql.Request(t)
          .input("sucursal", sql.Int, venta.id_sucursal)
          .input("insumo", sql.Int, mov.id_insumo)
          .input("cantidad", sql.Decimal(10, 2), mov.cantidad)
          .query(`
            UPDATE dbo.inventario_sucursal
            SET stock_actual = stock_actual + @cantidad
            WHERE id_sucursal = @sucursal
              AND id_insumo = @insumo;
          `);

        if (!actualizado.rowsAffected[0]) {
          fallo(409, "No se encontró inventario para reintegrar");
        }

        await new sql.Request(t)
          .input("sucursal", sql.Int, venta.id_sucursal)
          .input("insumo", sql.Int, mov.id_insumo)
          .input("cantidad", sql.Decimal(10, 2), mov.cantidad)
          .input("venta", sql.Int, id)
          .query(`
            INSERT INTO dbo.movimientos_inventario (
              id_sucursal,
              id_insumo,
              tipo_movimiento,
              cantidad,
              referencia_id
            )
            VALUES (
              @sucursal,
              @insumo,
              'AJUSTE',
              @cantidad,
              @venta
            );
          `);
      }
    }

    // 6. Marcar venta anulada.
    await new sql.Request(t)
      .input("venta", sql.Int, id)
      .input("reintegrado", sql.Bit, reintegrarInventario)
      .query(`
        UPDATE dbo.ventas
        SET estado = 'anulada',
            inventario_reintegrado = @reintegrado
        WHERE id_venta = @venta;
      `);

    await t.commit();
    iniciada = false;

    return {
      id_venta: id,
      estado: "anulada",
      inventario_reintegrado: reintegrarInventario
    };

  } catch (error) {
    if (iniciada) {
      try {
        await t.rollback();
      } catch {
        // La transacción pudo revertirse previamente.
      }
    }

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