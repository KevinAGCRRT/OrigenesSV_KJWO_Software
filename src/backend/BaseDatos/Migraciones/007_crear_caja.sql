
USE bd_restaurante;
GO

-- 1. Apertura y cierre de caja por turno
IF OBJECT_ID('dbo.cajas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.cajas (
        id_caja INT IDENTITY(1,1) PRIMARY KEY,
        id_sucursal INT NOT NULL,
        id_empleado INT NOT NULL,
        fecha_apertura DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        fecha_cierre DATETIME2 NULL,
        monto_inicial DECIMAL(12,2) NOT NULL,
        monto_esperado DECIMAL(12,2) NULL,
        monto_declarado DECIMAL(12,2) NULL,
        diferencia DECIMAL(12,2) NULL,
        estado VARCHAR(10) NOT NULL DEFAULT 'ABIERTA',

        CONSTRAINT FK_cajas_sucursales
            FOREIGN KEY (id_sucursal) REFERENCES dbo.sucursales(id_sucursal),

        CONSTRAINT FK_cajas_empleados
            FOREIGN KEY (id_empleado) REFERENCES dbo.empleados(id_empleado),

        CONSTRAINT CK_cajas_monto_inicial
            CHECK (monto_inicial >= 0),

        CONSTRAINT CK_cajas_estado
            CHECK (estado IN ('ABIERTA', 'CERRADA'))
    );
END;
GO

-- Evitar dos cajas abiertas simultáneamente
-- para el mismo empleado y sucursal.
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_cajas_abierta_empleado_sucursal'
      AND object_id = OBJECT_ID('dbo.cajas')
)
BEGIN
    CREATE UNIQUE INDEX UX_cajas_abierta_empleado_sucursal
    ON dbo.cajas(id_empleado, id_sucursal)
    WHERE estado = 'ABIERTA';
END;
GO

-- 2. Movimientos de caja
IF OBJECT_ID('dbo.movimientos_caja', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.movimientos_caja (
        id_movimiento INT IDENTITY(1,1) PRIMARY KEY,
        id_caja INT NOT NULL,
        tipo_movimiento VARCHAR(10) NOT NULL,
        metodo_pago VARCHAR(20) NOT NULL,
        monto DECIMAL(12,2) NOT NULL,
        descripcion VARCHAR(250) NULL,
        fecha_movimiento DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT FK_movimientos_caja_cajas
            FOREIGN KEY (id_caja) REFERENCES dbo.cajas(id_caja),

        CONSTRAINT CK_movimientos_caja_tipo
            CHECK (tipo_movimiento IN ('INGRESO', 'EGRESO')),

        CONSTRAINT CK_movimientos_caja_metodo
            CHECK (metodo_pago IN (
                'EFECTIVO',
                'TARJETA',
                'BITCOIN',
                'CHIVO_WALLET'
            )),

        CONSTRAINT CK_movimientos_caja_monto
            CHECK (monto > 0)
    );
END;
GO
