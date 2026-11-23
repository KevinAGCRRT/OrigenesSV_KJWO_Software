
const { sql, poolPromise } = require("../config/coneccionSQLserver");

// Obtener todos los proveedores
const obtenerProveedores = async (req, res, next) => {
    try {
        const pool = await poolPromise;

        const resultado = await pool.request().query(`
            SELECT *
            FROM proveedores
            ORDER BY id_proveedor DESC
        `);

        return res.status(200).json(resultado.recordset);

    } catch (error) {
        next(error);
    }
};

// Obtener proveedor por ID
const obtenerProveedorPorId = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "El ID del proveedor no es válido"
            });
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id", sql.Int, id)
            .query(`
                SELECT *
                FROM proveedores
                WHERE id_proveedor = @id
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                mensaje: "Proveedor no encontrado"
            });
        }

        return res.status(200).json(resultado.recordset[0]);

    } catch (error) {
        next(error);
    }
};

// Crear proveedor
const crearProveedor = async (req, res, next) => {
    try {
        const {
            nombre, nit, nrc, contacto,
            telefono, correo, direccion
        } = req.body;

        if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
            return res.status(400).json({
                mensaje: "El nombre del proveedor es obligatorio"
            });
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("nombre", sql.VarChar(100), nombre.trim())
            .input("nit", sql.VarChar(20), nit || null)
            .input("nrc", sql.VarChar(20), nrc || null)
            .input("contacto", sql.VarChar(100), contacto || null)
            .input("telefono", sql.VarChar(20), telefono || null)
            .input("correo", sql.VarChar(100), correo || null)
            .input("direccion", sql.VarChar(250), direccion || null)
            .query(`
                INSERT INTO proveedores
                    (nombre, nit, nrc, contacto, telefono, correo, direccion)
                OUTPUT INSERTED.*
                VALUES
                    (@nombre, @nit, @nrc, @contacto, @telefono, @correo, @direccion)
            `);

        return res.status(201).json({
            mensaje: "Proveedor creado correctamente",
            proveedor: resultado.recordset[0]
        });

    } catch (error) {
        if (error.number === 2601 || error.number === 2627) {
            return res.status(409).json({
                mensaje: "El NIT o NRC ya está registrado para otro proveedor"
            });
        }

        next(error);
    }
};

// Actualizar proveedor
const actualizarProveedor = async (req, res, next) => {
    try {
        const {
            nombre, nit, nrc, contacto,
            telefono, correo, direccion
        } = req.body;

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "El ID del proveedor no es válido"
            });
        }

        if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
            return res.status(400).json({
                mensaje: "El nombre del proveedor es obligatorio"
            });
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id", sql.Int, id)
            .input("nombre", sql.VarChar(100), nombre.trim())
            .input("nit", sql.VarChar(20), nit || null)
            .input("nrc", sql.VarChar(20), nrc || null)
            .input("contacto", sql.VarChar(100), contacto || null)
            .input("telefono", sql.VarChar(20), telefono || null)
            .input("correo", sql.VarChar(100), correo || null)
            .input("direccion", sql.VarChar(250), direccion || null)
            .query(`
                UPDATE proveedores
                SET nombre = @nombre,
                    nit = @nit,
                    nrc = @nrc,
                    contacto = @contacto,
                    telefono = @telefono,
                    correo = @correo,
                    direccion = @direccion
                WHERE id_proveedor = @id;

                SELECT *
                FROM proveedores
                WHERE id_proveedor = @id;
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                mensaje: "Proveedor no encontrado"
            });
        }

        return res.status(200).json({
            mensaje: "Proveedor actualizado correctamente",
            proveedor: resultado.recordset[0]
        });

    } catch (error) {
        if (error.number === 2601 || error.number === 2627) {
            return res.status(409).json({
                mensaje: "El NIT o NRC ya está registrado para otro proveedor"
            });
        }

        next(error);
    }
};

// Cambiar estado del proveedor
const cambiarEstadoProveedor = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { activo } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "El ID del proveedor no es válido"
            });
        }

        if (typeof activo !== "boolean") {
            return res.status(400).json({
                mensaje: "El estado debe ser true o false"
            });
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id", sql.Int, id)
            .input("activo", sql.Bit, activo)
            .query(`
                UPDATE proveedores
                SET activo = @activo
                WHERE id_proveedor = @id;

                SELECT *
                FROM proveedores
                WHERE id_proveedor = @id;
            `);

        if (resultado.recordset.length === 0) {
            return res.status(404).json({
                mensaje: "Proveedor no encontrado"
            });
        }

        return res.status(200).json({
            mensaje: "Estado del proveedor actualizado correctamente",
            proveedor: resultado.recordset[0]
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerProveedores,
    obtenerProveedorPorId,
    crearProveedor,
    actualizarProveedor,
    cambiarEstadoProveedor
};
