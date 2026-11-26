
USE bd_restaurante;
GO

IF OBJECT_ID('dbo.arqueos_caja', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.arqueos_caja (
        id_arqueo INT IDENTITY(1,1) PRIMARY KEY,
        id_caja INT NOT NULL,
        metodo_pago VARCHAR(20) NOT NULL,
        monto_esperado DECIMAL(12,2) NOT NULL,
        monto_declarado DECIMAL(12,2) NOT NULL,
        diferencia AS (monto_declarado - monto_esperado) PERSISTED,
        fecha_registro DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT FK_arqueos_caja_cajas
            FOREIGN KEY (id_caja) REFERENCES dbo.cajas(id_caja),

        CONSTRAINT UQ_arqueos_caja_metodo
            UNIQUE (id_caja, metodo_pago),

        CONSTRAINT CK_arqueos_caja_metodo
            CHECK (metodo_pago IN (
                'EFECTIVO',
                'TARJETA',
                'BITCOIN',
                'CHIVO_WALLET'
            )),

        CONSTRAINT CK_arqueos_caja_montos
            CHECK (monto_esperado >= 0 AND monto_declarado >= 0)
    );
END;
GO
