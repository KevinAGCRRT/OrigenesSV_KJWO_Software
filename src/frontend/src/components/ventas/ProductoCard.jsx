import { dinero } from '../../utils/formato.js'

const POCAS_UNIDADES = 5

function ProductoCard({ producto, enCarrito, onAgregar }) {
  const restantes = (producto.disponibles ?? Infinity) - enCarrito
  const agotado = restantes <= 0

  return (
    <button
      type="button"
      className={`producto ${agotado ? 'producto-agotado' : ''} ${enCarrito > 0 ? 'producto-elegido' : ''}`}
      onClick={() => onAgregar(producto)}
      disabled={agotado}
    >
      {enCarrito > 0 && (
        <span key={enCarrito} className="producto-cantidad">
          {enCarrito}
        </span>
      )}
      <span className="producto-nombre">{producto.nombre}</span>
      <span className="producto-pie">
        <span className="producto-precio">{dinero(producto.precio)}</span>
        {producto.tipo === 'reventa' && <span className="producto-tipo">Empacado</span>}
      </span>
      {producto.disponibles === 0 && <span className="producto-stock">Agotado</span>}
      {producto.disponibles > 0 && agotado && <span className="producto-stock">Ya no alcanza</span>}
      {!agotado && restantes <= POCAS_UNIDADES && (
        <span className="producto-stock">Quedan {restantes}</span>
      )}
    </button>
  )
}

export default ProductoCard
