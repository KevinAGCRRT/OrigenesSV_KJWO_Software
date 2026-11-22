const { sql, poolPromise } = require('../config/coneccionSQLserver.js');

const obtenerInventarioPorSucursal = async (req, res) => {
    try {
        const { idSucursal } = req.params;
        const pool = await poolPromise;

      const result = await pool.request()
            .input('idSucursal', sql.Int, idSucursal)
            .query(`
                SELECT 
                    inv.id_inventario,
                    i.id_insumo,
                    i.nombre AS insumo,
                    i.unidad_medida,
                    i.es_reventa,
                    inv.stock_actual,
                    i.stock_minimo,
                    i.precio_unitario
                FROM inventario_sucursal inv
                INNER JOIN insumos i ON inv.id_insumo = i.id_insumo
                WHERE inv.id_sucursal = @idSucursal
                ORDER BY i.nombre ASC
            `);
           res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al consultar inventario', error: error.message });
    }
};

const obtenerAlertasStock = async (req, res) => {
    try {
        const { idSucursal } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('idSucursal', sql.Int, idSucursal)
            .query(`
                SELECT 
                    i.id_insumo,
                    i.nombre AS insumo,
                    i.unidad_medida,
                    inv.stock_actual,
                    i.stock_minimo,
                    (i.stock_minimo - inv.stock_actual) AS deficit
                FROM inventario_sucursal inv
                INNER JOIN insumos i ON inv.id_insumo = i.id_insumo
                WHERE inv.id_sucursal = @idSucursal 
                  AND inv.stock_actual <= i.stock_minimo
                ORDER BY deficit DESC
            `);

        res.status(200).json({
            total_alertas: result.recordset.length,
            alertas: result.recordset
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener alertas de stock', error: error.message });
    }
};

module.exports = { obtenerInventarioPorSucursal, obtenerAlertasStock };
    