
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../config/coneccionSQLserver");

const verificarToken = async (req, res, next) => {
    const authorization = req.headers.authorization;

    if (
        typeof authorization !== "string" ||
        !authorization.startsWith("Bearer ")
    ) {
        return res.status(401).json({
            mensaje: "Token de autenticación requerido"
        });
    }

    const token = authorization.substring(7).trim();

    if (!token) {
        return res.status(401).json({
            mensaje: "Token de autenticación requerido"
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            mensaje: "La configuración de autenticación no está disponible"
        });
    }

    let decoded;

    // 1. Verificar token
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });

    } catch (error) {
        return res.status(401).json({
            mensaje: "Token inválido o expirado"
        });
    }

    // 2. Validar estructura del payload
    if (
        !decoded ||
        typeof decoded !== "object" ||
        !Number.isInteger(decoded.id_usuario) ||
        decoded.id_usuario <= 0 ||
        !Number.isInteger(decoded.iat) ||
        !Number.isInteger(decoded.exp)
    ) {
        return res.status(401).json({
            mensaje: "Token de autenticación inválido"
        });
    }

    // 3. Verificar estado actual en la base de datos
    try {
        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("id_usuario", sql.Int, decoded.id_usuario)
            .query(`
                SELECT
                    u.id_usuario,
                    u.id_empleado,
                    u.username,
                    u.rol,
                    u.activo AS usuario_activo,
                    e.id_sucursal,
                    e.activo AS empleado_activo,
                    s.estado_sucursal AS sucursal_activa
                FROM dbo.usuarios u
                INNER JOIN dbo.empleados e
                    ON u.id_empleado = e.id_empleado
                INNER JOIN dbo.sucursales s
                    ON e.id_sucursal = s.id_sucursal
                WHERE u.id_usuario = @id_usuario;
            `);

        if (resultado.recordset.length === 0) {
            return res.status(401).json({
                mensaje: "La sesión no es válida"
            });
        }

        const usuario = resultado.recordset[0];

        // 4. Comprobar estados actuales
        if (
            !usuario.usuario_activo ||
            !usuario.empleado_activo ||
            !usuario.sucursal_activa
        ) {
            return res.status(403).json({
                mensaje: "La cuenta, empleado o sucursal se encuentra desactivada"
            });
        }

        // 5. Utilizar exclusivamente datos actuales de SQL Server
        req.user = {
            id_usuario: usuario.id_usuario,
            id_empleado: usuario.id_empleado,
            rol: usuario.rol,
            id_sucursal: usuario.id_sucursal,
            username: usuario.username
        };

        return next();

    } catch (error) {
        next(error);
    }
};

module.exports = { verificarToken };
