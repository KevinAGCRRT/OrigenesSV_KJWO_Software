import { Router } from "express";
import { obtenerInsumos, crearInsumo } from "../controllers/insumos.controller.js";

const router = Router();

router.get("/", obtenerInsumos);
router.post("/", crearInsumo);

export default router;