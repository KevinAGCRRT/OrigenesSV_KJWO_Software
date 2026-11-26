USE bd_restaurante;
GO
-- Factura única por proveedor y sucursal (excluye anuladas).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.compras') AND name='UX_compras_factura_proveedor_sucursal')
BEGIN
  CREATE UNIQUE INDEX UX_compras_factura_proveedor_sucursal
  ON dbo.compras(id_sucursal,id_proveedor,numero_factura)
  WHERE estado <> 'ANULADA';
END;
GO
