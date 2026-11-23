
const sql = require("mssql");
const dotenv = require("dotenv");

dotenv.config();

const connectionSettings = {
    server: process.env.DB_SERVER || "localhost",
    port: Number(process.env.DB_PORT || 1434),
    database: process.env.DB_DATABASE || "bd_restaurante",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Crear un único pool de conexión para todo el backend
const poolPromise = new sql.ConnectionPool(connectionSettings)
    .connect()
    .then(pool => {
        console.log("Conexión a SQL Server establecida correctamente");
        return pool;
    })
    .catch(error => {
        console.error("Error al conectar con SQL Server:", error.message);
        throw error;
    });

// Función compatible con módulos que necesiten obtener la conexión
const getConnection = () => poolPromise;

module.exports = {
    sql,
    poolPromise,
    getConnection
};
