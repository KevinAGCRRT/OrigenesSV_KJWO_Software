import { Table } from 'reactstrap'

// columnas: [{ titulo, campo, render, alinear }]
function Tabla({ columnas, datos, llave = 'id', vacio = 'No hay registros', onFila }) {
  return (
    <div className="tabla-contenedor">
      <Table hover={Boolean(onFila)} responsive className="tabla mb-0">
        <thead>
          <tr>
            {columnas.map((col) => (
              <th key={col.titulo} className={col.alinear ? `text-${col.alinear}` : ''}>
                {col.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="tabla-vacia">
                {vacio}
              </td>
            </tr>
          ) : (
            datos.map((fila) => (
              <tr
                key={fila[llave]}
                onClick={onFila ? () => onFila(fila) : undefined}
                className={onFila ? 'fila-clic' : ''}
              >
                {columnas.map((col) => (
                  <td key={col.titulo} className={col.alinear ? `text-${col.alinear}` : ''}>
                    {col.render ? col.render(fila) : fila[col.campo]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  )
}

export default Tabla
