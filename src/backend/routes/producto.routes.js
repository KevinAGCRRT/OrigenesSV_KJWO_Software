
const { Router } = require("express");

const {
    obtenerMenuConRecetas,
    crearProductoConReceta
} = require("../controllers/productos.controller");

const router = Router();

router.get("/", obtenerMenuConRecetas);
router.post("/", crearProductoConReceta);

module.exports = router;
