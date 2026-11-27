import { Link } from 'react-router-dom'

function NoEncontrado() {
  return (
    <div className="pagina-vacia">
      <h1 className="pagina-titulo">Esta página no existe</h1>
      <p className="text-secondary">Revisa la dirección o vuelve al inicio.</p>
      <Link to="/" className="btn btn-primary">
        Ir al inicio
      </Link>
    </div>
  )
}

export default NoEncontrado
