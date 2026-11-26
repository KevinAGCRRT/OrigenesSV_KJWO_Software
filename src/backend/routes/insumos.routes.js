
const { Router } = require("express");

const {
    obtenerInsumos,
    crearInsumo
} = require("../controllers/insumos.controller");

const { verificarToken } = require("../middlewares/auth.middleware");
const { autorizarRoles } = require("../middlewares/roles.middleware");

const router = Router();

router.use(verificarToken);
router.use(autorizarRoles("gerente"));

router.get("/", obtenerInsumos);
router.post("/", crearInsumo);

module.exports = router;
