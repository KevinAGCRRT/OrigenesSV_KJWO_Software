const { Router } = require("express");

const {
    crearVenta,
    obtenerVentas,
    obtenerVentaPorId,
    anularVenta
} = require("../controllers/ventas.controller");

const router = Router();

router.post("/", crearVenta);
router.get("/", obtenerVentas);
router.get("/:id", obtenerVentaPorId);
router.patch("/:id/anular", anularVenta);

module.exports = router;