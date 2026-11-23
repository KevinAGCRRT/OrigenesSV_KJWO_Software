const { Router } = require("express");
const { iniciarSesion } = require("../controllers/auth.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = Router();

// Inicio de sesion publico
router.post("/login", iniciarSesion);

// Perfil protegido mediante JWT
router.get("/perfil", verificarToken, (req, res) => {
    res.status(200).json({
        mensaje: "Token valido",
        usuario: req.user
    });
});

module.exports = router;