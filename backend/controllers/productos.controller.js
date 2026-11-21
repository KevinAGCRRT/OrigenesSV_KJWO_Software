const { sql, poolPromise } = require('../config/db');

const obtenerMenuConRecetas = async (req, res) => {
    try {
        const pool = await poolPromise;

        const productosRes = await pool.request().query(`
            SELECT id_producto, nombre, precio_venta, es_elaborado, id_insumo_reventa
            FROM productos
            WHERE activo = 1
            ORDER BY es_elaborado DESC, nombre ASC
        `);

        const recetasRes = await pool.request().query(`
            SELECT r.id_producto, r.id_insumo, i.nombre AS insumo, r.cantidad_requerida, i.unidad_medida
            FROM recetas r
            INNER JOIN insumos i ON r.id_insumo = i.id_insumo
        `);

        // Estructurar cada producto con su arreglo de ingredientes
        const menuCompleto = productosRes.recordset.map(prod => ({
            ...prod,
            es_elaborado: Boolean(prod.es_elaborado),
            receta: recetasRes.recordset.filter(rec => rec.id_producto === prod.id_producto)
        }));

        res.status(200).json(menuCompleto);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener el menú', error: error.message });
    }
};

const crearProductoConReceta = async (req, res) => {
    const { nombre, precio_venta, es_elaborado, id_insumo_reventa, ingredientes } = req.body;

    if (!nombre || !precio_venta || precio_venta <= 0) {
        return res.status(400).json({ mensaje: 'Nombre y precio de venta válido son obligatorios' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Insertar producto y capturar el ID generado con OUTPUT INSERTED
        const prodRequest = new sql.Request(transaction);
        const prodResult = await prodRequest
            .input('nombre', sql.VarChar(100), nombre)
            .input('precio_venta', sql.Decimal(10, 2), precio_venta)
            .input('es_elaborado', sql.Bit, es_elaborado ? 1 : 0)
            .input('id_insumo_reventa', sql.Int, es_elaborado ? null : id_insumo_reventa)
            .query(`
                INSERT INTO productos (nombre, precio_venta, es_elaborado, id_insumo_reventa)
                OUTPUT INSERTED.id_producto
                VALUES (@nombre, @precio_venta, @es_elaborado, @id_insumo_reventa)
            `);

        const nuevoIdProducto = prodResult.recordset[0].id_producto;

        // 2. Si es elaborado, recorrer el arreglo de ingredientes e insertarlos en recetas
        if (es_elaborado && Array.isArray(ingredientes)) {
            for (const item of ingredientes) {
                const recRequest = new sql.Request(transaction);
                await recRequest
                    .input('id_producto', sql.Int, nuevoIdProducto)
                    .input('id_insumo', sql.Int, item.id_insumo)
                    .input('cantidad_requerida', sql.Decimal(10, 2), item.cantidad_requerida)
                    .query(`
                        INSERT INTO recetas (id_producto, id_insumo, cantidad_requerida)
                        VALUES (@id_producto, @id_insumo, @cantidad_requerida)
                    `);
            }
        }

        await transaction.commit();
        res.status(201).json({ 
            mensaje: 'Producto registrado exitosamente', 
            id_producto: nuevoIdProducto 
        });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ mensaje: 'Error al crear el producto', error: error.message });
    }
};

module.exports = { obtenerMenuConRecetas, crearProductoConReceta };