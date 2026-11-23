const { Router } = require("express");

const {
    obtenerInventarioGeneral,
    obtenerInventarioPorSucursal,
    obtenerAlertasStock
} = require("../controllers/inventario.controllers");

const router = Router();

// Inventario de todas las sucursales
router.get("/", obtenerInventarioGeneral);

// Inventario por sucursal
router.get("/:idSucursal", obtenerInventarioPorSucursal);

// Alertas de stock por sucursal
router.get("/:idSucursal/alertas", obtenerAlertasStock);

module.exports = router;
