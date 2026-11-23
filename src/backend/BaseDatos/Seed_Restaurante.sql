USE bd_restaurante;
GO

-- ============================================================================
-- 1. SUCURSALES (IDs 1 al 3)
-- ============================================================================
INSERT INTO sucursales (nombre, direccion, telefono, estado_sucursal) VALUES
('Orígenes Escalón', 'Paseo General Escalón #4512, San Salvador', '2263-1101', 1),
('Orígenes Santa Elena', 'Blvd. Orden de Malta, Plaza Madero, Antiguo Cuscatlán', '2248-2202', 1),
('Orígenes San Benito', 'Av. La Revolución #215, Col. San Benito, San Salvador', '2275-3303', 1);

-- ============================================================================
-- 2. CATÁLOGO GLOBAL DE INSUMOS (IDs 1 al 32)
-- ============================================================================
INSERT INTO insumos (nombre, unidad_medida, es_reventa, stock_minimo, precio_unitario) VALUES
-- Cafetería y bebidas tradicionales (IDs 1 - 11)
('Café de Especialidad Salvadoreño (Grano)', 'gramos', 0, 2000.00, 0.03),
('Leche Entera', 'ml', 0, 5000.00, 0.01),
('Vaso Desechable 16oz', 'unidades', 0, 100.00, 0.15),
('Vaso Desechable 12oz', 'unidades', 0, 100.00, 0.12),
('Tapadera Plástica Café', 'unidades', 0, 150.00, 0.08),
('Viñeta / Manga Térmica', 'unidades', 0, 150.00, 0.05),
('Jarabe de Vainilla', 'ml', 0, 500.00, 0.03),
('Cacao Orgánico en Polvo', 'gramos', 0, 300.00, 0.04),
('Semilla de Morro y Especias (Horchata)', 'gramos', 0, 1500.00, 0.02),
('Elote Amarillo Desgranado', 'gramos', 0, 3000.00, 0.01),
('Canela en Raja y Molida', 'gramos', 0, 200.00, 0.04),

-- Pupusas, antojitos y platillos típicos (IDs 12 - 28)
('Masa de Maíz Nixtamalizado', 'gramos', 0, 5000.00, 0.01),
('Quesillo Especial para Pupusas', 'gramos', 0, 4000.00, 0.01),
('Chicharrón Molido Preparado', 'gramos', 0, 3000.00, 0.01),
('Frijoles Molidos Refritos', 'gramos', 0, 3000.00, 0.01),
('Flor de Loroco Fresca', 'gramos', 0, 800.00, 0.02),
('Repollo Curtido y Salsa de Tomate', 'gramos', 0, 4000.00, 0.01),
('Yuca Fresca Pelada', 'gramos', 0, 4000.00, 0.01),
('Chicharrón en Trozos y Pepescas', 'gramos', 0, 1500.00, 0.02),
('Plátano Maduro', 'gramos', 0, 3000.00, 0.01),
('Poleada / Manjar de Leche', 'gramos', 0, 1500.00, 0.01),
('Azúcar Blanca', 'gramos', 0, 2000.00, 0.01),
('Carne de Res (Lomo para Asar)', 'gramos', 0, 3000.00, 0.02),
('Pechuga de Pollo', 'gramos', 0, 3000.00, 0.02),
('Lomo / Costilla de Cerdo', 'gramos', 0, 3000.00, 0.02),
('Arroz Precocido (para Casamiento)', 'gramos', 0, 3000.00, 0.01),
('Queso Duro Blanco y Crema', 'gramos', 0, 1500.00, 0.02),
('Aguacate Hass y Chimol', 'gramos', 0, 2000.00, 0.01),

-- Productos empacados de reventa (IDs 29 - 32)
('Bolsa Café Tostado Salvadoreño 340g', 'unidades', 1, 10.00, 6.50),
('Botella Agua Pura 600ml', 'unidades', 1, 24.00, 0.40),
('Quesadilla Salvadoreña Empacada', 'unidades', 1, 15.00, 1.25),
('Semita Alta de Piña Empacada', 'unidades', 1, 15.00, 1.15);

-- ============================================================================
-- 3. MENÚ DE PRODUCTOS (17 Elaborados + 4 Reventa = 21 Productos)
-- ============================================================================
INSERT INTO productos (nombre, precio_venta, es_elaborado, id_insumo_reventa, activo) VALUES
-- Cafetería y Bebidas Salvadoreñas (IDs 1 - 6)
('Café Americano 12oz', 2.50, 1, NULL, 1),
('Capuchino Clásico 12oz', 3.50, 1, NULL, 1),
('Vainilla Latte 16oz', 4.25, 1, NULL, 1),
('Latte Grande 16oz', 3.75, 1, NULL, 1),
('Horchata de Morro Artesanal 16oz', 2.25, 1, NULL, 1),
('Atol de Elote Caliente 12oz', 2.00, 1, NULL, 1),

-- Pupusas y Antojitos Salvadoreños (IDs 7 - 14)
('Pupusa Revuelta (Maíz)', 1.25, 1, NULL, 1),
('Pupusa de Queso con Loroco', 1.35, 1, NULL, 1),
('Pupusa de Frijol con Queso', 1.15, 1, NULL, 1),
('Pupusa de Chicharrón con Queso', 1.35, 1, NULL, 1),
('Yuca Frita con Chicharrón y Pepescas', 4.50, 1, NULL, 1),
('Yuca Sancochada Tradicional', 3.75, 1, NULL, 1),
('Empanadas de Leche (Orden de 3)', 2.25, 1, NULL, 1),
('Empanadas de Frijol (Orden de 3)', 2.25, 1, NULL, 1),

-- Platillos Típicos Fuertes (IDs 15 - 17)
('Platillo Típico de Carne Asada', 8.50, 1, NULL, 1),
('Platillo Típico de Pollo a la Plancha', 7.50, 1, NULL, 1),
('Platillo Típico de Costilla de Cerdo', 8.00, 1, NULL, 1),

-- Productos Empacados de Reventa (IDs 18 - 21)
('Bolsa Café de Especialidad 340g', 12.00, 0, 29, 1),
('Agua Pura Embotellada 600ml', 1.25, 0, 30, 1),
('Quesadilla Salvadoreña Empacada', 2.25, 0, 31, 1),
('Semita Alta de Piña Empacada', 2.00, 0, 32, 1);

-- ============================================================================
-- 4. RECETAS DE LOS 17 PRODUCTOS ELABORADOS
-- ============================================================================
INSERT INTO recetas (id_producto, id_insumo, cantidad_requerida) VALUES
-- 1. Café Americano 12oz
(1, 1, 18.00), (1, 4, 1.00), (1, 5, 1.00), (1, 6, 1.00),
-- 2. Capuchino Clásico 12oz
(2, 1, 18.00), (2, 2, 180.00), (2, 4, 1.00), (2, 5, 1.00), (2, 6, 1.00), (2, 8, 3.00),
-- 3. Vainilla Latte 16oz
(3, 1, 18.00), (3, 2, 230.00), (3, 7, 20.00), (3, 3, 1.00), (3, 5, 1.00), (3, 6, 1.00),
-- 4. Latte Grande 16oz
(4, 1, 18.00), (4, 2, 250.00), (4, 3, 1.00), (4, 5, 1.00), (4, 6, 1.00),
-- 5. Horchata de Morro Artesanal 16oz
(5, 9, 45.00), (5, 2, 150.00), (5, 22, 25.00), (5, 11, 2.00), (5, 3, 1.00), (5, 5, 1.00),
-- 6. Atol de Elote Caliente 12oz
(6, 10, 140.00), (6, 2, 180.00), (6, 22, 20.00), (6, 11, 3.00), (6, 4, 1.00), (6, 5, 1.00), (6, 6, 1.00),
-- 7. Pupusa Revuelta (Maíz)
(7, 12, 110.00), (7, 13, 45.00), (7, 14, 40.00), (7, 15, 30.00), (7, 17, 60.00),
-- 8. Pupusa de Queso con Loroco
(8, 12, 110.00), (8, 13, 65.00), (8, 16, 20.00), (8, 17, 60.00),
-- 9. Pupusa de Frijol con Queso
(9, 12, 110.00), (9, 13, 50.00), (9, 15, 55.00), (9, 17, 60.00),
-- 10. Pupusa de Chicharrón con Queso
(10, 12, 110.00), (10, 13, 50.00), (10, 14, 55.00), (10, 17, 60.00),
-- 11. Yuca Frita con Chicharrón y Pepescas
(11, 18, 250.00), (11, 19, 90.00), (11, 17, 80.00),
-- 12. Yuca Sancochada Tradicional
(12, 18, 250.00), (12, 19, 60.00), (12, 17, 80.00),
-- 13. Empanadas de Leche (Orden de 3)
(13, 20, 220.00), (13, 21, 90.00), (13, 22, 20.00), (13, 11, 2.00),
-- 14. Empanadas de Frijol (Orden de 3)
(14, 20, 220.00), (14, 15, 90.00), (14, 22, 20.00),
-- 15. Platillo Típico de Carne Asada
(15, 23, 220.00), (15, 26, 120.00), (15, 15, 80.00), (15, 20, 80.00), (15, 27, 45.00), (15, 28, 70.00), (15, 12, 90.00),
-- 16. Platillo Típico de Pollo a la Plancha
(16, 24, 220.00), (16, 26, 120.00), (16, 15, 80.00), (16, 20, 80.00), (16, 27, 45.00), (16, 28, 70.00), (16, 12, 90.00),
-- 17. Platillo Típico de Costilla de Cerdo
(17, 25, 240.00), (17, 26, 120.00), (17, 15, 80.00), (17, 20, 80.00), (17, 27, 45.00), (17, 28, 70.00), (17, 12, 90.00);

-- ============================================================================
-- 5. INVENTARIO POR SUCURSAL (3 sucursales x 32 insumos = 96 registros)
-- ============================================================================
INSERT INTO inventario_sucursal (id_sucursal, id_insumo, stock_actual)
SELECT 
    s.id_sucursal,
    i.id_insumo,
    CASE 
        WHEN s.id_sucursal = 1 AND i.id_insumo = 3 THEN 45.00
        WHEN s.id_sucursal = 1 AND i.id_insumo = 16 THEN 350.00
        WHEN s.id_sucursal = 1 AND i.id_insumo = 29 THEN 4.00
        WHEN s.id_sucursal = 2 AND i.id_insumo = 1 THEN 1200.00
        WHEN s.id_sucursal = 2 AND i.id_insumo = 13 THEN 1800.00
        ELSE i.stock_minimo * 4.0
    END
FROM sucursales s
CROSS JOIN insumos i;

-- ============================================================================
-- 6. MOVIMIENTOS INICIALES DE INVENTARIO (Kardex de apertura)
-- ============================================================================
INSERT INTO movimientos_inventario (id_sucursal, id_insumo, tipo_movimiento, cantidad, referencia_id)
SELECT 
    id_sucursal,
    id_insumo,
    'ENTRADA_COMPRA',
    stock_actual,
    1001
FROM inventario_sucursal;
GO