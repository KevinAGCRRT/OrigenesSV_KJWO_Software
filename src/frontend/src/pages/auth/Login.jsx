import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Form, FormGroup, Label, Input, Button, Spinner } from 'reactstrap'
import { useAuth } from '../../context/AuthContext.jsx'
import ErrorBox from '../../components/common/ErrorBox.jsx'
import TextoRotativo from '../../components/common/TextoRotativo.jsx'

const rutaInicial = {
  gerente: '/',
  cajero: '/pos',
  barista: '/inventario'
}

function Login() {
  const { autenticado, usuario, iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const [form, setForm] = useState({ usuario: '', password: '' })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (autenticado) {
    return <Navigate to={rutaInicial[usuario.rol] || '/'} replace />
  }

  const cambiar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!form.usuario.trim() || !form.password) {
      setError('Escribe tu usuario y tu contraseña.')
      return
    }

    setEnviando(true)
    setError(null)
    try {
      const usuarioLogueado = await iniciarSesion(form.usuario.trim(), form.password)
      const destino = location.state?.desde || rutaInicial[usuarioLogueado.rol]
      navigate(destino, { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <section className="login-marca">
        <h1>Orígenes</h1>
        <p className="login-rota">
          Controla en cada sucursal
          <TextoRotativo palabras={['las ventas', 'el inventario', 'la caja', 'la planilla']} />
        </p>
        <p>Café de especialidad salvadoreño.</p>
      </section>

      <section className="login-panel">
        <Form onSubmit={enviar} className="login-form" noValidate>
          <h2>Iniciar sesión</h2>
          <p className="text-secondary mb-4">Usa la cuenta que te asignó tu gerente.</p>

          {params.get('expirada') && !error && (
            <p className="login-aviso">Tu sesión expiró. Vuelve a entrar para continuar.</p>
          )}
          <ErrorBox error={error} onCerrar={() => setError(null)} />

          <FormGroup>
            <Label for="usuario">Usuario</Label>
            <Input
              id="usuario"
              name="usuario"
              type="text"
              autoCapitalize="none"
              spellCheck="false"
              autoComplete="username"
              value={form.usuario}
              onChange={cambiar}
              autoFocus
            />
          </FormGroup>
          <FormGroup>
            <Label for="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={cambiar}
            />
          </FormGroup>

          <Button color="primary" type="submit" className="w-100 mt-2" disabled={enviando}>
            {enviando && <Spinner size="sm" className="me-2" />}
            Iniciar sesión
          </Button>

        </Form>
      </section>
    </div>
  )
}

export default Login
