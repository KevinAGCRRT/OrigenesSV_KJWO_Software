
USE bd_restaurante;
GO

IF OBJECT_ID('dbo.pagos_proveedores', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.pagos_proveedores (
        id_pago INT IDENTITY(1,1) PRIMARY KEY,
        id_cuenta_por_pagar INT NOT NULL,
        monto_pagado DECIMAL(12,2) NOT NULL,
        fecha_pago DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        metodo_pago VARCHAR(20) NOT NULL,
        referencia VARCHAR(100) NULL,
        observaciones VARCHAR(250) NULL,
        fecha_creacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT FK_pagos_proveedores_cuentas
            FOREIGN KEY (id_cuenta_por_pagar)
            REFERENCES dbo.cuentas_por_pagar(id_cuenta_por_pagar),

        CONSTRAINT CK_pagos_proveedores_monto
            CHECK (monto_pagado > 0),

        CONSTRAINT CK_pagos_proveedores_metodo
            CHECK (metodo_pago IN (
                'EFECTIVO',
                'TRANSFERENCIA',
                'TARJETA',
                'CHEQUE'
            ))
    );
END;
GO
