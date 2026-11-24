
const { Router } = require("express");

const {
    registrarCompra,
    obtenerCompras,
    registrarAbono,
    obtenerCuentasPorPagar
} = require("../controllers/compras.controller");

const { verificarToken } = require("../middlewares/auth.middleware");
const { autorizarRoles } = require("../middlewares/roles.middleware");


const router = Router();

router.use(verificarToken);
router.use(autorizarRoles("gerente"));
router.get("/cuentas-por-pagar", obtenerCuentasPorPagar);
router.get("/", obtenerCompras);
router.post("/", registrarCompra);
router.post("/abonos", registrarAbono);

module.exports = router;
