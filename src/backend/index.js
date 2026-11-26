
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

// CORS
const origins = (
    process.env.FRONTEND_ORIGINS ||
    "http://localhost:5173,http://127.0.0.1:5173"
)
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Permite solicitudes sin Origin (por ejemplo, herramientas locales).
        if (!origin || origins.includes(origin)) {
            return callback(null, true);
        }

        const error = new Error("Origen no autorizado por CORS");
        error.status = 403;
        return callback(error);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    credentials: false
}));

app.use(express.json({ limit: "100kb" }));

// Limitador por IP
const buckets = new Map();
let requestsSinceCleanup = 0;

const rateLimit = (max = 120, windowMs = 60000) => {
    return (req, res, next) => {
        const key = req.ip || req.socket.remoteAddress || "unknown";
        const now = Date.now();

        let bucket = buckets.get(key);

        if (!bucket || now - bucket.start >= windowMs) {
            bucket = { start: now, count: 0 };
        }

        bucket.count++;
        buckets.set(key, bucket);

        // Limpieza periódica de registros expirados.
        requestsSinceCleanup++;

        if (requestsSinceCleanup >= 500) {
            requestsSinceCleanup = 0;

            for (const [ip, data] of buckets.entries()) {
                if (now - data.start >= windowMs) {
                    buckets.delete(ip);
                }
            }
        }

        if (bucket.count > max) {
            return res.status(429).json({
                mensaje: "Demasiadas solicitudes. Intente nuevamente más tarde."
            });
        }

        next();
    };
};

// Limitador general y específico de autenticación.
app.use(rateLimit(120, 60000));
app.use("/api/auth", rateLimit(12, 60000));

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "API Restaurante Orígenes SV funcionando"
    });
});

// Rutas
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

// Manejo centralizado de errores
app.use((error, req, res, next) => {
    console.error("Error en el servidor:", error);

    if (res.headersSent) {
        return next(error);
    }

    const status = error.status || 500;

    res.status(status).json({
        mensaje: status >= 500
            ? "Error interno del servidor"
            : error.message
    });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(
            `Servidor Orígenes SV corriendo en http://localhost:${PORT}`
        );
    });
}

module.exports = app;
