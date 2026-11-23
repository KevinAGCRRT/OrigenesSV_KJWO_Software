const { getConnection, sql } = require("../config/coneccionSQLserver.js");

// GET /api/insumos
const obtenerInsumos = async (req, res) => {
    try {
        const pool = await getConnection();

        const result = await pool.request().query(`
            SELECT
                id_insumo,
                nombre,
                unidad_medida,
                es_reventa,
                stock_minimo,
                precio_unitario
            FROM insumos
            ORDER BY nombre ASC
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: "Error al obtener el catálogo de insumos",
            error: error.message
        });
    }
};

// POST /api/insumos
const crearInsumo = async (req, res) => {
    const {
        nombre,
        unidad_medida,
        es_reventa,
        stock_minimo,
        precio_unitario
    } = req.body;

    if (
        !nombre ||
        !unidad_medida ||
        precio_unitario === undefined ||
        precio_unitario <= 0
    ) {
        return res.status(400).json({
            mensaje: "Nombre, unidad de medida y un precio unitario mayor a 0 son obligatorios"
        });
    }

    let transaction;

    try {
        const pool = await getConnection();

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Registrar el insumo en el catálogo global
        const insumoReq = new sql.Request(transaction);

        const insumoRes = await insumoReq
            .input("nombre", sql.VarChar(60), nombre)
            .input("unidad_medida", sql.VarChar(15), unidad_medida)
            .input("es_reventa", sql.Bit, es_reventa ? 1 : 0)
            .input("stock_minimo", sql.Decimal(10, 2), stock_minimo || 0)
            .input("precio_unitario", sql.Decimal(10, 2), precio_unitario)
            .query(`
                INSERT INTO insumos (
                    nombre,
                    unidad_medida,
                    es_reventa,
                    stock_minimo,
                    precio_unitario
                )
                OUTPUT INSERTED.id_insumo
                VALUES (
                    @nombre,
                    @unidad_medida,
                    @es_reventa,
                    @stock_minimo,
                    @precio_unitario
                )
            `);

        const nuevoIdInsumo = insumoRes.recordset[0].id_insumo;

        // 2. Inicializar el inventario en todas las sucursales
        const invReq = new sql.Request(transaction);

        await invReq
            .input("id_insumo", sql.Int, nuevoIdInsumo)
            .query(`
                INSERT INTO inventario_sucursal (
                    id_sucursal,
                    id_insumo,
                    stock_actual
                )
                SELECT id_sucursal, @id_insumo, 0
                FROM sucursales
            `);

        await transaction.commit();

        res.status(201).json({
            mensaje: "Insumo registrado e inicializado en todas las sucursales",
            id_insumo: nuevoIdInsumo
        });

    } catch (error) {
        if (transaction) {
            await transaction.rollback();
        }

        res.status(500).json({
            mensaje: "Error al crear el insumo",
            error: error.message
        });
    }
};

module.exports = {
    obtenerInsumos,
    crearInsumo
};
