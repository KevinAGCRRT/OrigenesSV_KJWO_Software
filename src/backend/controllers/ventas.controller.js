const {
  registrarVenta,
  consultarVentas,
  consultarVentaPorId,
  anularVentaRegistrada
} = require("../services/ventas.service");

const METODOS_PAGO = [
  "EFECTIVO",
  "TARJETA",
  "BITCOIN",
  "CHIVO_WALLET"
];

function validarProductos(productos) {
  if (
    !Array.isArray(productos) ||
    productos.length < 1 ||
    productos.length > 100
  ) {
    return "La venta debe contener entre 1 y 100 productos";
  }

  for (const p of productos) {
    if (
      !p ||
      !Number.isInteger(p.id_producto) ||
      p.id_producto <= 0 ||
      !Number.isInteger(p.cantidad) ||
      p.cantidad <= 0 ||
      p.cantidad > 10000
    ) {
      return "Producto o cantidad inválida";
    }
  }

  return null;
}

function validarUsuario(req) {
  const usuario = req.user;

  if (
    !usuario ||
    !Number.isInteger(usuario.id_usuario) ||
    !Number.isInteger(usuario.id_empleado) ||
    !Number.isInteger(usuario.id_sucursal) ||
    !["gerente", "cajero"].includes(usuario.rol)
  ) {
    return false;
  }

  return true;
}

function responderError(res, error, mensajeGenerico) {
  return res.status(error.status || 500).json({
    mensaje: error.status
      ? error.message
      : mensajeGenerico
  });
}

/**
 * Registrar venta.
 */
async function crearVenta(req, res) {
  try {
    if (!validarUsuario(req)) {
      return res.status(401).json({
        mensaje: "Usuario autenticado inválido"
      });
    }

    const {
      tipo_documento,
      productos,
      metodo_pago
    } = req.body || {};

    // 1. Validar documento.
    if (!["FCF", "CCF"].includes(tipo_documento)) {
      return res.status(400).json({
        mensaje: "Tipo de documento inválido"
      });
    }

    // 2. Validar productos.
    const errorProductos = validarProductos(productos);

    if (errorProductos) {
      return res.status(400).json({
        mensaje: errorProductos
      });
    }

    // 3. Validar método de pago.
    if (!METODOS_PAGO.includes(metodo_pago)) {
      return res.status(400).json({
        mensaje: "Método de pago inválido"
      });
    }

    // 4. Validar idempotencia.
    const idempotencia = req.headers["idempotency-key"];

    if (
      typeof idempotencia !== "string" ||
      idempotencia.trim().length < 16 ||
      idempotencia.trim().length > 100
    ) {
      return res.status(400).json({
        mensaje: "Se requiere una llave de idempotencia válida"
      });
    }

    // 5. Registrar.
    const venta = await registrarVenta({
      usuario: req.user,
      tipo_documento,
      productos,
      metodo_pago,
      idempotencia: idempotencia.trim()
    });

    return res.status(venta.repetida ? 200 : 201).json({
      mensaje: venta.repetida
        ? "Solicitud previamente procesada"
        : "Venta registrada correctamente",
      venta
    });

  } catch (e) {
    return responderError(
      res,
      e,
      "Error interno al registrar la venta"
    );
  }
}

/**
 * Consultar ventas de la sucursal del usuario.
 */
async function obtenerVentas(req, res) {
  try {
    if (!validarUsuario(req)) {
      return res.status(401).json({
        mensaje: "Usuario autenticado inválido"
      });
    }

    const ventas = await consultarVentas({
      id_sucursal: req.user.id_sucursal,
      rol: req.user.rol
    });

    return res.status(200).json(ventas);

  } catch (e) {
    return responderError(
      res,
      e,
      "Error al consultar las ventas"
    );
  }
}

/**
 * Consultar una venta por ID.
 */
async function obtenerVentaPorId(req, res) {
  try {
    if (!validarUsuario(req)) {
      return res.status(401).json({
        mensaje: "Usuario autenticado inválido"
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "ID de venta inválido"
      });
    }

    const venta = await consultarVentaPorId(id, {
      id_sucursal: req.user.id_sucursal,
      rol: req.user.rol
    });

    return res.status(200).json(venta);

  } catch (e) {
    return responderError(
      res,
      e,
      "Error al consultar la venta"
    );
  }
}

/**
 * Anular venta.
 */
async function anularVenta(req, res) {
  try {
    if (!validarUsuario(req)) {
      return res.status(401).json({
        mensaje: "Usuario autenticado inválido"
      });
    }

    const id = Number(req.params.id);
    const { reintegrarInventario } = req.body || {};

    // 1. Validar ID.
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: "ID de venta inválido"
      });
    }

    // 2. Validar decisión de reintegro.
    if (typeof reintegrarInventario !== "boolean") {
      return res.status(400).json({
        mensaje: "Debe indicar si se reintegra el inventario"
      });
    }

    // 3. Ejecutar anulación con identidad autenticada.
    const resultado = await anularVentaRegistrada(
      id,
      reintegrarInventario,
      req.user
    );

    return res.status(200).json({
      mensaje: "Venta anulada correctamente",
      venta: resultado
    });

  } catch (e) {
    return responderError(
      res,
      e,
      "Error al anular la venta"
    );
  }
}

module.exports = {
  crearVenta,
  obtenerVentas,
  obtenerVentaPorId,
  anularVenta
};