/*
   010 - Seguridad y trazabilidad de ventas/caja
   No modifica las migraciones 007, 008 ni 009.
*/

USE bd_restaurante;
GO

/* 1. Usuario que registró la venta */
IF COL_LENGTH('dbo.ventas', 'id_usuario_registro') IS NULL
BEGIN
    ALTER TABLE dbo.ventas
    ADD id_usuario_registro INT NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_ventas_usuario_registro'
)
BEGIN
    ALTER TABLE dbo.ventas
    ADD CONSTRAINT FK_ventas_usuario_registro
    FOREIGN KEY (id_usuario_registro)
    REFERENCES dbo.usuarios(id_usuario);
END;
GO

/* 2. Llave de idempotencia */
IF COL_LENGTH('dbo.ventas', 'idempotencia') IS NULL
BEGIN
    ALTER TABLE dbo.ventas
    ADD idempotencia VARCHAR(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_ventas_idempotencia'
      AND object_id = OBJECT_ID('dbo.ventas')
)
BEGIN
    CREATE UNIQUE INDEX UX_ventas_idempotencia
    ON dbo.ventas(id_usuario_registro, idempotencia)
    WHERE idempotencia IS NOT NULL;
END;
GO

/* 3. Vincular movimientos de caja a una operación */
IF COL_LENGTH('dbo.movimientos_caja', 'referencia_tipo') IS NULL
BEGIN
    ALTER TABLE dbo.movimientos_caja
    ADD referencia_tipo VARCHAR(30) NULL;
END;
GO

IF COL_LENGTH('dbo.movimientos_caja', 'referencia_id') IS NULL
BEGIN
    ALTER TABLE dbo.movimientos_caja
    ADD referencia_id INT NULL;
END;
GO

/* 4. Evitar duplicación de movimiento de venta */
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_movimientos_caja_referencia'
      AND object_id = OBJECT_ID('dbo.movimientos_caja')
)
BEGIN
    CREATE UNIQUE INDEX UX_movimientos_caja_referencia
    ON dbo.movimientos_caja
    (
        referencia_tipo,
        referencia_id,
        tipo_movimiento
    )
    WHERE referencia_tipo IS NOT NULL
      AND referencia_id IS NOT NULL;
END;
GO