
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const inventarioRoutes = require("./routes/inventario.routes");
const productosRoutes = require("./routes/producto.routes");
const insumosRoutes = require("./routes/insumos.routes");
const authRoutes = require("./routes/auth.routes");
const proveedoresRoutes = require("./routes/proveedores.routes");
const comprasRoutes = require("./routes/compras.routes");
const ventasRoutes = require("./routes/ventas.routes");
const cajaRoutes = require("./routes/cajas.routes");
const empleadosRoutes = require("./routes/empleados.routes");
const nominaRoutes = require("./routes/nomina.routes");

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Ruta de comprobacion
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "API Restaurante Origenes SV funcionando"
    });
});

// Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/insumos", insumosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/compras", comprasRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/cajas", cajaRoutes);
app.use("/api/empleados", empleadosRoutes);
app.use("/api/nomina", nominaRoutes);

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        mensaje: "La ruta solicitada no existe"
    });
});

// Manejo global de errores
app.use((error, req, res, next) => {
    console.error("Error en el servidor:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(error.status || 500).json({
        mensaje: error.status
            ? error.message
            : "Error interno del servidor"
    });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor Origenes SV corriendo en http://localhost:${PORT}`);
    });
}

module.exports = app;
