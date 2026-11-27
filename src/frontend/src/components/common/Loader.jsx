import { Spinner } from 'reactstrap'

function Loader({ texto = 'Cargando...' }) {
  return (
    <div className="loader" role="status">
      <Spinner size="sm" className="me-2" />
      {texto}
    </div>
  )
}

export default Loader
