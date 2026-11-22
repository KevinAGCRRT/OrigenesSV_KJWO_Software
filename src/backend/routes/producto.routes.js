import { Router } from "express";
import { obtenerMenuConRecetas, crearProductoConReceta } from "../controllers/productos.controller.js";

const router = Router();

router.get("/", obtenerMenuConRecetas);
router.post("/", crearProductoConReceta);

export default router;