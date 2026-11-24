
const { sql, poolPromise } = require("../config/coneccionSQLserver");
const {incrementarInventarioPorCompra} = require("../services/compras-inventario.service");

// Registrar factura de compra
const registrarCompra = async (req, res, next) => {
    const transaction = new sql.Transaction(await poolPromise);

    try {
        const {
            id_proveedor,
            numero_factura,
            fecha_compra,
            fecha_vencimiento,
            condicion_pago,
            subtotal,
            iva,
            detalles,
            observaciones
        } = req.body;

        const idUsuario = Number(req.user.id_usuario);
        const idSucursal = Number(req.user.id_sucursal);
        const idProveedor = Number(id_proveedor);

        // Validaciones generales
        if (
            !Number.isInteger(idUsuario) || idUsuario <= 0 ||
            !Number.isInteger(idSucursal) || idSucursal <= 0 ||
            !Number.isInteger(idProveedor) || idProveedor <= 0
        ) {
            return res.status(400).json({
                mensaje: "Los datos del usuario, sucursal o proveedor no son válidos."
            });
        }

        if (!numero_factura || !fecha_compra) {
            return res.status(400).json({
                mensaje: "El número de factura y la fecha son obligatorios."
            });
        }

        if (!["CONTADO", "CREDITO"].includes(condicion_pago)) {
            return res.status(400).json({
                mensaje: "La condición de pago debe ser CONTADO o CREDITO."
            });
        }

        if (
            condicion_pago === "CREDITO" &&
            !fecha_vencimiento
        ) {
            return res.status(400).json({
                mensaje: "Las compras a crédito requieren fecha de vencimiento."
            });
        }

        if (!Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({
                mensaje: "La factura debe contener al menos un insumo."
            });
        }

        const valorSubtotal = Number(subtotal);
        const valorIva = Number(iva);

        if (
            !Number.isFinite(valorSubtotal) || valorSubtotal <= 0 ||
            !Number.isFinite(valorIva) || valorIva < 0
        ) {
            return res.status(400).json({
                mensaje: "Los importes de la factura no son válidos."
            });
        }

        let sumaDetalles = 0;

        for (const item of detalles) {
            const cantidad = Number(item.cantidad);
            const precio = Number(item.precio_unitario);
            const idInsumo = Number(item.id_insumo);

            if (
                !Number.isInteger(idInsumo) || idInsumo <= 0 ||
                !Number.isFinite(cantidad) || cantidad <= 0 ||
                !Number.isFinite(precio) || precio <= 0 ||
                !["COSTO", "GASTO"].includes(item.clasificacion)
            ) {
                return res.status(400).json({
                    mensaje: "Hay detalles de compra con datos inválidos."
                });
            }

            sumaDetalles += cantidad * precio;
        }

        const redondear = valor => Math.round((valor + Number.EPSILON) * 100) / 100;

        if (redondear(sumaDetalles) !== redondear(valorSubtotal)) {
            return res.status(400).json({
                mensaje: "El subtotal no coincide con la suma de los detalles."
            });
        }

        const total = redondear(valorSubtotal + valorIva);
        const clasificaciones = [...new Set(detalles.map(item => item.clasificacion))];

const tipoCompra = clasificaciones.length === 1
    ? clasificaciones[0]
    : "MIXTA";

        await transaction.begin();

        // Verificar proveedor activo
        const proveedor = await new sql.Request(transaction)
            .input("id_proveedor", sql.Int, idProveedor)
            .query(`
                SELECT id_proveedor
                FROM dbo.proveedores
                WHERE id_proveedor = @id_proveedor
                  AND activo = 1
            `);

        if (proveedor.recordset.length === 0) {
            throw new Error("El proveedor no existe o está inactivo.");
        }

        // Registrar encabezado de factura
        const compraResult = await new sql.Request(transaction)
            .input("id_proveedor", sql.Int, idProveedor)
            .input("id_sucursal", sql.Int, idSucursal)
            .input("id_usuario", sql.Int, idUsuario)
            .input("numero_factura", sql.VarChar(50), numero_factura.trim())
            .input("fecha_compra", sql.Date, fecha_compra)
            .input("fecha_vencimiento", sql.Date, fecha_vencimiento || null)
            .input("tipo_compra", sql.VarChar(10), tipoCompra)
            .input("condicion_pago", sql.VarChar(10), condicion_pago)
            .input("subtotal", sql.Decimal(12, 2), redondear(valorSubtotal))
            .input("iva", sql.Decimal(12, 2), redondear(valorIva))
            .input("total", sql.Decimal(12, 2), total)
            .input("observaciones", sql.VarChar(250), observaciones || null)
            .query(`
                INSERT INTO dbo.compras (
                    id_proveedor, id_sucursal, id_usuario,
                    numero_factura, fecha_compra, fecha_vencimiento,
                    tipo_compra, condicion_pago,
                    subtotal, iva, total, observaciones
                )
                OUTPUT INSERTED.id_compra
                VALUES (
                    @id_proveedor, @id_sucursal, @id_usuario,
                    @numero_factura, @fecha_compra, @fecha_vencimiento,
                    @tipo_compra, @condicion_pago,
                    @subtotal, @iva, @total, @observaciones
                )
            `);

        const idCompra = compraResult.recordset[0].id_compra;

        // Registrar detalles de factura
        for (const item of detalles) {
            const cantidad = Number(item.cantidad);
            const precio = Number(item.precio_unitario);
            const parcial = redondear(cantidad * precio);

            await new sql.Request(transaction)
                .input("id_compra", sql.Int, idCompra)
                .input("id_insumo", sql.Int, Number(item.id_insumo))
                .input("cantidad", sql.Decimal(12, 2), cantidad)
                .input("precio_unitario", sql.Decimal(12, 2), precio)
                .input("subtotal", sql.Decimal(12, 2), parcial)
                .input("clasificacion", sql.VarChar(10), item.clasificacion)
                .query(`
                    INSERT INTO dbo.detalle_compras (
                        id_compra, id_insumo, cantidad,
                        precio_unitario, subtotal, clasificacion
                    )
                    VALUES (
                        @id_compra, @id_insumo, @cantidad,
                        @precio_unitario, @subtotal, @clasificacion
                    )
                `);
        }

        // Incrementar inventario y registrar movimientos Kardex
        const itemsInventario = detalles.map(item => ({
            id_insumo: Number(item.id_insumo),
            cantidad: Number(item.cantidad)
        }));

        await incrementarInventarioPorCompra(
            transaction,
            idSucursal,
            itemsInventario,
            idCompra
        );

        // Crear cuenta por pagar si la compra es a crédito
        if (condicion_pago === "CREDITO") {
            await new sql.Request(transaction)
                .input("id_compra", sql.Int, idCompra)
                .input("monto_original", sql.Decimal(12, 2), total)
                .input("saldo_pendiente", sql.Decimal(12, 2), total)
                .input("fecha_vencimiento", sql.Date, fecha_vencimiento)
                .query(`
                    INSERT INTO dbo.cuentas_por_pagar (
                        id_compra, monto_original,
                        saldo_pendiente, fecha_vencimiento
                    )
                    VALUES (
                        @id_compra, @monto_original,
                        @saldo_pendiente, @fecha_vencimiento
                    )
                `);
        }

        await transaction.commit();

        return res.status(201).json({
            mensaje: "Compra registrada correctamente.",
            id_compra: idCompra,
            total,
            condicion_pago,
            cuenta_por_pagar_creada: condicion_pago === "CREDITO"
        });

    } catch (error) {
        if (transaction._aborted !== true) {
            try {
                await transaction.rollback();
            } catch (_) {}
        }

        next(error);
    }
};

// Obtener todas las compras
const obtenerCompras = async (req, res, next) => {
    try {
        const pool = await poolPromise;

        const resultado = await pool.request().query(`
            SELECT
                c.id_compra,
                c.numero_factura,
                c.fecha_compra,
                c.fecha_vencimiento,
                c.tipo_compra,
                c.condicion_pago,
                c.subtotal,
                c.iva,
                c.total,
                c.estado,
                p.nombre AS proveedor,
                s.nombre AS sucursal
            FROM dbo.compras c
            INNER JOIN dbo.proveedores p
                ON c.id_proveedor = p.id_proveedor
            INNER JOIN dbo.sucursales s
                ON c.id_sucursal = s.id_sucursal
            ORDER BY c.id_compra DESC;
        `);

        return res.status(200).json(resultado.recordset);

    } catch (error) {
        next(error);
    }
};



// Registrar abono a una cuenta por pagar
const registrarAbono = async (req, res, next) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    let iniciada = false;

    try {
        const {
            id_cuenta_por_pagar,
            monto_pagado,
            metodo_pago,
            referencia,
            observaciones
        } = req.body;

        const idCuenta = Number(id_cuenta_por_pagar);
        const monto = Number(monto_pagado);

        const metodosPermitidos = [
            "EFECTIVO",
            "TRANSFERENCIA",
            "TARJETA",
            "CHEQUE"
        ];

        if (!Number.isInteger(idCuenta) || idCuenta <= 0) {
            return res.status(400).json({
                mensaje: "El ID de la cuenta por pagar no es válido."
            });
        }

        if (!Number.isFinite(monto) || monto <= 0) {
            return res.status(400).json({
                mensaje: "El monto del abono debe ser mayor que cero."
            });
        }

        if (!metodosPermitidos.includes(metodo_pago)) {
            return res.status(400).json({
                mensaje: "El método de pago no es válido."
            });
        }

        await transaction.begin();
        iniciada = true;

        // Bloquear la cuenta para evitar abonos simultáneos
        const cuentaResult = await new sql.Request(transaction)
            .input("id_cuenta", sql.Int, idCuenta)
            .query(`
                SELECT id_cuenta_por_pagar,
                       monto_original,
                       saldo_pendiente,
                       estado
                FROM dbo.cuentas_por_pagar WITH (UPDLOCK, HOLDLOCK)
                WHERE id_cuenta_por_pagar = @id_cuenta
            `);

        if (cuentaResult.recordset.length === 0) {
            throw new Error("La cuenta por pagar no existe.");
        }

        const cuenta = cuentaResult.recordset[0];
        const saldoActual = Number(cuenta.saldo_pendiente);

        if (saldoActual <= 0 || cuenta.estado === "PAGADA") {
            throw new Error("Esta cuenta ya se encuentra pagada.");
        }

        const nuevoSaldo = Math.round((saldoActual - monto) * 100) / 100;

        if (nuevoSaldo < 0) {
            throw new Error(
                `El abono supera el saldo pendiente de $${saldoActual.toFixed(2)}.`
            );
        }

        const nuevoEstado = nuevoSaldo === 0
            ? "PAGADA"
            : "PARCIAL";

        // Registrar el abono
        await new sql.Request(transaction)
            .input("id_cuenta", sql.Int, idCuenta)
            .input("monto", sql.Decimal(12, 2), monto)
            .input("metodo", sql.VarChar(20), metodo_pago)
            .input("referencia", sql.VarChar(100), referencia || null)
            .input("observaciones", sql.VarChar(250), observaciones || null)
            .query(`
                INSERT INTO dbo.pagos_proveedores (
                    id_cuenta_por_pagar,
                    monto_pagado,
                    metodo_pago,
                    referencia,
                    observaciones
                )
                VALUES (
                    @id_cuenta,
                    @monto,
                    @metodo,
                    @referencia,
                    @observaciones
                )
            `);

        // Actualizar saldo y estado
        await new sql.Request(transaction)
            .input("id_cuenta", sql.Int, idCuenta)
            .input("saldo", sql.Decimal(12, 2), nuevoSaldo)
            .input("estado", sql.VarChar(15), nuevoEstado)
            .query(`
                UPDATE dbo.cuentas_por_pagar
                SET saldo_pendiente = @saldo,
                    estado = @estado
                WHERE id_cuenta_por_pagar = @id_cuenta
            `);

        await transaction.commit();
        iniciada = false;

        return res.status(201).json({
            mensaje: "Abono registrado correctamente.",
            id_cuenta_por_pagar: idCuenta,
            monto_abonado: monto,
            saldo_anterior: saldoActual,
            saldo_pendiente: nuevoSaldo,
            estado: nuevoEstado
        });

    } catch (error) {
        if (iniciada) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("Error al revertir el abono:", rollbackError);
            }
        }

        if (error.message === "La cuenta por pagar no existe.") {
            return res.status(404).json({ mensaje: error.message });
        }

        if (
            error.message === "Esta cuenta ya se encuentra pagada." ||
            error.message.startsWith("El abono supera")
        ) {
            return res.status(400).json({ mensaje: error.message });
        }

        next(error);
    }
};

const obtenerCuentasPorPagar = async (req, res, next) => {
    try {
        const pool = await poolPromise;

        const resultado = await pool.request().query(`
            SELECT
                cp.id_cuenta_por_pagar,
                cp.id_compra,
                c.numero_factura,
                c.fecha_compra,
                cp.monto_original,
                cp.saldo_pendiente,
                cp.fecha_vencimiento,
                cp.estado,
                cp.fecha_creacion
            FROM dbo.cuentas_por_pagar AS cp
            INNER JOIN dbo.compras AS c
                ON cp.id_compra = c.id_compra
            ORDER BY
                CASE
                    WHEN cp.estado = 'PENDIENTE' THEN 1
                    WHEN cp.estado = 'PARCIAL' THEN 2
                    ELSE 3
                END,
                cp.fecha_vencimiento ASC;
        `);

        return res.status(200).json(resultado.recordset);

    } catch (error) {
        next(error);
    }
};


module.exports = { registrarCompra, obtenerCompras, registrarAbono, obtenerCuentasPorPagar};

