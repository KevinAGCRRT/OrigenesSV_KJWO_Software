const { Router } = require("express");

const {
    obtenerInsumos,
    crearInsumo
} = require("../controllers/insumos.controller");

const router = Router();

router.get("/", obtenerInsumos);
router.post("/", crearInsumo);

module.exports = router;
