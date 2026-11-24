
const { sql } = require("../config/coneccionSQLserver");

async function incrementarInventarioPorCompra(
    transaction,
    idSucursal,
    itemsComprados,
    referenciaId
) {
    if (!itemsComprados || itemsComprados.length === 0) {
        throw new Error("La compra no contiene insumos.");
    }

    for (const item of itemsComprados) {
        const idInsumo = Number(item.id_insumo);
        const cantidad = Number(item.cantidad);

        if (
            !Number.isInteger(idInsumo) ||
            idInsumo <= 0 ||
            !Number.isFinite(cantidad) ||
            cantidad <= 0
        ) {
            throw new Error("Los datos del insumo o su cantidad son inválidos.");
        }

        const request = new sql.Request(transaction);

        await request
            .input("id_sucursal", sql.Int, idSucursal)
            .input("id_insumo", sql.Int, idInsumo)
            .input("cantidad", sql.Decimal(12, 2), cantidad)
            .input("referencia_id", sql.Int, referenciaId)
            .query(`
                IF EXISTS (
                    SELECT 1
                    FROM dbo.inventario_sucursal WITH (UPDLOCK, HOLDLOCK)
                    WHERE id_sucursal = @id_sucursal
                      AND id_insumo = @id_insumo
                )
                BEGIN
                    UPDATE dbo.inventario_sucursal
                    SET stock_actual = stock_actual + @cantidad
                    WHERE id_sucursal = @id_sucursal
                      AND id_insumo = @id_insumo;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.inventario_sucursal
                        (id_sucursal, id_insumo, stock_actual)
                    VALUES
                        (@id_sucursal, @id_insumo, @cantidad);
                END;

                INSERT INTO dbo.movimientos_inventario
                    (id_sucursal, id_insumo, tipo_movimiento,
                     cantidad, fecha, referencia_id)
                VALUES
                    (@id_sucursal, @id_insumo, 'ENTRADA_COMPRA',
                     @cantidad, SYSDATETIME(), @referencia_id);
            `);
    }

    return { success: true };
}

module.exports = { incrementarInventarioPorCompra };
