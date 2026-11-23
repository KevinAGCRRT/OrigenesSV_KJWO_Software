
const { Router } = require("express");

const {
    obtenerProveedores,
    obtenerProveedorPorId,
    crearProveedor,
    actualizarProveedor,
    cambiarEstadoProveedor
} = require("../controllers/proveedores.controller");

const { verificarToken } = require("../middlewares/auth.middleware");
const { autorizarRoles } = require("../middlewares/roles.middleware");

const router = Router();

// Todas las rutas requieren autenticación y rol gerente
router.use(verificarToken);
router.use(autorizarRoles("gerente"));

router.get("/", obtenerProveedores);
router.get("/:id", obtenerProveedorPorId);
router.post("/", crearProveedor);
router.put("/:id", actualizarProveedor);
router.patch("/:id/estado", cambiarEstadoProveedor);

module.exports = router;
