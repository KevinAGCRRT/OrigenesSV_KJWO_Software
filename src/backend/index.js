
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const inventarioRoutes = require("./routes/inventario.routes");
const productosRoutes = require("./routes/producto.routes");
const insumosRoutes = require("./routes/insumos.routes");

dotenv.config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas principales
app.use("/api/inventario", inventarioRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/insumos", insumosRoutes);

// Ruta de comprobación
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "API Restaurante Orígenes SV funcionando"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor Orígenes SV corriendo en http://localhost:${PORT}`);
});

module.exports = app;
