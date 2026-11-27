import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Input, Label } from 'reactstrap'
import { useAuth } from '../../context/AuthContext.jsx'
import { getVenta, anularVenta } from '../../api/ventas.api.js'
import { dinero, fechaHora, DOCUMENTOS, METODOS_PAGO } from '../../utils/formato.js'
import Loader from '../../components/common/Loader.jsx'
import ErrorBox from '../../components/common/ErrorBox.jsx'
import Modal from '../../components/common/Modal.jsx'
import Alerta from '../../components/common/Alerta.jsx'

function FacturaDetalle() {
  const { id } = useParams()
  const { tieneRol } = useAuth()

  const [venta, setVenta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [anulando, setAnulando] = useState(false)
  const [errorAnular, setErrorAnular] = useState(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)
      try {
        const datos = await getVenta(id)
        setVenta(datos)
      } catch (err) {
        setError(err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id])

  const confirmarAnulacion = async () => {
    setAnulando(true)
    setErrorAnular(null)
    try {
      const actualizada = await anularVenta(venta.id, motivo.trim())
      setVenta(actualizada)
      setModalAbierto(false)
      setMotivo('')
      setAviso(`Factura ${actualizada.correlativo} anulada. El inventario se devolvió.`)
    } catch (err) {
      setErrorAnular(err)
    } finally {
      setAnulando(false)
    }
  }

  if (cargando) return <Loader texto="Cargando factura..." />
  if (error) {
    return (
      <div>
        <ErrorBox error={error} />
        <Link to="/facturas">Volver a facturas</Link>
      </div>
    )
  }

  const esCCF = venta.tipo_documento === 'CCF'
  const anulada = venta.estado === 'anulada'

  return (
    <div className="detalle">
      <Alerta mensaje={aviso} onCerrar={() => setAviso('')} />

      <div className="pagina-encabezado no-imprimir">
        <Link to="/facturas" className="volver">
          Volver a facturas
        </Link>
        <div className="d-flex gap-2">
          <Button color="secondary" outline onClick={() => window.print()}>
            Imprimir
          </Button>
          {tieneRol('gerente') && !anulada && (
            <Button color="danger" outline onClick={() => setModalAbierto(true)}>
              Anular factura
            </Button>
          )}
        </div>
      </div>

      <article className={`comprobante ${anulada ? 'comprobante-anulado' : ''}`}>
        {anulada && <div className="sello-anulada">Anulada</div>}

        <header className="comprobante-cabecera">
          <div>
            <p className="comprobante-empresa">Restaurante Orígenes SV</p>
            <p>Sucursal {venta.sucursal}</p>
          </div>
          <div className="text-end">
            <p className="comprobante-tipo">{DOCUMENTOS[venta.tipo_documento]}</p>
            <p className="comprobante-correlativo">{venta.correlativo}</p>
            <p>{fechaHora(venta.fecha)}</p>
          </div>
        </header>

        <section className="comprobante-cliente">
          <p>
            <span>Cliente</span> {venta.cliente?.nombre || 'Consumidor final'}
          </p>
          {/* el backend todavía no guarda los datos del cliente */}
          {esCCF && venta.cliente?.nit && (
            <>
              <p><span>NIT</span> {venta.cliente.nit}</p>
              <p><span>NRC</span> {venta.cliente.nrc}</p>
              {venta.cliente.giro && <p><span>Giro</span> {venta.cliente.giro}</p>}
              {venta.cliente.direccion && <p><span>Dirección</span> {venta.cliente.direccion}</p>}
            </>
          )}
        </section>

        <table className="comprobante-tabla">
          <thead>
            <tr>
              <th>Cant.</th>
              <th>Descripción</th>
              <th className="text-end">Precio</th>
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {venta.detalle.map((linea) => (
              <tr key={linea.producto_id}>
                <td>{linea.cantidad}</td>
                <td>{linea.nombre}</td>
                <td className="text-end">{dinero(linea.precio_unitario)}</td>
                <td className="text-end">{dinero(linea.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="comprobante-totales">
          <div>
            <dt>{esCCF ? 'Sumas' : 'Subtotal'}</dt>
            <dd>{dinero(venta.subtotal)}</dd>
          </div>
          <div>
            <dt>IVA 13%</dt>
            <dd>{dinero(venta.iva)}</dd>
          </div>
          <div className="comprobante-total">
            <dt>Total</dt>
            <dd>{dinero(venta.total)}</dd>
          </div>
        </dl>

        <footer className="comprobante-pie">
          {venta.metodo_pago && (
            <p>
              Pago: {METODOS_PAGO[venta.metodo_pago]}
              {venta.metodo_pago === 'efectivo' &&
                venta.monto_recibido != null &&
                `, recibido ${dinero(venta.monto_recibido)}, cambio ${dinero(venta.cambio)}`}
            </p>
          )}
          {venta.cajero && <p>Atendió: {venta.cajero}</p>}
          {anulada && (
            <p className="comprobante-motivo">
              {venta.motivo_anulacion ? `Motivo de anulación: ${venta.motivo_anulacion}` : 'Factura anulada'}
              {venta.inventario_reintegrado === true && '. El inventario se devolvió.'}
            </p>
          )}
        </footer>
      </article>

      <Modal
        abierto={modalAbierto}
        titulo={`Anular ${venta.correlativo}`}
        onCerrar={() => {
          setModalAbierto(false)
          setErrorAnular(null)
        }}
        onConfirmar={confirmarAnulacion}
        textoConfirmar="Anular factura"
        colorConfirmar="danger"
        cargando={anulando}
        deshabilitado={motivo.trim().length < 5}
      >
        <p>
          La factura quedará sin efecto y los productos regresarán al inventario. El correlativo no se vuelve a usar.
        </p>
        <ErrorBox error={errorAnular} />
        <Label for="motivo">Motivo de la anulación</Label>
        <Input
          id="motivo"
          type="textarea"
          rows="3"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. el cliente canceló el pedido"
        />
      </Modal>
    </div>
  )
}

export default FacturaDetalle
