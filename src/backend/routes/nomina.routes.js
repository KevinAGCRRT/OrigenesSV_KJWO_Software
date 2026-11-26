const express = require("express");
const router = express.Router();

const { verificarToken } = require("../middlewares/auth.middleware");
const { autorizarRoles } = require("../middlewares/roles.middleware");

const {
    listarNominas,
    consultarNomina,
    crearNomina,
    pagarNomina
} = require("../controllers/nomina.controller");

router.use(verificarToken);
router.use(autorizarRoles("gerente"));

router.get("/", listarNominas);
router.get("/:id", consultarNomina);
router.post("/", crearNomina);
router.patch("/:id/pagar", pagarNomina);

module.exports = router;