const { sql, poolPromise } = require("../config/coneccionSQLserver");

// ======================================================
// VALIDACIONES Y UTILIDADES
// ======================================================

const esIdValido = (id) => {
    return /^\d+$/.test(id) &&
        Number.isSafeInteger(Number(id)) &&
        Number(id) > 0;
};

const validarTexto = (valor, maximo) => {
    return (
        typeof valor === "string" &&
        valor.trim().length > 0 &&
        valor.trim().length <= maximo
    );
};

const normalizarCorreo = (correo) => {
    if (typeof correo !== "string") return null;
    return correo.trim().toLowerCase();
};

const validarCorreo = (correo) => {
    if (typeof correo !== "string" || correo.length > 100) {
        return false;
    }

    const normalizado = correo.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(normalizado);
};

const validarTelefono = (telefono) => {
    if (telefono === null || telefono === undefined || telefono === "") {
        return true;
    }

    if (typeof telefono !== "string") {
        return false;
    }

    const normalizado = telefono.trim();

    return (
        normalizado.length <= 15 &&
        /^[0-9+\-\s()]+$/.test(normalizado) &&
        /\d/.test(normalizado)
    );
};

const validarFecha = (fecha) => {
    if (typeof fecha !== "string") {
        return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const fechaValidada = new Date(Date.UTC(anio, mes - 1, dia));

    return (
        fechaValidada.getUTCFullYear() === anio &&
        fechaValidada.getUTCMonth() === mes - 1 &&
        fechaValidada.getUTCDate() === dia
    );
};

const validarSalario = (salario) => {
    if (
        typeof salario !== "number" &&
        typeof salario !== "string"
    ) {
        return false;
    }

    const normalizado = String(salario).trim();

    if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) {
        return false;
    }

    const valor = Number(normalizado);

    return (
        Number.isFinite(valor) &&
        valor > 0 &&
        valor <= 99999999.99
    );
};

const validarCamposPermitidos = (body, camposPermitidos) => {
    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        return false;
    }

    return Object.keys(body).every((campo) =>
        camposPermitidos.includes(campo)
    );
};

const CAMPOS_EMPLEADO = [
    "nombre",
    "apellido",
    "correo",
    "telefono",
    "fecha_contratacion",
    "salario_base"
];

const validarDatosEmpleado = (datos, esActualizacion = false) => {
    if (!validarCamposPermitidos(datos, CAMPOS_EMPLEADO)) {
        return "El cuerpo contiene campos no permitidos.";
    }

    if (
        !validarTexto(datos.nombre, 60) ||
        !validarTexto(datos.apellido, 60)
    ) {
        return "Nombre y apellido son obligatorios y deben tener máximo 60 caracteres.";
    }

    if (!validarCorreo(datos.correo)) {
        return "El correo electrónico no tiene un formato válido.";
    }

    if (!validarTelefono(datos.telefono)) {
        return "El teléfono no tiene un formato válido.";
    }

    if (
        datos.fecha_contratacion !== undefined &&
        !validarFecha(datos.fecha_contratacion)
    ) {
        return "La fecha de contratación debe tener formato YYYY-MM-DD y ser válida.";
    }

    if (
        esActualizacion &&
        datos.fecha_contratacion === undefined
    ) {
        return "La fecha de contratación es obligatoria para actualizar.";
    }

    if (!validarSalario(datos.salario_base)) {
        return "El salario base debe ser un número mayor a cero, con máximo dos decimales.";
    }

    return null;
};

// ======================================================
// 1. LISTAR EMPLEADOS DE LA SUCURSAL DEL GERENTE
// ======================================================

const listarEmpleados = async (req, res, next) => {
    try {
        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .query(`
                SELECT
                    id_empleado,
                    nombre,
                    apellido,
                    correo,
                    telefono,
                    id_sucursal,
                    fecha_contratacion,
                    salario_base,
                    activo
                FROM dbo.empleados
                WHERE id_sucursal = @id_sucursal
                ORDER BY id_empleado DESC;
            `);

        return res.status(200).json(resultado.recordset);

    } catch (error) {
        next(error);
    }
};

// ======================================================
// 2. CONSULTAR EMPLEADO POR ID
// ======================================================

const consultarEmpleado = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!esIdValido(id)) {
            return res.status(400).json({
                mensaje: "El identificador del empleado no es válido."
            });
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id_empleado", sql.Int, Number(id))
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .query(`
                SELECT
                    id_empleado,
                    nombre,
                    apellido,
                    correo,
                    telefono,
                    id_sucursal,
                    fecha_contratacion,
                    salario_base,
                    activo
                FROM dbo.empleados
                WHERE id_empleado = @id_empleado
                  AND id_sucursal = @id_sucursal;
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                mensaje: "Empleado no encontrado."
            });
        }

        return res.status(200).json(resultado.recordset[0]);

    } catch (error) {
        next(error);
    }
};

// ======================================================
// 3. CREAR EMPLEADO
// ======================================================

const crearEmpleado = async (req, res, next) => {
    try {
        const errorValidacion = validarDatosEmpleado(req.body);

        if (errorValidacion) {
            return res.status(400).json({
                mensaje: errorValidacion
            });
        }

        const nombre = req.body.nombre.trim();
        const apellido = req.body.apellido.trim();
        const correo = normalizarCorreo(req.body.correo);
        const telefono = req.body.telefono
            ? req.body.telefono.trim()
            : null;

        const fechaContratacion = req.body.fecha_contratacion;
        const salarioBase = Number(req.body.salario_base);

        const pool = await poolPromise;

        const request = pool.request()
            .input("nombre", sql.VarChar(60), nombre)
            .input("apellido", sql.VarChar(60), apellido)
            .input("correo", sql.VarChar(100), correo)
            .input("telefono", sql.VarChar(15), telefono)
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .input("salario_base", sql.Decimal(10, 2), salarioBase);

        let consultaFecha;

        if (fechaContratacion !== undefined) {
            request.input(
                "fecha_contratacion",
                sql.Date,
                fechaContratacion
            );

            consultaFecha = `
                INSERT INTO dbo.empleados (
                    nombre,
                    apellido,
                    correo,
                    telefono,
                    id_sucursal,
                    fecha_contratacion,
                    salario_base
                )
                OUTPUT
                    INSERTED.id_empleado,
                    INSERTED.nombre,
                    INSERTED.apellido,
                    INSERTED.correo,
                    INSERTED.telefono,
                    INSERTED.id_sucursal,
                    INSERTED.fecha_contratacion,
                    INSERTED.salario_base,
                    INSERTED.activo
                VALUES (
                    @nombre,
                    @apellido,
                    @correo,
                    @telefono,
                    @id_sucursal,
                    @fecha_contratacion,
                    @salario_base
                );
            `;
        } else {
            consultaFecha = `
                INSERT INTO dbo.empleados (
                    nombre,
                    apellido,
                    correo,
                    telefono,
                    id_sucursal,
                    salario_base
                )
                OUTPUT
                    INSERTED.id_empleado,
                    INSERTED.nombre,
                    INSERTED.apellido,
                    INSERTED.correo,
                    INSERTED.telefono,
                    INSERTED.id_sucursal,
                    INSERTED.fecha_contratacion,
                    INSERTED.salario_base,
                    INSERTED.activo
                VALUES (
                    @nombre,
                    @apellido,
                    @correo,
                    @telefono,
                    @id_sucursal,
                    @salario_base
                );
            `;
        }

        const resultado = await request.query(consultaFecha);

        return res.status(201).json({
            mensaje: "Empleado creado correctamente.",
            empleado: resultado.recordset[0]
        });

    } catch (error) {
        if (error.number === 2627 || error.number === 2601) {
            return res.status(409).json({
                mensaje: "Ya existe un empleado registrado con ese correo."
            });
        }

        next(error);
    }
};

// ======================================================
// 4. ACTUALIZAR EMPLEADO
// ======================================================

const actualizarEmpleado = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!esIdValido(id)) {
            return res.status(400).json({
                mensaje: "El identificador del empleado no es válido."
            });
        }

        const errorValidacion = validarDatosEmpleado(
            req.body,
            true
        );

        if (errorValidacion) {
            return res.status(400).json({
                mensaje: errorValidacion
            });
        }

        const nombre = req.body.nombre.trim();
        const apellido = req.body.apellido.trim();
        const correo = normalizarCorreo(req.body.correo);
        const telefono = req.body.telefono
            ? req.body.telefono.trim()
            : null;
        const salarioBase = Number(req.body.salario_base);

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id_empleado", sql.Int, Number(id))
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .input("nombre", sql.VarChar(60), nombre)
            .input("apellido", sql.VarChar(60), apellido)
            .input("correo", sql.VarChar(100), correo)
            .input("telefono", sql.VarChar(15), telefono)
            .input("salario_base", sql.Decimal(10, 2), salarioBase)
            .input(
                "fecha_contratacion",
                sql.Date,
                req.body.fecha_contratacion
            )
            .query(`
                UPDATE dbo.empleados
                SET
                    nombre = @nombre,
                    apellido = @apellido,
                    correo = @correo,
                    telefono = @telefono,
                    fecha_contratacion = @fecha_contratacion,
                    salario_base = @salario_base
                OUTPUT
                    INSERTED.id_empleado,
                    INSERTED.nombre,
                    INSERTED.apellido,
                    INSERTED.correo,
                    INSERTED.telefono,
                    INSERTED.id_sucursal,
                    INSERTED.fecha_contratacion,
                    INSERTED.salario_base,
                    INSERTED.activo
                WHERE id_empleado = @id_empleado
                  AND id_sucursal = @id_sucursal
                  AND activo = 1;
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                mensaje: "Empleado no encontrado o inactivo."
            });
        }

        return res.status(200).json({
            mensaje: "Empleado actualizado correctamente.",
            empleado: resultado.recordset[0]
        });

    } catch (error) {
        if (error.number === 2627 || error.number === 2601) {
            return res.status(409).json({
                mensaje: "Ya existe un empleado registrado con ese correo."
            });
        }

        next(error);
    }
};

// ======================================================
// 5. DESACTIVAR EMPLEADO (SINCRONIZADA Y TRANSACCIONAL)
// ======================================================

const desactivarEmpleado = async (req, res, next) => {
    let transaction;
    let transactionIniciada = false;

    try {
        const { id } = req.params;

        if (!esIdValido(id)) {
            return res.status(400).json({
                mensaje: "El identificador del empleado no es válido."
            });
        }

        if (Number(id) === Number(req.user.id_empleado)) {
            return res.status(400).json({
                mensaje: "No puedes desactivar tu propio empleado."
            });
        }

        const pool = await poolPromise;

        transaction = new sql.Transaction(pool);
        await transaction.begin();
        transactionIniciada = true;

        // 1. Bloquear el registro del empleado.
        // La apertura de caja utiliza el mismo bloqueo.
        const resultadoEmpleado = await transaction.request()
            .input("id_empleado", sql.Int, Number(id))
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
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

            return res.status(404).json({
                mensaje: "Empleado no encontrado o ya desactivado."
            });
        }

        // 2. Comprobar caja abierta.
        const resultadoCaja = await transaction.request()
            .input("id_empleado", sql.Int, Number(id))
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
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
                mensaje: "No se puede desactivar al empleado porque tiene una caja abierta."
            });
        }

        // 3. Desactivar empleado.
        const resultadoDesactivacion = await transaction.request()
            .input("id_empleado", sql.Int, Number(id))
            .input("id_sucursal", sql.Int, req.user.id_sucursal)
            .query(`
                UPDATE dbo.empleados
                SET activo = 0
                OUTPUT
                    INSERTED.id_empleado,
                    INSERTED.nombre,
                    INSERTED.apellido,
                    INSERTED.activo
                WHERE id_empleado = @id_empleado
                  AND id_sucursal = @id_sucursal
                  AND activo = 1;
            `);

        if (resultadoDesactivacion.recordset.length === 0) {
            await transaction.rollback();
            transactionIniciada = false;

            return res.status(404).json({
                mensaje: "Empleado no encontrado o ya desactivado."
            });
        }

        // 4. Desactivar cuentas vinculadas.
        await transaction.request()
            .input("id_empleado", sql.Int, Number(id))
            .query(`
                UPDATE dbo.usuarios
                SET activo = 0
                WHERE id_empleado = @id_empleado
                  AND activo = 1;
            `);

        // 5. Confirmar ambas modificaciones.
        await transaction.commit();
        transactionIniciada = false;

        return res.status(200).json({
            mensaje: "Empleado desactivado correctamente.",
            empleado: resultadoDesactivacion.recordset[0]
        });

    } catch (error) {
        if (transactionIniciada && transaction) {
            try {
                await transaction.rollback();
            } catch (errorRollback) {
                // Conservamos el error original.
            }
        }

        next(error);
    }
};

// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
    listarEmpleados,
    consultarEmpleado,
    crearEmpleado,
    actualizarEmpleado,
    desactivarEmpleado
};