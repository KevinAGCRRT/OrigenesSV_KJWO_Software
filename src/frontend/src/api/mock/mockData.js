// Datos de prueba del modo simulado (VITE_USE_MOCK=true).
// Sucursales, insumos, productos, recetas e inventario son los mismos de
// src/backend/BaseDatos/Seed_Restaurante.sql, para que el POS se vea igual con o sin backend.
import { hoyALas } from './db.js'

export const sucursales = [
  { id_sucursal: 1, nombre: 'Orígenes Escalón', direccion: 'Paseo General Escalón #4512, San Salvador', telefono: '2263-1101', estado_sucursal: true },
  { id_sucursal: 2, nombre: 'Orígenes Santa Elena', direccion: 'Blvd. Orden de Malta, Plaza Madero, Antiguo Cuscatlán', telefono: '2248-2202', estado_sucursal: true },
  { id_sucursal: 3, nombre: 'Orígenes San Benito', direccion: 'Av. La Revolución #215, Col. San Benito, San Salvador', telefono: '2275-3303', estado_sucursal: true }
]

export const usuarios = [
  { id: 1, id_empleado: 1, nombre: 'Andrea Martínez', username: 'gerente', correo: 'gerente@origenes.sv', password: '1234', rol: 'gerente', sucursal_id: 1, sucursal: 'Orígenes Escalón' },
  { id: 2, id_empleado: 2, nombre: 'Carlos Rivas', username: 'cajero', correo: 'cajero@origenes.sv', password: '1234', rol: 'cajero', sucursal_id: 1, sucursal: 'Orígenes Escalón' },
  { id: 3, id_empleado: 3, nombre: 'Sofía Hernández', username: 'barista', correo: 'barista@origenes.sv', password: '1234', rol: 'barista', sucursal_id: 1, sucursal: 'Orígenes Escalón' }
]

// [id_insumo, nombre, unidad_medida, es_reventa, stock_minimo, precio_unitario]
export const insumos = [
  [1, 'Café de Especialidad Salvadoreño (Grano)', 'gramos', false, 2000, 0.03],
  [2, 'Leche Entera', 'ml', false, 5000, 0.01],
  [3, 'Vaso Desechable 16oz', 'unidades', false, 100, 0.15],
  [4, 'Vaso Desechable 12oz', 'unidades', false, 100, 0.12],
  [5, 'Tapadera Plástica Café', 'unidades', false, 150, 0.08],
  [6, 'Viñeta / Manga Térmica', 'unidades', false, 150, 0.05],
  [7, 'Jarabe de Vainilla', 'ml', false, 500, 0.03],
  [8, 'Cacao Orgánico en Polvo', 'gramos', false, 300, 0.04],
  [9, 'Semilla de Morro y Especias (Horchata)', 'gramos', false, 1500, 0.02],
  [10, 'Elote Amarillo Desgranado', 'gramos', false, 3000, 0.01],
  [11, 'Canela en Raja y Molida', 'gramos', false, 200, 0.04],
  [12, 'Masa de Maíz Nixtamalizado', 'gramos', false, 5000, 0.01],
  [13, 'Quesillo Especial para Pupusas', 'gramos', false, 4000, 0.01],
  [14, 'Chicharrón Molido Preparado', 'gramos', false, 3000, 0.01],
  [15, 'Frijoles Molidos Refritos', 'gramos', false, 3000, 0.01],
  [16, 'Flor de Loroco Fresca', 'gramos', false, 800, 0.02],
  [17, 'Repollo Curtido y Salsa de Tomate', 'gramos', false, 4000, 0.01],
  [18, 'Yuca Fresca Pelada', 'gramos', false, 4000, 0.01],
  [19, 'Chicharrón en Trozos y Pepescas', 'gramos', false, 1500, 0.02],
  [20, 'Plátano Maduro', 'gramos', false, 3000, 0.01],
  [21, 'Poleada / Manjar de Leche', 'gramos', false, 1500, 0.01],
  [22, 'Azúcar Blanca', 'gramos', false, 2000, 0.01],
  [23, 'Carne de Res (Lomo para Asar)', 'gramos', false, 3000, 0.02],
  [24, 'Pechuga de Pollo', 'gramos', false, 3000, 0.02],
  [25, 'Lomo / Costilla de Cerdo', 'gramos', false, 3000, 0.02],
  [26, 'Arroz Precocido (para Casamiento)', 'gramos', false, 3000, 0.01],
  [27, 'Queso Duro Blanco y Crema', 'gramos', false, 1500, 0.02],
  [28, 'Aguacate Hass y Chimol', 'gramos', false, 2000, 0.01],
  [29, 'Bolsa Café Tostado Salvadoreño 340g', 'unidades', true, 10, 6.5],
  [30, 'Botella Agua Pura 600ml', 'unidades', true, 24, 0.4],
  [31, 'Quesadilla Salvadoreña Empacada', 'unidades', true, 15, 1.25],
  [32, 'Semita Alta de Piña Empacada', 'unidades', true, 15, 1.15]
].map(([id_insumo, nombre, unidad_medida, es_reventa, stock_minimo, precio_unitario]) => ({
  id_insumo,
  nombre,
  unidad_medida,
  es_reventa,
  stock_minimo,
  precio_unitario
}))

// [id_insumo, cantidad_requerida] de cada producto elaborado
const recetas = {
  1: [[1, 18], [4, 1], [5, 1], [6, 1]],
  2: [[1, 18], [2, 180], [4, 1], [5, 1], [6, 1], [8, 3]],
  3: [[1, 18], [2, 230], [7, 20], [3, 1], [5, 1], [6, 1]],
  4: [[1, 18], [2, 250], [3, 1], [5, 1], [6, 1]],
  5: [[9, 45], [2, 150], [22, 25], [11, 2], [3, 1], [5, 1]],
  6: [[10, 140], [2, 180], [22, 20], [11, 3], [4, 1], [5, 1], [6, 1]],
  7: [[12, 110], [13, 45], [14, 40], [15, 30], [17, 60]],
  8: [[12, 110], [13, 65], [16, 20], [17, 60]],
  9: [[12, 110], [13, 50], [15, 55], [17, 60]],
  10: [[12, 110], [13, 50], [14, 55], [17, 60]],
  11: [[18, 250], [19, 90], [17, 80]],
  12: [[18, 250], [19, 60], [17, 80]],
  13: [[20, 220], [21, 90], [22, 20], [11, 2]],
  14: [[20, 220], [15, 90], [22, 20]],
  15: [[23, 220], [26, 120], [15, 80], [20, 80], [27, 45], [28, 70], [12, 90]],
  16: [[24, 220], [26, 120], [15, 80], [20, 80], [27, 45], [28, 70], [12, 90]],
  17: [[25, 240], [26, 120], [15, 80], [20, 80], [27, 45], [28, 70], [12, 90]]
}

// Misma forma que GET /api/productos: { id_producto, nombre, precio_venta, es_elaborado, id_insumo_reventa, receta }
export const productos = [
  [1, 'Café Americano 12oz', 2.50, true, null],
  [2, 'Capuchino Clásico 12oz', 3.50, true, null],
  [3, 'Vainilla Latte 16oz', 4.25, true, null],
  [4, 'Latte Grande 16oz', 3.75, true, null],
  [5, 'Horchata de Morro Artesanal 16oz', 2.25, true, null],
  [6, 'Atol de Elote Caliente 12oz', 2.00, true, null],
  [7, 'Pupusa Revuelta (Maíz)', 1.25, true, null],
  [8, 'Pupusa de Queso con Loroco', 1.35, true, null],
  [9, 'Pupusa de Frijol con Queso', 1.15, true, null],
  [10, 'Pupusa de Chicharrón con Queso', 1.35, true, null],
  [11, 'Yuca Frita con Chicharrón y Pepescas', 4.50, true, null],
  [12, 'Yuca Sancochada Tradicional', 3.75, true, null],
  [13, 'Empanadas de Leche (Orden de 3)', 2.25, true, null],
  [14, 'Empanadas de Frijol (Orden de 3)', 2.25, true, null],
  [15, 'Platillo Típico de Carne Asada', 8.50, true, null],
  [16, 'Platillo Típico de Pollo a la Plancha', 7.50, true, null],
  [17, 'Platillo Típico de Costilla de Cerdo', 8.00, true, null],
  [18, 'Bolsa Café de Especialidad 340g', 12.00, false, 29],
  [19, 'Agua Pura Embotellada 600ml', 1.25, false, 30],
  [20, 'Quesadilla Salvadoreña Empacada', 2.25, false, 31],
  [21, 'Semita Alta de Piña Empacada', 2.00, false, 32]
].map(([id_producto, nombre, precio_venta, es_elaborado, id_insumo_reventa]) => ({
  id_producto,
  nombre,
  precio_venta,
  es_elaborado,
  id_insumo_reventa,
  receta: (recetas[id_producto] || []).map(([id_insumo, cantidad_requerida]) => {
    const insumo = insumos.find((i) => i.id_insumo === id_insumo)
    return { id_producto, id_insumo, insumo: insumo.nombre, cantidad_requerida, unidad_medida: insumo.unidad_medida }
  })
}))

// Igual que el seed: cuatro veces el stock mínimo, salvo algunos insumos que empiezan bajos
const STOCK_INICIAL = {
  '1-3': 45,
  '1-16': 350,
  '1-29': 4,
  '2-1': 1200,
  '2-13': 1800
}

export const inventario = sucursales.flatMap((s) =>
  insumos.map((i) => ({
    id_sucursal: s.id_sucursal,
    id_insumo: i.id_insumo,
    stock_actual: STOCK_INICIAL[`${s.id_sucursal}-${i.id_insumo}`] ?? i.stock_minimo * 4
  }))
)

// fechas de hoy para que aparezcan con el filtro por defecto de Facturas.
export const ventas = [
  {
    id: 1,
    correlativo: 'FCF-000001',
    tipo_documento: 'FCF',
    fecha: hoyALas(8, 15),
    estado: 'emitida',
    sucursal: 'Orígenes Escalón',
    cajero: 'Carlos Rivas',
    cajero_id: 2,
    sucursal_id: 1,
    id_caja: 1,
    metodo_pago: 'efectivo',
    monto_recibido: 10,
    cambio: 2.65,
    cliente: { nombre: 'Consumidor final' },
    detalle: [
      { producto_id: 1, nombre: 'Café Americano 12oz', cantidad: 1, precio_unitario: 2.5, total: 2.5 },
      { producto_id: 6, nombre: 'Atol de Elote Caliente 12oz', cantidad: 1, precio_unitario: 2.0, total: 2.0 },
      { producto_id: 21, nombre: 'Semita Alta de Piña Empacada', cantidad: 1, precio_unitario: 2.0, total: 2.0 }
    ],
    subtotal: 6.5,
    iva: 0.85,
    total: 7.35
  },
  {
    id: 2,
    correlativo: 'CCF-000001',
    tipo_documento: 'CCF',
    fecha: hoyALas(9, 40),
    estado: 'emitida',
    sucursal: 'Orígenes Escalón',
    cajero: 'Carlos Rivas',
    cajero_id: 2,
    sucursal_id: 1,
    id_caja: 1,
    metodo_pago: 'tarjeta',
    monto_recibido: 17.52,
    cambio: 0,
    cliente: {
      nombre: 'Distribuidora El Volcán, S.A. de C.V.',
      nit: '0614-120395-102-3',
      nrc: '123456-7',
      giro: 'Venta al por mayor de alimentos',
      direccion: 'Blvd. Los Próceres, San Salvador'
    },
    detalle: [
      { producto_id: 2, nombre: 'Capuchino Clásico 12oz', cantidad: 2, precio_unitario: 3.5, total: 7.0 },
      { producto_id: 15, nombre: 'Platillo Típico de Carne Asada', cantidad: 1, precio_unitario: 8.5, total: 8.5 }
    ],
    subtotal: 15.5,
    iva: 2.02,
    total: 17.52
  },
  {
    id: 3,
    correlativo: 'FCF-000002',
    tipo_documento: 'FCF',
    fecha: hoyALas(10, 5),
    estado: 'anulada',
    motivo_anulacion: 'El cliente canceló el pedido antes de prepararlo',
    sucursal: 'Orígenes Escalón',
    cajero: 'Carlos Rivas',
    cajero_id: 2,
    sucursal_id: 1,
    id_caja: 1,
    metodo_pago: 'bitcoin',
    monto_recibido: 4.8,
    cambio: 0,
    cliente: { nombre: 'Consumidor final' },
    detalle: [{ producto_id: 3, nombre: 'Vainilla Latte 16oz', cantidad: 1, precio_unitario: 4.25, total: 4.25 }],
    subtotal: 4.25,
    iva: 0.55,
    total: 4.8
  }
]
