-- Tabla principal de ventas
create table ventas (
    id_venta int identity(1,1) primary key,
    id_sucursal int not null,
    tipo_documento varchar(3) not null,
    correlativo int not null,
    subtotal decimal(12,2) not null,
    iva decimal(12,2) not null,
    total decimal(12,2) not null,
    estado varchar(15) not null default 'completada',
    fecha datetime2 not null default getdate(),
    inventario_reintegrado bit not null default 0,

    constraint fk_venta_sucursal
        foreign key (id_sucursal)
        references sucursales(id_sucursal),

    constraint ck_venta_documento
        check (tipo_documento in ('FCF', 'CCF')),

    constraint ck_venta_estado
        check (estado in ('completada', 'anulada')),

    constraint uq_venta_correlativo
        unique (id_sucursal, tipo_documento, correlativo)
);



--productos de cada venta 
create table detalle_ventas (
    id_detalle int identity(1,1) primary key,
    id_venta int not null,
    id_producto int not null,
    cantidad int not null,
    precio_unitario decimal(12,2) not null,
    importe decimal(12,2) not null,

    constraint fk_detalle_venta
        foreign key (id_venta)
        references ventas(id_venta),

    constraint fk_detalle_producto
        foreign key (id_producto)
        references productos(id_producto),

    constraint ck_detalle_cantidad
        check (cantidad > 0),

    constraint ck_detalle_importes
        check (precio_unitario >= 0 and importe >= 0)
);

-- Correlativos por sucursal
create table correlativos_documento (
    id_sucursal int not null,
    tipo_documento varchar(3) not null,
    ultimo_numero int not null default 0,

    constraint pk_correlativos
        primary key (id_sucursal, tipo_documento),

    constraint fk_correlativo_sucursal
        foreign key (id_sucursal)
        references sucursales(id_sucursal),

    constraint ck_correlativo_tipo
        check (tipo_documento in ('FCF', 'CCF')),

    constraint ck_correlativo_numero
        check (ultimo_numero >= 0)
);