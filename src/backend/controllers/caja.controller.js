const { sql, poolPromise } = require("../config/coneccionSQLserver");

// ======================================================
// CONFIGURACIÓN
// ======================================================

const METODOS_PAGO = [
    "EFECTIVO",
    "TARJETA",
    "BITCOIN",
    "CHIVO_WALLET"
];

const TIPOS_MOVIMIENTO = ["INGRESO", "EGRESO"];

// Máximo de DECIMAL(12,2), expresado en centavos.
const MAX_CENTAVOS = 999999999999;

// ======================================================
// UTILIDADES
// ======================================================

const normalizarTexto = (valor) =>
    typeof valor === "string" ? valor.trim().toUpperCase() : "";

const esGerente = (rol) =>
    normalizarTexto(rol) === "GERENTE";

const convertirACentavos = (valor, permitirCero = true) => {
    if (typeof valor !== "string" && typeof valor !== "number") {
        return null;
    }

    const texto = String(valor).trim();

    if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
        return null;
    }

    const partes = texto.split(".");
    const enteros = partes[0];
    const decimales = (partes[1] || "").padEnd(2, "0");

    const centavos =
        BigInt(enteros) * 100n +
        BigInt(decimales);

    if (centavos > BigInt(MAX_CENTAVOS)) {
        return null;
    }

    if (!permitirCero && centavos === 0n) {
        return null;
    }

    return Number(centavos);
};

const deCentavosADinero = (centavos) => centavos / 100;

const deSqlACentavos = (valor) => {
    if (valor === null || valor === undefined) {
        return 0;
    }

    const texto = String(valor).trim();
    const negativo = texto.startsWith("-");

    const absoluto = negativo
        ? texto.substring(1)
        : texto;

    const centavos = convertirACentavos(absoluto, true);

    if (centavos === null) {
        throw new Error("Valor monetario de SQL inválido.");
    }

    return negativo ? -centavos : centavos;
};

const validarDescripcion = (descripcion) => {
    if (descripcion === undefined || descripcion === null) {
        return null;
    }

    if (typeof descripcion !== "string") {
        return false;
    }

    const texto = descripcion.trim();

    if (texto.length > 250) {
        return false;
    }

    return texto || null;
};

const crearError = (mensaje, status) => {
    const error = new Error(mensaje);
    error.status = status;
    return error;
};

// ======================================================
// 1. ABRIR CAJA (TRANSACCIONAL Y SINCRONIZADA)
// ======================================================

const abrirCaja = async (req, res, next) => {
    let transaction;
    let transactionIniciada = false;

    try {
        const idSucursal = req.user.id_sucursal;
        const idEmpleado = req.user.id_empleado;

        const montoInicialCentavos = convertirACentavos(
            req.body?.monto_inicial,
            true
        );

        if (
            !Number.isInteger(idSucursal) ||
            idSucursal <= 0 ||
            !Number.isInteger(idEmpleado) ||
            idEmpleado <= 0
        ) {
            return res.status(400).json({
                mensaje: "El usuario no tiene una sucursal o empleado válido."
            });
        }

        if (montoInicialCentavos === null) {
            return res.status(400).json({
                mensaje: "El monto inicial debe ser válido, mayor o igual a cero y tener máximo dos decimales."
            });
        }

        const montoInicial = deCentavosADinero(
            montoInicialCentavos
        );

        const pool = await poolPromise;

        transaction = new sql.Transaction(pool);
        await transaction.begin();
        transactionIniciada = true;

        // 1. Bloquear el registro del empleado.
        // La baja lógica utilizará el mismo bloqueo.
        const resultadoEmpleado = await transaction.request()
            .input("id_empleado", sql.Int, idEmpleado)
            .input("id_sucursal", sql.Int, idSucursal)
            .query(`
                SELECT
                    id_empleado,
                    id_sucursal,
                    activo
                FROM dbo.empleados WITH (UPDLOCK, HOLDLOCK)
                WHERE id_empleado = @id_empleado
                  AND id_sucursal = @id_sucursal;
            `);

        if (
            resultadoEmpleado.recordset.length === 0 ||
            resultadoEmpleado.recordset[0].activo !== true
        ) {
            await transaction.rollback();
            transactionIniciada = false;

            return res.status(403).json({
                mensaje: "El empleado no está activo o no pertenece a esta sucursal."
            });
        }

        // 2. Comprobar que no tenga una caja abierta.
        const resultadoCaja = await transaction.request()
            .input("id_empleado", sql.Int, idEmpleado)
            .input("id_sucursal", sql.Int, idSucursal)
            .query(`
                SELECT TOP 1
                    id_caja
                FROM dbo.cajas
                WHERE id_empleado = @id_empleado
                  AND id_sucursal = @id_sucursal
                  AND estado = 'ABIERTA';
            `);

        if (resultadoCaja.recordset.length > 0) {
            await transaction.rollback();
            transactionIniciada = false;

            return res.status(409).json({
                mensaje: "El empleado ya tiene una caja abierta en esta sucursal."
            });
        }

        // 3. Crear caja.
        const resultado = await transaction.request()
            .input("id_sucursal", sql.Int, idSucursal)
            .input("id_empleado", sql.Int, idEmpleado)
            .input("monto_inicial", sql.Decimal(12, 2), montoInicial)
            .query(`
                INSERT INTO dbo.cajas (
                    id_sucursal,
                    id_empleado,
                    monto_inicial,
                    estado
                )
                OUTPUT INSERTED.id_caja
                VALUES (
                    @id_sucursal,
                    @id_empleado,
                    @monto_inicial,
                    'ABIERTA'
                );
            `);

        await transaction.commit();
        transactionIniciada = false;

        return res.status(201).json({
            mensaje: "Caja abierta correctamente.",
            id_caja: resultado.recordset[0].id_caja,
            monto_inicial: montoInicial,
            estado: "ABIERTA"
        });

    } catch (error) {

        if (transactionIniciada && transaction) {
            try {
                await transaction.rollback();
            } catch (errorRollback) {
                // Conservamos el error original.
            }
        }

        if (error.number === 2601 || error.number === 2627) {
            return res.status(409).json({
                mensaje: "El empleado ya tiene una caja abierta en esta sucursal."
            });
        }

        next(error);
    }
};

// ======================================================
// 2. REGISTRAR MOVIMIENTO
// ======================================================

const registrarMovimiento = async (req, res, next) => {
    let transaction;
    let iniciada = false;

    try {
        const pool = await poolPromise;

        const idCaja = Number(req.params.id);

        const {
            tipo_movimiento,
            metodo_pago,
            monto,
            descripcion
        } = req.body || {};

        const tipo = normalizarTexto(tipo_movimiento);
        const metodo = normalizarTexto(metodo_pago);

        const cantidadCentavos = convertirACentavos(monto, false);
        const descripcionValidada = validarDescripcion(descripcion);

        if (!Number.isInteger(idCaja) || idCaja <= 0) {
            return res.status(400).json({
                mensaje: "El ID de caja no es válido."
            });
        }

        if (!TIPOS_MOVIMIENTO.includes(tipo)) {
            return res.status(400).json({
                mensaje: "El tipo debe ser INGRESO o EGRESO."
            });
        }

        if (!METODOS_PAGO.includes(metodo)) {
            return res.status(400).json({
                mensaje: "El método de pago no es válido."
            });
        }

        if (cantidadCentavos === null) {
            return res.status(400).json({
                mensaje: "El monto debe ser mayor que cero y tener máximo dos decimales."
            });
        }

        if (descripcionValidada === false) {
            return res.status(400).json({
                mensaje: "La descripción debe ser un texto de máximo 250 caracteres."
            });
        }

        const cantidad = deCentavosADinero(cantidadCentavos);

        transaction = new sql.Transaction(pool);
        await transaction.begin();
        iniciada = true;

        // El gerente puede operar cajas de su sucursal.
        // El cajero únicamente puede operar su propia caja.

        const resultadoCaja = await new sql.Request(transaction)
            .input("id_caja", sql.Int, idCaja)
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .input("id_empleado", sql.Int, req.user.id_empleado)
            .input("rol", sql.VarChar(20), normalizarTexto(req.user.rol))
            .query(`
                SELECT
                    id_caja,
                    id_empleado,
                    id_sucursal,
                    monto_inicial,
                    estado
                FROM dbo.cajas WITH (UPDLOCK, HOLDLOCK)
                WHERE id_caja = @id_caja
                  AND id_sucursal = @id_sucursal
                  AND estado = 'ABIERTA'
                  AND (
                      @rol = 'GERENTE'
                      OR id_empleado = @id_empleado
                  );
            `);

        if (resultadoCaja.recordset.length === 0) {
            throw crearError(
                "La caja no existe, está cerrada o no tienes permiso para modificarla.",
                403
            );
        }

        const caja = resultadoCaja.recordset[0];

        // Control de saldo para egresos.

        if (tipo === "EGRESO") {
            const resultadoSaldo = await new sql.Request(transaction)
                .input("id_caja", sql.Int, idCaja)
                .input("metodo_pago", sql.VarChar(20), metodo)
                .query(`
                    SELECT
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN tipo_movimiento = 'INGRESO'
                                        THEN monto
                                    ELSE -monto
                                END
                            ),
                            0
                        ) AS saldo_movimientos
                    FROM dbo.movimientos_caja
                    WHERE id_caja = @id_caja
                      AND metodo_pago = @metodo_pago;
                `);

            const saldoMovimientosCentavos = deSqlACentavos(
                resultadoSaldo.recordset[0].saldo_movimientos
            );

            const saldoInicialCentavos =
                metodo === "EFECTIVO"
                    ? deSqlACentavos(caja.monto_inicial)
                    : 0;

            const saldoDisponibleCentavos =
                saldoInicialCentavos + saldoMovimientosCentavos;

            if (saldoDisponibleCentavos < 0) {
                throw crearError(
                    "El saldo disponible del método de pago es negativo.",
                    409
                );
            }

            if (cantidadCentavos > saldoDisponibleCentavos) {
                throw crearError(
                    "El egreso supera el saldo disponible para este método de pago.",
                    400
                );
            }
        }

        const resultadoMovimiento = await new sql.Request(transaction)
            .input("id_caja", sql.Int, idCaja)
            .input("tipo_movimiento", sql.VarChar(10), tipo)
            .input("metodo_pago", sql.VarChar(20), metodo)
            .input("monto", sql.Decimal(12, 2), cantidad)
            .input("descripcion", sql.VarChar(250), descripcionValidada)
            .query(`
                INSERT INTO dbo.movimientos_caja (
                    id_caja,
                    tipo_movimiento,
                    metodo_pago,
                    monto,
                    descripcion
                )
                OUTPUT INSERTED.id_movimiento
                VALUES (
                    @id_caja,
                    @tipo_movimiento,
                    @metodo_pago,
                    @monto,
                    @descripcion
                );
            `);

        await transaction.commit();
        iniciada = false;

        return res.status(201).json({
            mensaje: "Movimiento registrado correctamente.",
            id_movimiento: resultadoMovimiento.recordset[0].id_movimiento,
            id_caja: idCaja,
            tipo_movimiento: tipo,
            metodo_pago: metodo,
            monto: cantidad
        });

    } catch (error) {
        if (iniciada && transaction) {
            try {
                await transaction.rollback();
            } catch (errorRollback) {
                console.error(
                    "Error al revertir movimiento:",
                    errorRollback
                );
            }
        }

        if (error.status) {
            return res.status(error.status).json({
                mensaje: error.message
            });
        }

        next(error);
    }
};

// ======================================================
// 3. CONSULTAR CAJA Y MOVIMIENTOS
// ======================================================

const consultarCaja = async (req, res, next) => {
    try {
        const pool = await poolPromise;
        const idCaja = Number(req.params.id);

        if (!Number.isInteger(idCaja) || idCaja <= 0) {
            return res.status(400).json({
                mensaje: "El ID de caja no es válido."
            });
        }

        // Cajero: su caja.
        // Gerente: cualquier caja de su sucursal.

        const resultadoCaja = await pool.request()
            .input("id_caja", sql.Int, idCaja)
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .input("id_empleado", sql.Int, req.user.id_empleado)
            .input("rol", sql.VarChar(20), normalizarTexto(req.user.rol))
            .query(`
                SELECT
                    c.id_caja,
                    c.id_sucursal,
                    c.id_empleado,
                    c.fecha_apertura,
                    c.fecha_cierre,
                    c.monto_inicial,
                    c.monto_esperado,
                    c.monto_declarado,
                    c.diferencia,
                    c.estado
                FROM dbo.cajas c
                WHERE c.id_caja = @id_caja
                  AND c.id_sucursal = @id_sucursal
                  AND (
                      @rol = 'GERENTE'
                      OR c.id_empleado = @id_empleado
                  );
            `);

        if (resultadoCaja.recordset.length === 0) {
            return res.status(404).json({
                mensaje: "Caja no encontrada o no tienes permiso para consultarla."
            });
        }

        const resultadoMovimientos = await pool.request()
            .input("id_caja", sql.Int, idCaja)
            .query(`
                SELECT
                    id_movimiento,
                    tipo_movimiento,
                    metodo_pago,
                    monto,
                    descripcion,
                    fecha_movimiento
                FROM dbo.movimientos_caja
                WHERE id_caja = @id_caja
                ORDER BY fecha_movimiento, id_movimiento;
            `);

        const resultadoArqueos = await pool.request()
            .input("id_caja", sql.Int, idCaja)
            .query(`
                SELECT
                    id_arqueo,
                    metodo_pago,
                    monto_esperado,
                    monto_declarado,
                    diferencia,
                    fecha_registro
                FROM dbo.arqueos_caja
                WHERE id_caja = @id_caja
                ORDER BY metodo_pago;
            `);

        return res.status(200).json({
            caja: resultadoCaja.recordset[0],
            movimientos: resultadoMovimientos.recordset,
            arqueos: resultadoArqueos.recordset
        });

    } catch (error) {
        next(error);
    }
};

// ======================================================
// 4. CERRAR CAJA Y REALIZAR ARQUEO
// ======================================================

const cerrarCaja = async (req, res, next) => {
    let transaction;
    let iniciada = false;

    try {
        const pool = await poolPromise;

        const idCaja = Number(req.params.id);
        const declaraciones = req.body?.declaraciones;

        if (!Number.isInteger(idCaja) || idCaja <= 0) {
            return res.status(400).json({
                mensaje: "El ID de caja no es válido."
            });
        }

        if (
            !Array.isArray(declaraciones) ||
            declaraciones.length !== METODOS_PAGO.length
        ) {
            return res.status(400).json({
                mensaje: "Debe declarar los cuatro métodos de pago."
            });
        }

        // Validar estructura de cada declaración.

        if (
            declaraciones.some(
                item =>
                    item === null ||
                    typeof item !== "object" ||
                    Array.isArray(item)
            )
        ) {
            return res.status(400).json({
                mensaje: "La estructura de las declaraciones no es válida."
            });
        }

        const metodosRecibidos = declaraciones.map(
            item => normalizarTexto(item.metodo_pago)
        );

        if (
            new Set(metodosRecibidos).size !== METODOS_PAGO.length ||
            METODOS_PAGO.some(
                metodo => !metodosRecibidos.includes(metodo)
            )
        ) {
            return res.status(400).json({
                mensaje: "Debe declarar cada método de pago exactamente una vez."
            });
        }

        const declaracionesValidadas = [];

        for (const item of declaraciones) {
            const declaradoCentavos = convertirACentavos(
                item.monto_declarado,
                true
            );

            if (declaradoCentavos === null) {
                return res.status(400).json({
                    mensaje: "Los montos declarados deben ser válidos, mayores o iguales a cero y tener máximo dos decimales."
                });
            }

            declaracionesValidadas.push({
                metodo_pago: normalizarTexto(item.metodo_pago),
                monto_declarado_centavos: declaradoCentavos
            });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();
        iniciada = true;

        // AUTORIZACIÓN DEL CIERRE:
        // Cajero -> su propia caja.
        // Gerente -> cualquier caja de su sucursal.
        // Ambos -> únicamente su sucursal.

        const resultadoCaja = await new sql.Request(transaction)
            .input("id_caja", sql.Int, idCaja)
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .input("id_empleado", sql.Int, req.user.id_empleado)
            .input("rol", sql.VarChar(20), normalizarTexto(req.user.rol))
            .query(`
                SELECT *
                FROM dbo.cajas WITH (UPDLOCK, HOLDLOCK)
                WHERE id_caja = @id_caja
                  AND id_sucursal = @id_sucursal
                  AND estado = 'ABIERTA'
                  AND (
                      @rol = 'GERENTE'
                      OR id_empleado = @id_empleado
                  );
            `);

        if (resultadoCaja.recordset.length === 0) {
            throw crearError(
                "La caja no existe, está cerrada o no tienes permiso para cerrarla.",
                403
            );
        }

        const caja = resultadoCaja.recordset[0];
        const arqueos = [];

        // Calcular saldos y registrar arqueos.

        for (const metodo of METODOS_PAGO) {
            const resultadoMovimientos = await new sql.Request(transaction)
                .input("id_caja", sql.Int, idCaja)
                .input("metodo_pago", sql.VarChar(20), metodo)
                .query(`
                    SELECT
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN tipo_movimiento = 'INGRESO'
                                        THEN monto
                                    ELSE -monto
                                END
                            ),
                            0
                        ) AS saldo
                    FROM dbo.movimientos_caja
                    WHERE id_caja = @id_caja
                      AND metodo_pago = @metodo_pago;
                `);

            const movimientosCentavos = deSqlACentavos(
                resultadoMovimientos.recordset[0].saldo
            );

            const inicialCentavos =
                metodo === "EFECTIVO"
                    ? deSqlACentavos(caja.monto_inicial)
                    : 0;

            const esperadoCentavos =
                inicialCentavos + movimientosCentavos;

            if (
                esperadoCentavos < 0 ||
                esperadoCentavos > MAX_CENTAVOS
            ) {
                throw crearError(
                    "El saldo esperado está fuera del rango permitido.",
                    400
                );
            }

            const declaracion = declaracionesValidadas.find(
                item => item.metodo_pago === metodo
            );

            const declaradoCentavos =
                declaracion.monto_declarado_centavos;

            const diferenciaCentavos =
                declaradoCentavos - esperadoCentavos;

            const esperado = deCentavosADinero(esperadoCentavos);
            const declarado = deCentavosADinero(declaradoCentavos);
            const diferencia = deCentavosADinero(diferenciaCentavos);

            arqueos.push({
                metodo_pago: metodo,
                monto_esperado: esperado,
                monto_declarado: declarado,
                diferencia
            });

            await new sql.Request(transaction)
                .input("id_caja", sql.Int, idCaja)
                .input("metodo_pago", sql.VarChar(20), metodo)
                .input("monto_esperado", sql.Decimal(12, 2), esperado)
                .input("monto_declarado", sql.Decimal(12, 2), declarado)
                .query(`
                    INSERT INTO dbo.arqueos_caja (
                        id_caja,
                        metodo_pago,
                        monto_esperado,
                        monto_declarado
                    )
                    VALUES (
                        @id_caja,
                        @metodo_pago,
                        @monto_esperado,
                        @monto_declarado
                    );
                `);
        }

        // Totales calculados en centavos.

        const totalEsperadoCentavos = arqueos.reduce(
            (total, item) =>
                total + convertirACentavos(item.monto_esperado),
            0
        );

        const totalDeclaradoCentavos = arqueos.reduce(
            (total, item) =>
                total + convertirACentavos(item.monto_declarado),
            0
        );

        if (
            totalEsperadoCentavos > MAX_CENTAVOS ||
            totalDeclaradoCentavos > MAX_CENTAVOS
        ) {
            throw crearError(
                "Los totales superan el rango monetario permitido.",
                400
            );
        }

        const totalEsperado = deCentavosADinero(
            totalEsperadoCentavos
        );

        const totalDeclarado = deCentavosADinero(
            totalDeclaradoCentavos
        );

        const diferenciaTotal = deCentavosADinero(
            totalDeclaradoCentavos - totalEsperadoCentavos
        );

        // Cerrar caja.
        // El WHERE adicional evita actualizar una caja ya cerrada.

        const resultadoCierre = await new sql.Request(transaction)
            .input("id_caja", sql.Int, idCaja)
            .input("monto_esperado", sql.Decimal(12, 2), totalEsperado)
            .input("monto_declarado", sql.Decimal(12, 2), totalDeclarado)
            .input("diferencia", sql.Decimal(12, 2), diferenciaTotal)
            .query(`
                UPDATE dbo.cajas
                SET
                    fecha_cierre = SYSDATETIME(),
                    monto_esperado = @monto_esperado,
                    monto_declarado = @monto_declarado,
                    diferencia = @diferencia,
                    estado = 'CERRADA'
                WHERE id_caja = @id_caja
                  AND estado = 'ABIERTA';
            `);

        if (resultadoCierre.rowsAffected[0] !== 1) {
            throw crearError(
                "La caja ya fue cerrada o no pudo cerrarse.",
                409
            );
        }

        await transaction.commit();
        iniciada = false;

        return res.status(200).json({
            mensaje: "Caja cerrada y arqueo registrado correctamente.",
            id_caja: idCaja,
            total_esperado: totalEsperado,
            total_declarado: totalDeclarado,
            diferencia_total: diferenciaTotal,
            estado: "CERRADA",
            arqueos
        });

    } catch (error) {
        if (iniciada && transaction) {
            try {
                await transaction.rollback();
            } catch (errorRollback) {
                console.error(
                    "Error al revertir cierre de caja:",
                    errorRollback
                );
            }
        }

        if (error.status) {
            return res.status(error.status).json({
                mensaje: error.message
            });
        }

        next(error);
    }
};

// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
    abrirCaja,
    registrarMovimiento,
    consultarCaja,
    cerrarCaja
};