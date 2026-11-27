import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'

function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="app">
      <Sidebar abierto={menuAbierto} onNavegar={() => setMenuAbierto(false)} />
      {menuAbierto && <div className="sidebar-fondo" onClick={() => setMenuAbierto(false)} />}

      <div className="app-principal">
        <Navbar onMenu={() => setMenuAbierto(!menuAbierto)} />
        <main className="app-contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
