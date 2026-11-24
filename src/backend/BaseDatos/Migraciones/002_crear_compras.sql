
USE bd_restaurante;
GO

IF OBJECT_ID('dbo.compras', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.compras (
        id_compra INT IDENTITY(1,1) PRIMARY KEY,
        id_proveedor INT NOT NULL,
        id_sucursal INT NOT NULL,
        id_usuario INT NOT NULL,
        numero_factura VARCHAR(50) NOT NULL,
        fecha_compra DATE NOT NULL,
        fecha_vencimiento DATE NULL,
        tipo_compra VARCHAR(10) NOT NULL,
        condicion_pago VARCHAR(10) NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,
        iva DECIMAL(12,2) NOT NULL DEFAULT 0,
        total DECIMAL(12,2) NOT NULL,
        estado VARCHAR(15) NOT NULL DEFAULT 'REGISTRADA',
        observaciones VARCHAR(250) NULL,
        fecha_creacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT FK_compras_proveedores
            FOREIGN KEY (id_proveedor)
            REFERENCES dbo.proveedores(id_proveedor),

        CONSTRAINT FK_compras_sucursales
            FOREIGN KEY (id_sucursal)
            REFERENCES dbo.sucursales(id_sucursal),

        CONSTRAINT FK_compras_usuarios
            FOREIGN KEY (id_usuario)
            REFERENCES dbo.usuarios(id_usuario),

        CONSTRAINT CK_compras_tipo
            CHECK (tipo_compra IN ('COSTO', 'GASTO')),

        CONSTRAINT CK_compras_condicion
            CHECK (condicion_pago IN ('CONTADO', 'CREDITO')),

        CONSTRAINT CK_compras_estado
            CHECK (estado IN ('REGISTRADA', 'ANULADA')),

        CONSTRAINT CK_compras_importes
            CHECK (
                subtotal >= 0
                AND iva >= 0
                AND total > 0
                AND total = subtotal + iva
            ),

        CONSTRAINT CK_compras_vencimiento
            CHECK (
                condicion_pago = 'CONTADO'
                OR fecha_vencimiento IS NOT NULL
            )
    );
END;
GO
 