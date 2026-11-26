
const { Router } = require("express");

const {
    obtenerInventarioGeneral,
    obtenerInventarioPorSucursal,
    obtenerAlertasStock
} = require("../controllers/inventario.controllers");

const { verificarToken } = require("../middlewares/auth.middleware");
const { autorizarRoles } = require("../middlewares/roles.middleware");

const router = Router();

// Toda consulta requiere autenticación.
router.use(verificarToken);
router.use(autorizarRoles("gerente", "cajero"));

router.get("/", obtenerInventarioGeneral);
router.get("/:idSucursal", obtenerInventarioPorSucursal);
router.get("/:idSucursal/alertas", obtenerAlertasStock);

module.exports = router;
