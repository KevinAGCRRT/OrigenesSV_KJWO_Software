const express = require("express");
const router = express.Router();

const { verificarToken } = require("../middlewares/auth.middleware");
const { autorizarRoles } = require("../middlewares/roles.middleware");

const {
    listarEmpleados,
    consultarEmpleado,
    crearEmpleado,
    actualizarEmpleado,
    desactivarEmpleado
} = require("../controllers/empleados.controller");

// Todas las rutas de empleados requieren autenticación.
router.use(verificarToken);

// Solo gerentes pueden administrar empleados.
router.use(autorizarRoles("gerente"));

// CRUD de empleados
router.get("/", listarEmpleados);
router.get("/:id", consultarEmpleado);
router.post("/", crearEmpleado);
router.put("/:id", actualizarEmpleado);
router.patch("/:id/desactivar", desactivarEmpleado);

module.exports = router;