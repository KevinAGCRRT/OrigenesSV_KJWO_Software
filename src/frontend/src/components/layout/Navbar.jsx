import { useNavigate } from 'react-router-dom'
import { Button } from 'reactstrap'
import { useAuth } from '../../context/AuthContext.jsx'

const nombresRol = {
  gerente: 'Gerente',
  cajero: 'Cajero',
  barista: 'Barista'
}

function Navbar({ onMenu }) {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const salir = () => {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <button type="button" className="btn-menu" onClick={onMenu} aria-label="Abrir menú">
        <span />
        <span />
        <span />
      </button>

      <div className="topbar-sucursal">
        Sucursal <strong>{usuario.sucursal}</strong>
      </div>

      <div className="topbar-derecha">
        {/* P6: aquí va <StockBadge /> con el número de alertas de stock mínimo */}
        <div className="topbar-usuario">
          <span className="usuario-nombre">{usuario.nombre}</span>
          <span className="usuario-rol">{nombresRol[usuario.rol]}</span>
        </div>
        <Button color="light" size="sm" onClick={salir}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  )
}

export default Navbar
