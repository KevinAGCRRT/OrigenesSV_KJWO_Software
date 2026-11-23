USE bd_restaurante;
GO

IF OBJECT_ID('dbo.proveedores', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.proveedores (
        id_proveedor INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        nit VARCHAR(20) NULL,
        nrc VARCHAR(20) NULL,
        contacto VARCHAR(100) NULL,
        telefono VARCHAR(20) NULL,
        correo VARCHAR(100) NULL,
        direccion VARCHAR(250) NULL,
        activo BIT NOT NULL DEFAULT 1,
        fecha_creacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT UQ_proveedores_nit UNIQUE (nit),
        CONSTRAINT UQ_proveedores_nrc UNIQUE (nrc)
    );
END;
GO