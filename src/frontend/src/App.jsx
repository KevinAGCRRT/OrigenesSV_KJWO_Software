import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/layout/Layout.jsx'
import Login from './pages/auth/Login.jsx'
import POS from './pages/ventas/POS.jsx'
import Facturas from './pages/ventas/Facturas.jsx'
import FacturaDetalle from './pages/ventas/FacturaDetalle.jsx'
import EnConstruccion from './pages/EnConstruccion.jsx'
import NoAutorizado from './pages/NoAutorizado.jsx'
import NoEncontrado from './pages/NoEncontrado.jsx'


function Inicio() {
  const { usuario } = useAuth()

  if (usuario.rol === 'gerente') {
    return <EnConstruccion titulo="Dashboard gerencial" responsable="P7" />
  }
  if (usuario.rol === 'barista') {
    return <Navigate to="/inventario" replace />
  }
  return <Navigate to="/pos" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="no-autorizado" element={<NoAutorizado />} />

          {/* Ventas - P5 */}
          <Route element={<ProtectedRoute roles={['cajero', 'gerente']} />}>
            <Route path="pos" element={<POS />} />
            <Route path="facturas" element={<Facturas />} />
            <Route path="facturas/:id" element={<FacturaDetalle />} />
          </Route>

          {/* Productos, inventario y compras - P6 */}
          <Route element={<ProtectedRoute roles={['gerente']} />}>
            <Route path="menu" element={<EnConstruccion titulo="Menú de productos" responsable="P6" />} />
            <Route path="recetas" element={<EnConstruccion titulo="Recetas" responsable="P6" />} />
            <Route path="proveedores" element={<EnConstruccion titulo="Proveedores" responsable="P6" />} />
            <Route path="compras" element={<EnConstruccion titulo="Compras y cuentas por pagar" responsable="P6" />} />
          </Route>
          <Route element={<ProtectedRoute roles={['gerente', 'barista']} />}>
            <Route path="inventario" element={<EnConstruccion titulo="Insumos y kardex" responsable="P6" />} />
            <Route path="alertas" element={<EnConstruccion titulo="Alertas de stock" responsable="P6" />} />
          </Route>

          {/* Caja y RRHH - P7 */}
          <Route element={<ProtectedRoute roles={['cajero', 'gerente']} />}>
            <Route path="caja" element={<EnConstruccion titulo="Caja por turno" responsable="P7" />} />
          </Route>
          <Route element={<ProtectedRoute roles={['gerente']} />}>
            <Route path="empleados" element={<EnConstruccion titulo="Empleados" responsable="P7" />} />
            <Route path="planilla" element={<EnConstruccion titulo="Planilla quincenal" responsable="P7" />} />
            <Route path="planilla/:planillaId/boleta/:empleadoId" element={<EnConstruccion titulo="Boleta de pago" responsable="P7" />} />
          </Route>

          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
