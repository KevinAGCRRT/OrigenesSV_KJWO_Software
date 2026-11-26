
    const { Router } = require("express");

    const {
        crearVenta,
        obtenerVentas,
        obtenerVentaPorId,
        anularVenta
    } = require("../controllers/ventas.controller");

    const { verificarToken } = require("../middlewares/auth.middleware");
    const { autorizarRoles } = require("../middlewares/roles.middleware");

    const router = Router();

    router.use(verificarToken);
    router.use(autorizarRoles("gerente", "cajero"));

    router.post("/", crearVenta);
    router.get("/", obtenerVentas);
    router.get("/:id", obtenerVentaPorId);
    router.patch("/:id/anular", anularVenta);

    module.exports = router;
