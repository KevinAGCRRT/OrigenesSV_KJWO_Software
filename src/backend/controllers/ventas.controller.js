
const {
    registrarVenta,
    consultarVentas,
    consultarVentaPorId,
    anularVentaRegistrada
} = require("../services/ventas.service");

// Registrar venta
async function crearVenta(req, res) {
    try {
        const { id_sucursal, tipo_documento, productos } = req.body;

        if (!Number.isInteger(id_sucursal) || id_sucursal <= 0) {
            return res.status(400).json({
                mensaje: "Sucursal inválida"
            });
        }

        if (!["FCF", "CCF"].includes(tipo_documento)) {
            return res.status(400).json({
                mensaje: "Tipo de documento inválido"
            });
        }

        if (!Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({
                mensaje: "La venta debe contener productos"
            });
        }

        for (const producto of productos) {
            if (
                !Number.isInteger(producto?.id_producto) ||
                producto.id_producto <= 0 ||
                !Number.isInteger(producto?.cantidad) ||
                producto.cantidad <= 0
            ) {
                return res.status(400).json({
                    mensaje: "Producto o cantidad inválida"
                });
            }
        }

        const venta = await registrarVenta({
            id_sucursal,
            tipo_documento,
            productos
        });

        return res.status(201).json({
            mensaje: "Venta registrada correctamente",
            venta
        });

    } catch (error) {
        return res.status(error.status || 500).json({
            mensaje: error.message
        });
    }
}

// Listar ventas
async function obtenerVentas(req, res) {
    try {
        const ventas = await consultarVentas();

        return res.status(200).json(ventas);

    } catch (error) {
        return res.status(error.status || 500).json({
            mensaje: error.message
        });
    }
}

// Consultar una venta específica
async function obtenerVentaPorId(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "ID de venta inválido"
            });
        }

        const venta = await consultarVentaPorId(id);

        return res.status(200).json(venta);

    } catch (error) {
        return res.status(error.status || 500).json({
            mensaje: error.message
        });
    }
}

// Anular una venta
async function anularVenta(req, res) {
    try {
        const id = Number(req.params.id);
        const { reintegrarInventario } = req.body || {};

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "ID de venta inválido"
            });
        }

        if (typeof reintegrarInventario !== "boolean") {
            return res.status(400).json({
                mensaje: "Debe indicar si se reintegra el inventario"
            });
        }

        const resultado = await anularVentaRegistrada(
            id,
            reintegrarInventario
        );

        return res.status(200).json({
            mensaje: "Venta anulada correctamente",
            venta: resultado
        });

    } catch (error) {
        return res.status(error.status || 500).json({
            mensaje: error.message
        });
    }
}

module.exports = {
    crearVenta,
    obtenerVentas,
    obtenerVentaPorId,
    anularVenta
};
