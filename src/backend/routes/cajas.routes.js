
const { Router } = require("express");

const {
    abrirCaja,
    registrarMovimiento,
    consultarCaja,
    cerrarCaja
} = require("../controllers/caja.controller");

const { verificarToken } = require("../middlewares/auth.middleware");
const { autorizarRoles } = require("../middlewares/roles.middleware");

const router = Router();

router.use(verificarToken);
router.use(autorizarRoles("gerente", "cajero"));

router.post("/abrir", abrirCaja);
router.post("/:id/movimientos", registrarMovimiento);
router.get("/:id", consultarCaja);
router.post("/:id/cerrar", cerrarCaja);

module.exports = router;
