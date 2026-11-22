import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import inventarioRoutes from "./routes/inventario.routes.js";
import productosRoutes from "./routes/productos.routes.js";
import insumosRoutes from "./routes/insumos.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rutas del módulo de Inventario, Productos e Insumos
app.use("/api/inventario", inventarioRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/insumos", insumosRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Orígenes SV corriendo en http://localhost:${PORT}`);
});