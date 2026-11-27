import { useEffect } from 'react'
import { Alert } from 'reactstrap'

function Alerta({ mensaje, color = 'success', onCerrar, duracion = 4000 }) {
  useEffect(() => {
    if (!mensaje) return
    const timer = setTimeout(onCerrar, duracion)
    return () => clearTimeout(timer)
  }, [mensaje])

  if (!mensaje) return null

  return (
    <Alert color={color} isOpen toggle={onCerrar} className="alerta-flotante">
      {mensaje}
    </Alert>
  )
}

export default Alerta
