import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

// opciones del menú y los roles que las ven
const secciones = [
  {
    titulo: 'Ventas',
    opciones: [
      { ruta: '/pos', texto: 'Punto de venta', roles: ['cajero', 'gerente'] },
      { ruta: '/facturas', texto: 'Facturas', roles: ['cajero', 'gerente'] },
      { ruta: '/caja', texto: 'Caja', roles: ['cajero', 'gerente'] }
    ]
  },
  {
    titulo: 'Cocina y bodega',
    opciones: [
      { ruta: '/menu', texto: 'Menú', roles: ['gerente'] },
      { ruta: '/recetas', texto: 'Recetas', roles: ['gerente'] },
      { ruta: '/inventario', texto: 'Inventario', roles: ['gerente', 'barista'] },
      { ruta: '/alertas', texto: 'Alertas de stock', roles: ['gerente', 'barista'] }
    ]
  },
  {
    titulo: 'Administración',
    opciones: [
      { ruta: '/', texto: 'Dashboard', roles: ['gerente'], exacta: true },
      { ruta: '/proveedores', texto: 'Proveedores', roles: ['gerente'] },
      { ruta: '/compras', texto: 'Compras', roles: ['gerente'] },
      { ruta: '/empleados', texto: 'Empleados', roles: ['gerente'] },
      { ruta: '/planilla', texto: 'Planilla', roles: ['gerente'] }
    ]
  }
]

function Sidebar({ abierto, onNavegar }) {
  const { usuario } = useAuth()

  const visibles = secciones
    .map((seccion) => ({
      ...seccion,
      opciones: seccion.opciones.filter((op) => op.roles.includes(usuario.rol))
    }))
    .filter((seccion) => seccion.opciones.length > 0)

  return (
    <aside className={`sidebar ${abierto ? 'sidebar-abierto' : ''}`}>
      <div className="sidebar-marca">
        <span className="marca-nombre">Orígenes</span>
        <span className="marca-sub">Café de especialidad</span>
      </div>

      <nav>
        {visibles.map((seccion) => (
          <div key={seccion.titulo} className="sidebar-seccion">
            <p className="sidebar-titulo">{seccion.titulo}</p>
            {seccion.opciones.map((op) => (
              <NavLink
                key={op.ruta}
                to={op.ruta}
                end={op.exacta}
                onClick={onNavegar}
                className={({ isActive }) => `sidebar-link ${isActive ? 'activo' : ''}`}
              >
                {op.texto}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
