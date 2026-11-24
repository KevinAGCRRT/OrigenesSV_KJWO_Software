USE bd_restaurante;
GO

ALTER TABLE dbo.compras
DROP CONSTRAINT CK_compras_tipo;
GO

ALTER TABLE dbo.compras
ADD CONSTRAINT CK_compras_tipo
CHECK (tipo_compra IN ('COSTO', 'GASTO', 'MIXTA'));
GO