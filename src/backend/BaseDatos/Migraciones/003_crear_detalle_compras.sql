
USE bd_restaurante;
GO

IF OBJECT_ID('dbo.detalle_compras', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.detalle_compras (
        id_detalle_compra INT IDENTITY(1,1) PRIMARY KEY,
        id_compra INT NOT NULL,
        id_insumo INT NOT NULL,
        cantidad DECIMAL(12,2) NOT NULL,
        precio_unitario DECIMAL(12,2) NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,

        CONSTRAINT FK_detalle_compras_compras
            FOREIGN KEY (id_compra)
            REFERENCES dbo.compras(id_compra),

        CONSTRAINT FK_detalle_compras_insumos
            FOREIGN KEY (id_insumo)
            REFERENCES dbo.insumos(id_insumo),

        CONSTRAINT CK_detalle_compras_cantidad
            CHECK (cantidad > 0),

        CONSTRAINT CK_detalle_compras_precio
            CHECK (precio_unitario >= 0),

        CONSTRAINT CK_detalle_compras_subtotal
            CHECK (subtotal > 0)
    );
END;
GO

IF COL_LENGTH('dbo.detalle_compras', 'clasificacion') IS NULL
BEGIN
    ALTER TABLE dbo.detalle_compras
    ADD clasificacion VARCHAR(10) NOT NULL
        CONSTRAINT DF_detalle_compras_clasificacion
        DEFAULT 'COSTO';
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_detalle_compras_clasificacion'
)
BEGIN
    ALTER TABLE dbo.detalle_compras
    ADD CONSTRAINT CK_detalle_compras_clasificacion
    CHECK (clasificacion IN ('COSTO', 'GASTO'));
END;
GO
