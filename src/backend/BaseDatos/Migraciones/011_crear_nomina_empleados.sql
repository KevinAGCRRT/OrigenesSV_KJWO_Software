/*
    011 - salario de empleados y nomina quincenal
    Restaurante Origenes SV
*/

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

-- 1. Agregar salario base a empleados existentes.
IF COL_LENGTH('dbo.empleados', 'salario_base') IS NULL
BEGIN
    ALTER TABLE dbo.empleados
    ADD salario_base DECIMAL(10,2) NULL;
END;

-- 1.1 Crear restricción del salario base.
IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_empleados_salario_base'
      AND parent_object_id = OBJECT_ID('dbo.empleados')
)
BEGIN
    EXEC sp_executesql N'
        ALTER TABLE dbo.empleados
        ADD CONSTRAINT CK_empleados_salario_base
        CHECK (salario_base IS NULL OR salario_base > 0);
    ';
END;

    -- 2. Crear historial de nominas.
    IF OBJECT_ID('dbo.nominas', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.nominas (
            id_nomina INT IDENTITY(1,1) PRIMARY KEY,
            id_empleado INT NOT NULL,

            fecha_inicio DATE NOT NULL,
            fecha_fin DATE NOT NULL,

            salario_base_snapshot DECIMAL(10,2) NOT NULL,
            salario_periodo DECIMAL(10,2) NOT NULL,

            monto_isss DECIMAL(10,2) NOT NULL,
            monto_afp DECIMAL(10,2) NOT NULL,
            monto_isr DECIMAL(10,2) NOT NULL,

            total_deducciones DECIMAL(10,2) NOT NULL,
            salario_neto DECIMAL(10,2) NOT NULL,

            estado VARCHAR(15) NOT NULL DEFAULT 'CALCULADA',

            fecha_registro DATETIME2 NOT NULL
                DEFAULT SYSDATETIME(),

            fecha_pago DATETIME2 NULL,

            CONSTRAINT FK_nominas_empleados
                FOREIGN KEY (id_empleado)
                REFERENCES dbo.empleados(id_empleado),

            CONSTRAINT CK_nominas_fechas
                CHECK (fecha_fin >= fecha_inicio),

            CONSTRAINT CK_nominas_montos
                CHECK (
                    salario_base_snapshot > 0
                    AND salario_periodo >= 0
                    AND monto_isss >= 0
                    AND monto_afp >= 0
                    AND monto_isr >= 0
                    AND total_deducciones >= 0
                    AND salario_neto >= 0
                ),

            CONSTRAINT CK_nominas_estado
                CHECK (estado IN ('CALCULADA', 'PAGADA'))
        );

        CREATE UNIQUE INDEX UX_nominas_empleado_periodo
        ON dbo.nominas (
            id_empleado,
            fecha_inicio,
            fecha_fin
        );
    END;

    COMMIT TRANSACTION;

    PRINT 'Migracion 011 ejecutada correctamente.';

END TRY
BEGIN CATCH

    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;

END CATCH;  