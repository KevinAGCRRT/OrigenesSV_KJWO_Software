const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../config/coneccionSQLserver");

const iniciarSesion = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Validar datos recibidos
        if (!username || !password) {
            return res.status(400).json({
                mensaje: "El usuario y la contraseña son obligatorios"
            });
        }

        // Buscar usuario y datos del empleado
        const pool = await poolPromise;

        const resultado = await pool.request()
            .input("username", sql.VarChar(50), username.trim())
            .query(`
                SELECT
                    u.id_usuario,
                    u.id_empleado,
                    u.username,
                    u.password_hash,
                    u.rol,
                    u.activo AS usuario_activo,
                    e.nombre,
                    e.apellido,
                    e.id_sucursal,
                    e.activo AS empleado_activo
                FROM usuarios u
                INNER JOIN empleados e
                    ON u.id_empleado = e.id_empleado
                WHERE u.username = @username
            `);

        if (resultado.recordset.length === 0) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        const usuario = resultado.recordset[0];

        // Comprobar estado de las cuentas
        if (!usuario.usuario_activo || !usuario.empleado_activo) {
            return res.status(403).json({
                mensaje: "La cuenta se encuentra desactivada"
            });
        }

        // Verificar contraseña con bcrypt
        const passwordValida = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordValida) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        // Verificar configuración JWT
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                mensaje: "La configuración de autenticación no está disponible"
            });
        }

        // Generar token
        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                id_empleado: usuario.id_empleado,
                rol: usuario.rol,
                id_sucursal: usuario.id_sucursal
            },
            process.env.JWT_SECRET,
            {
                algorithm: "HS256",
                expiresIn: "8h"
            }
        );

        return res.status(200).json({
            mensaje: "Inicio de sesión exitoso",
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                id_empleado: usuario.id_empleado,
                username: usuario.username,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                rol: usuario.rol,
                id_sucursal: usuario.id_sucursal
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    iniciarSesion
};
