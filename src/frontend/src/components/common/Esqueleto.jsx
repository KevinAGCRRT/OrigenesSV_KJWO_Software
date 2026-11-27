// bloques grises mientras carga
export function EsqueletoProductos({ cantidad = 8 }) {
  return (
    <div className="pos-grid" aria-busy="true" aria-label="Cargando menú">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="producto esqueleto-tarjeta">
          <span className="esqueleto esqueleto-linea" />
          <span className="esqueleto esqueleto-corta" />
        </div>
      ))}
    </div>
  )
}

export function EsqueletoTabla({ filas = 4, columnas = 6 }) {
  return (
    <div className="tabla-contenedor" aria-busy="true" aria-label="Cargando datos">
      {Array.from({ length: filas }, (_, f) => (
        <div key={f} className="esqueleto-fila" style={{ gridTemplateColumns: `repeat(${columnas}, 1fr)` }}>
          {Array.from({ length: columnas }, (_, c) => (
            <span key={c} className="esqueleto esqueleto-linea" />
          ))}
        </div>
      ))}
    </div>
  )
}
