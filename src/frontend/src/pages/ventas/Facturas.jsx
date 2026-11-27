import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input, Row, Col, Label, Badge, Button } from 'reactstrap'
import { getVentas } from '../../api/ventas.api.js'
import { dinero, fechaHora, hoyISO, METODOS_PAGO } from '../../utils/formato.js'
import Tabla from '../../components/common/Tabla.jsx'
import NumeroAnimado from '../../components/common/NumeroAnimado.jsx'
import { EsqueletoTabla } from '../../components/common/Esqueleto.jsx'
import ErrorBox from '../../components/common/ErrorBox.jsx'

// el ﻿ al inicio es para que Excel lea bien las tildes
function descargarCSV(facturas) {
  const encabezado = ['Correlativo', 'Fecha', 'Documento', 'Cliente', 'Pago', 'Estado', 'Subtotal', 'IVA', 'Total']
  const filas = facturas.map((v) => [
    v.correlativo,
    fechaHora(v.fecha),
    v.tipo_documento,
    v.cliente?.nombre || 'Consumidor final',
    METODOS_PAGO[v.metodo_pago] || 'No registrado',
    v.estado,
    Number(v.subtotal).toFixed(2),
    Number(v.iva).toFixed(2),
    Number(v.total).toFixed(2)
  ])
  const texto = [encabezado, ...filas]
    .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const archivo = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' })
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(archivo)
  enlace.download = `facturas-${hoyISO()}.csv`
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}

const filtrosIniciales ={ tipo_documento: '', estado: '', desde: hoyISO(), hasta: hoyISO() }

function Facturas() {
  const navigate = useNavigate()
  const [ventas, setVentas] = useState([])
  const [filtros, setFiltros] = useState(filtrosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarVentas = async () => {
    setCargando(true)
    setError(null)
    try {
      const datos = await getVentas(filtros)
      setVentas(datos)
    } catch (err) {
      setError(err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarVentas()
  }, [filtros])

  const cambiarFiltro = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value })

  // la búsqueda por correlativo o cliente se hace aquí, sin ir a la API
  const texto = busqueda.trim().toLowerCase()
  const visibles = ventas.filter(
    (v) => v.correlativo.toLowerCase().includes(texto) || (v.cliente?.nombre || '').toLowerCase().includes(texto)
  )

  const emitidas = visibles.filter((v) => v.estado === 'emitida')
  const totalEmitido = emitidas.reduce((suma, v) => suma + Number(v.total), 0)
  const ivaEmitido = emitidas.reduce((suma, v) => suma + Number(v.iva), 0)

  const columnas = [
    {
      titulo: 'Correlativo',
      render: (v) => (
        <Link to={`/facturas/${v.id}`} className="correlativo" onClick={(e) => e.stopPropagation()}>
          {v.correlativo}
        </Link>
      )
    },
    { titulo: 'Fecha', render: (v) => fechaHora(v.fecha) },
    { titulo: 'Cliente', render: (v) => v.cliente?.nombre || 'Consumidor final' },
    { titulo: 'Pago', render: (v) => METODOS_PAGO[v.metodo_pago] || '—' },
    {
      titulo: 'Estado',
      render: (v) => (
        <Badge color={v.estado === 'anulada' ? 'danger' : 'success'} pill>
          {v.estado === 'anulada' ? 'Anulada' : 'Emitida'}
        </Badge>
      )
    },
    {
      titulo: 'Total',
      alinear: 'end',
      render: (v) => <span className={v.estado === 'anulada' ? 'text-decoration-line-through text-secondary' : ''}>{dinero(v.total)}</span>
    }
  ]

  return (
    <div>
      <div className="pagina-encabezado">
        <div>
          <h1 className="pagina-titulo">Facturas</h1>
          <p className="text-secondary mb-0">Facturas de consumidor final y créditos fiscales emitidos en tu sucursal.</p>
        </div>
        <div className="d-flex gap-2">
          <Button color="secondary" outline onClick={() => descargarCSV(visibles)} disabled={visibles.length === 0}>
            Descargar CSV
          </Button>
          <Button color="primary" onClick={() => navigate('/pos')}>
            Nueva venta
          </Button>
        </div>
      </div>

      <div className="filtros">
        <Row className="g-3 align-items-end">
          <Col md="3">
            <Label for="buscar" size="sm">Correlativo o cliente</Label>
            <Input id="buscar" type="search" bsSize="sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </Col>
          <Col xs="6" md="2">
            <Label for="tipo_documento" size="sm">Documento</Label>
            <Input id="tipo_documento" name="tipo_documento" type="select" bsSize="sm" value={filtros.tipo_documento} onChange={cambiarFiltro}>
              <option value="">Todos</option>
              <option value="FCF">Consumidor final</option>
              <option value="CCF">Crédito fiscal</option>
            </Input>
          </Col>
          <Col xs="6" md="2">
            <Label for="estado" size="sm">Estado</Label>
            <Input id="estado" name="estado" type="select" bsSize="sm" value={filtros.estado} onChange={cambiarFiltro}>
              <option value="">Todos</option>
              <option value="emitida">Emitidas</option>
              <option value="anulada">Anuladas</option>
            </Input>
          </Col>
          <Col xs="6" md="2">
            <Label for="desde" size="sm">Desde</Label>
            <Input id="desde" name="desde" type="date" bsSize="sm" value={filtros.desde} onChange={cambiarFiltro} />
          </Col>
          <Col xs="6" md="2">
            <Label for="hasta" size="sm">Hasta</Label>
            <Input id="hasta" name="hasta" type="date" bsSize="sm" value={filtros.hasta} onChange={cambiarFiltro} />
          </Col>
          <Col md="1">
            <Button color="link" size="sm" className="text-secondary px-0" onClick={() => { setFiltros(filtrosIniciales); setBusqueda('') }}>
              Quitar filtros
            </Button>
          </Col>
        </Row>
      </div>

      <div className="resumen">
        <p>
          <span><NumeroAnimado valor={emitidas.length} formato={(n) => Math.round(n)} /></span> facturas emitidas
        </p>
        <p>
          <span><NumeroAnimado valor={totalEmitido} formato={dinero} /></span> vendido
        </p>
        <p>
          <span><NumeroAnimado valor={ivaEmitido} formato={dinero} /></span> de IVA
        </p>
      </div>

      <ErrorBox error={error} onReintentar={cargarVentas} />
      {cargando ? (
        <EsqueletoTabla />
      ) : (
        !error && (
          <Tabla
            columnas={columnas}
            datos={visibles}
            vacio="No hay facturas con estos filtros. Prueba con otro rango de fechas."
            onFila={(v) => navigate(`/facturas/${v.id}`)}
          />
        )
      )}
    </div>
  )
}

export default Facturas
