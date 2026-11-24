
USE bd_restaurante;
GO

IF OBJECT_ID('dbo.cuentas_por_pagar', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.cuentas_por_pagar (
        id_cuenta_por_pagar INT IDENTITY(1,1) PRIMARY KEY,
        id_compra INT NOT NULL,
        monto_original DECIMAL(12,2) NOT NULL,
        saldo_pendiente DECIMAL(12,2) NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        estado VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',
        fecha_creacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT FK_cuentas_por_pagar_compras
            FOREIGN KEY (id_compra)
            REFERENCES dbo.compras(id_compra),

        CONSTRAINT UQ_cuentas_por_pagar_compra
            UNIQUE (id_compra),

        CONSTRAINT CK_cuentas_por_pagar_montos
            CHECK (
                monto_original > 0
                AND saldo_pendiente >= 0
                AND saldo_pendiente <= monto_original
            ),

        CONSTRAINT CK_cuentas_por_pagar_estado
            CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'PAGADA'))
    );
END;
GO
