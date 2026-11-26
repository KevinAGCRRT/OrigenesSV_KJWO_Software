
const { Router } = require("express");

const {
    obtenerMenuConRecetas,
    crearProductoConReceta
} = require("../controllers/productos.controller");

const { verificarToken } = require("../middlewares/auth.middleware");
const { autorizarRoles } = require("../middlewares/roles.middleware");

const router = Router();

router.use(verificarToken);

// Consulta de productos
router.get("/", autorizarRoles("gerente", "cajero"), obtenerMenuConRecetas);

// Creación de productos
router.post("/", autorizarRoles("gerente"), crearProductoConReceta);

module.exports = router;
