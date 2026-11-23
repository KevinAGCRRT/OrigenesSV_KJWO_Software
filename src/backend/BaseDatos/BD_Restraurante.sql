--inicio de la base de datos para restaurante Origenes SV--
--se creo en base al lenguaje T-SQL por medio de SQL server management Estudio 22-- 
USE master;
GO

CREATE DATABASE bd_restaurante;
GO

USE bd_restaurante;
GO

CREATE TABLE sucursales (
    id_sucursal INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    direccion VARCHAR(120) NOT NULL UNIQUE,
    telefono VARCHAR(15) NOT NULL,
    estado_sucursal BIT NOT NULL DEFAULT 1
);

CREATE TABLE insumos (
    id_insumo INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    unidad_medida VARCHAR(15) NOT NULL,
    es_reventa BIT NOT NULL DEFAULT 0,
    stock_minimo DECIMAL(10, 2) NOT NULL DEFAULT 0,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    CONSTRAINT ck_insumo_stock_min CHECK (stock_minimo >= 0),
    CONSTRAINT ck_insumo_precio CHECK (precio_unitario > 0)
);

CREATE TABLE inventario_sucursal (
    id_inventario INT IDENTITY(1,1) PRIMARY KEY,
    id_sucursal INT NOT NULL,
    id_insumo INT NOT NULL,
    stock_actual DECIMAL(10, 2) NOT NULL DEFAULT 0,
    CONSTRAINT uq_sucursal_insumo UNIQUE (id_sucursal, id_insumo),
    CONSTRAINT ck_inventario_stock_positivo CHECK (stock_actual >= 0),
    CONSTRAINT fk_inv_sucursal FOREIGN KEY (id_sucursal) 
        REFERENCES sucursales (id_sucursal) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT fk_inv_insumo FOREIGN KEY (id_insumo) 
        REFERENCES insumos (id_insumo) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE productos (
    id_producto INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    es_elaborado BIT NOT NULL DEFAULT 1,
    id_insumo_reventa INT NULL,
    activo BIT NOT NULL DEFAULT 1,
    CONSTRAINT ck_producto_precio_venta CHECK (precio_venta > 0),
    CONSTRAINT fk_producto_insumo_reventa FOREIGN KEY (id_insumo_reventa) 
        REFERENCES insumos (id_insumo) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE recetas (
    id_receta INT IDENTITY(1,1) PRIMARY KEY,
    id_producto INT NOT NULL,
    id_insumo INT NOT NULL,
    cantidad_requerida DECIMAL(10, 2) NOT NULL,
    CONSTRAINT uq_producto_insumo UNIQUE (id_producto, id_insumo),
    CONSTRAINT ck_receta_cantidad CHECK (cantidad_requerida > 0),
    CONSTRAINT fk_receta_producto FOREIGN KEY (id_producto) 
        REFERENCES productos (id_producto) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT fk_receta_insumo FOREIGN KEY (id_insumo) 
        REFERENCES insumos (id_insumo) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE movimientos_inventario (
    id_movimiento INT IDENTITY(1,1) PRIMARY KEY,
    id_sucursal INT NOT NULL,
    id_insumo INT NOT NULL,
    tipo_movimiento VARCHAR(30) NOT NULL DEFAULT 'ENTRADA_COMPRA',
    cantidad DECIMAL(10, 2) NOT NULL,
    fecha DATETIME2 NOT NULL DEFAULT GETDATE(),
    referencia_id INT NULL,
    CONSTRAINT ck_tipo_movimiento CHECK (tipo_movimiento IN ('ENTRADA_COMPRA', 'SALIDA_VENTA', 'MERMA', 'AJUSTE')),
    CONSTRAINT ck_movimiento_cantidad CHECK (cantidad > 0),
    CONSTRAINT fk_mov_sucursal FOREIGN KEY (id_sucursal) 
        REFERENCES sucursales (id_sucursal) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT fk_mov_insumo FOREIGN KEY (id_insumo) 
        REFERENCES insumos (id_insumo) ON UPDATE NO ACTION ON DELETE NO ACTION
);
GO



IF OBJECT_ID('dbo.empleados', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.empleados (
        id_empleado INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(60) NOT NULL,
        apellido VARCHAR(60) NOT NULL,
        correo VARCHAR(100) NOT NULL UNIQUE,
        telefono VARCHAR(15) NULL,
        id_sucursal INT NOT NULL,
        fecha_contratacion DATE NOT NULL
            DEFAULT CAST(GETDATE() AS DATE),
        activo BIT NOT NULL DEFAULT 1,

        CONSTRAINT FK_empleados_sucursales
            FOREIGN KEY (id_sucursal)
            REFERENCES dbo.sucursales(id_sucursal)
    );
END;
GO



IF OBJECT_ID('dbo.usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios (
        id_usuario INT IDENTITY(1,1) PRIMARY KEY,
        id_empleado INT NOT NULL UNIQUE,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL,
        activo BIT NOT NULL DEFAULT 1,
        fecha_creacion DATETIME2 NOT NULL
            DEFAULT SYSDATETIME(),

        CONSTRAINT FK_usuarios_empleados
            FOREIGN KEY (id_empleado)
            REFERENCES dbo.empleados(id_empleado),

        CONSTRAINT CK_usuarios_rol
            CHECK (rol IN ('gerente', 'cajero', 'barista'))
    );
END;
GO