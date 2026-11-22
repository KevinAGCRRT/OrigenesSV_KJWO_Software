import { Router } from "express";
import { obtenerInventarioPorSucursal, obtenerAlertasStock } from "../controllers/inventario.controller.js";

const router = Router();

router.get("/:idSucursal", obtenerInventarioPorSucursal);
router.get("/:idSucursal/alertas", obtenerAlertasStock);

export default router;