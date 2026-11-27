import { Alert, Button } from 'reactstrap'

function ErrorBox({ error, onReintentar, onCerrar }) {
  if (!error) return null

  const mensaje = typeof error === 'string' ? error : error.message
  const detalles = Array.isArray(error.detalles) ? error.detalles : []

  return (
    <Alert color="danger" className="error-box" isOpen toggle={onCerrar}>
      <p className="mb-1 fw-semibold">{mensaje}</p>
      {detalles.length > 0 && (
        <ul className="mb-1 ps-3">
          {detalles.map((detalle) => (
            <li key={detalle}>{detalle}</li>
          ))}
        </ul>
      )}
      {onReintentar && (
        <Button color="danger" outline size="sm" className="mt-2" onClick={onReintentar}>
          Intentar de nuevo
        </Button>
      )}
    </Alert>
  )
}

export default ErrorBox
