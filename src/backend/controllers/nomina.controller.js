const { sql, poolPromise } = require("../config/coneccionSQLserver");

// ======================================================
// CONFIGURACIÓN DE DEDUCCIONES
// ======================================================

const PORCENTAJE_ISSS = 0.03;
const PORCENTAJE_AFP = 0.0725;

// ISR se recibe como monto calculado/validado externamente.
const validarId = (id) =>
    /^\d+$/.test(String(id)) &&
    Number.isSafeInteger(Number(id)) &&
    Number(id) > 0;

const validarFecha = (fecha) => {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const date = new Date(Date.UTC(anio, mes - 1, dia));

    return (
        date.getUTCFullYear() === anio &&
        date.getUTCMonth() === mes - 1 &&
        date.getUTCDate() === dia
    );
};

const validarPeriodoMensual = (inicio, fin) => {
    if (!validarFecha(inicio) || !validarFecha(fin)) {
        return false;
    }

    const fechaInicio = new Date(`${inicio}T00:00:00Z`);
    const fechaFin = new Date(`${fin}T00:00:00Z`);

    return (
        fechaInicio.getUTCDate() === 1 &&
        fechaInicio.getUTCMonth() === fechaFin.getUTCMonth() &&
        fechaInicio.getUTCFullYear() === fechaFin.getUTCFullYear() &&
        fechaFin.getUTCDate() ===
            new Date(
                Date.UTC(
                    fechaFin.getUTCFullYear(),
                    fechaFin.getUTCMonth() + 1,
                    0
                )
            ).getUTCDate()
    );
};

const validarISR = (valor) => {
    if (
        typeof valor !== "number" &&
        typeof valor !== "string"
    ) {
        return false;
    }

    const numero = Number(valor);

    return Number.isFinite(numero) && numero >= 0;
};

const redondear = (valor) =>
    Math.round((valor + Number.EPSILON) * 100) / 100;

// ======================================================
// 1. LISTAR NÓMINAS DE LA SUCURSAL
// ======================================================

const listarNominas = async (req, res, next) => {
    try {
        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .query(`
                SELECT
                    n.id_nomina,
                    n.id_empleado,
                    e.nombre,
                    e.apellido,
                    n.fecha_inicio,
                    n.fecha_fin,
                    n.salario_base_snapshot,
                    n.salario_periodo,
                    n.monto_isss,
                    n.monto_afp,
                    n.monto_isr,
                    n.total_deducciones,
                    n.salario_neto,
                    n.estado,
                    n.fecha_registro,
                    n.fecha_pago
                FROM dbo.nominas n
                INNER JOIN dbo.empleados e
                    ON e.id_empleado = n.id_empleado
                WHERE e.id_sucursal = @id_sucursal
                ORDER BY n.fecha_registro DESC;
            `);

        return res.status(200).json(resultado.recordset);

    } catch (error) {
        next(error);
    }
};

// ======================================================
// 2. CONSULTAR NÓMINA POR ID
// ======================================================

const consultarNomina = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!validarId(id)) {
            return res.status(400).json({
                mensaje: "El identificador de la nómina no es válido."
            });
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id_nomina", sql.Int, Number(id))
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .query(`
                SELECT
                    n.id_nomina,
                    n.id_empleado,
                    e.nombre,
                    e.apellido,
                    n.fecha_inicio,
                    n.fecha_fin,
                    n.salario_base_snapshot,
                    n.salario_periodo,
                    n.monto_isss,
                    n.monto_afp,
                    n.monto_isr,
                    n.total_deducciones,
                    n.salario_neto,
                    n.estado,
                    n.fecha_registro,
                    n.fecha_pago
                FROM dbo.nominas n
                INNER JOIN dbo.empleados e
                    ON e.id_empleado = n.id_empleado
                WHERE n.id_nomina = @id_nomina
                  AND e.id_sucursal = @id_sucursal;
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                mensaje: "Nómina no encontrada."
            });
        }

        return res.status(200).json(resultado.recordset[0]);

    } catch (error) {
        next(error);
    }
};

// ======================================================
// 3. CALCULAR Y REGISTRAR NÓMINA
// ======================================================

const crearNomina = async (req, res, next) => {
    try {
        const {
            id_empleado,
            fecha_inicio,
            fecha_fin,
            monto_isr = 0
        } = req.body;

        if (!validarId(id_empleado)) {
            return res.status(400).json({
                mensaje: "El identificador del empleado no es válido."
            });
        }

        if (!validarPeriodoMensual(fecha_inicio, fecha_fin)) {
            return res.status(400).json({
                mensaje: "El período debe corresponder a un mes completo, desde el primer hasta el último día."
            });
        }

        if (!validarISR(monto_isr)) {
            return res.status(400).json({
                mensaje: "El monto de ISR no es válido."
            });
        }

        const pool = await poolPromise;

        // 1. Obtener empleado activo y perteneciente a la sucursal.
        const resultadoEmpleado = await pool.request()
            .input("id_empleado", sql.Int, Number(id_empleado))
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .query(`
                SELECT
                    id_empleado,
                    salario_base
                FROM dbo.empleados
                WHERE id_empleado = @id_empleado
                  AND id_sucursal = @id_sucursal
                  AND activo = 1;
            `);

        if (resultadoEmpleado.recordset.length === 0) {
            return res.status(404).json({
                mensaje: "Empleado no encontrado, inactivo o fuera de tu sucursal."
            });
        }

        const salarioBase = Number(
            resultadoEmpleado.recordset[0].salario_base
        );

        if (!Number.isFinite(salarioBase) || salarioBase <= 0) {
            return res.status(400).json({
                mensaje: "El empleado no tiene un salario base válido."
            });
        }

        // 2. Calcular deducciones.
        const salarioPeriodo = redondear(salarioBase);
        const montoISSS = redondear(salarioPeriodo * PORCENTAJE_ISSS);
        const montoAFP = redondear(salarioPeriodo * PORCENTAJE_AFP);
        const montoISR = redondear(Number(req.body.monto_isr ?? 0));

        const totalDeducciones = redondear(
            montoISSS + montoAFP + montoISR
        );

        const salarioNeto = redondear(
            salarioPeriodo - totalDeducciones
        );

        if (salarioNeto < 0) {
            return res.status(400).json({
                mensaje: "Las deducciones no pueden superar el salario del período."
            });
        }

        // 3. Insertar nómina.
        const resultado = await pool.request()
            .input("id_empleado", sql.Int, Number(id_empleado))
            .input("fecha_inicio", sql.Date, fecha_inicio)
            .input("fecha_fin", sql.Date, fecha_fin)
            .input("salario_base_snapshot", sql.Decimal(10, 2), salarioBase)
            .input("salario_periodo", sql.Decimal(10, 2), salarioPeriodo)
            .input("monto_isss", sql.Decimal(10, 2), montoISSS)
            .input("monto_afp", sql.Decimal(10, 2), montoAFP)
            .input("monto_isr", sql.Decimal(10, 2), montoISR)
            .input("total_deducciones", sql.Decimal(10, 2), totalDeducciones)
            .input("salario_neto", sql.Decimal(10, 2), salarioNeto)
            .query(`
                INSERT INTO dbo.nominas (
                    id_empleado,
                    fecha_inicio,
                    fecha_fin,
                    salario_base_snapshot,
                    salario_periodo,
                    monto_isss,
                    monto_afp,
                    monto_isr,
                    total_deducciones,
                    salario_neto
                )
                OUTPUT
                    INSERTED.id_nomina,
                    INSERTED.id_empleado,
                    INSERTED.fecha_inicio,
                    INSERTED.fecha_fin,
                    INSERTED.salario_base_snapshot,
                    INSERTED.salario_periodo,
                    INSERTED.monto_isss,
                    INSERTED.monto_afp,
                    INSERTED.monto_isr,
                    INSERTED.total_deducciones,
                    INSERTED.salario_neto,
                    INSERTED.estado,
                    INSERTED.fecha_registro,
                    INSERTED.fecha_pago
                VALUES (
                    @id_empleado,
                    @fecha_inicio,
                    @fecha_fin,
                    @salario_base_snapshot,
                    @salario_periodo,
                    @monto_isss,
                    @monto_afp,
                    @monto_isr,
                    @total_deducciones,
                    @salario_neto
                );
            `);

        return res.status(201).json({
            mensaje: "Nómina calculada y registrada correctamente.",
            nomina: resultado.recordset[0]
        });

    } catch (error) {
        // Índice único para empleado y período.
        if (error.number === 2601 || error.number === 2627) {
            return res.status(409).json({
                mensaje: "Ya existe una nómina para ese empleado y período."
            });
        }

        next(error);
    }
};

// ======================================================
// 4. MARCAR NÓMINA COMO PAGADA
// ======================================================

const pagarNomina = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!validarId(id)) {
            return res.status(400).json({
                mensaje: "El identificador de la nómina no es válido."
            });
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id_nomina", sql.Int, Number(id))
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .query(`
                UPDATE n
                SET
                    estado = 'PAGADA',
                    fecha_pago = SYSDATETIME()
                OUTPUT
                    INSERTED.id_nomina,
                    INSERTED.id_empleado,
                    INSERTED.fecha_inicio,
                    INSERTED.fecha_fin,
                    INSERTED.salario_base_snapshot,
                    INSERTED.salario_periodo,
                    INSERTED.monto_isss,
                    INSERTED.monto_afp,
                    INSERTED.monto_isr,
                    INSERTED.total_deducciones,
                    INSERTED.salario_neto,
                    INSERTED.estado,
                    INSERTED.fecha_registro,
                    INSERTED.fecha_pago
                FROM dbo.nominas n
                INNER JOIN dbo.empleados e
                    ON e.id_empleado = n.id_empleado
                WHERE n.id_nomina = @id_nomina
                  AND e.id_sucursal = @id_sucursal
                  AND n.estado = 'CALCULADA';
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                mensaje: "Nómina no encontrada o ya fue pagada."
            });
        }

        return res.status(200).json({
            mensaje: "Nómina marcada como pagada correctamente.",
            nomina: resultado.recordset[0]
        });

    } catch (error) {
        next(error);
    }
};

// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
    listarNominas,
    consultarNomina,
    crearNomina,
    pagarNomina
};