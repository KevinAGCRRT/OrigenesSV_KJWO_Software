import { Link } from 'react-router-dom'

function NoAutorizado() {
  return (
    <div className="pagina-vacia">
      <h1 className="pagina-titulo">No tienes acceso a esta sección</h1>
      <p className="text-secondary">Tu rol no tiene permiso para ver esta página. Si lo necesitas, pídeselo a tu gerente.</p>
      <Link to="/" className="btn btn-primary">
        Ir al inicio
      </Link>
    </div>
  )
}

export default NoAutorizado
