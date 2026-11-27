import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Label, FormGroup, Row, Col, Spinner } from 'reactstrap'
import { useAuth } from '../../context/AuthContext.jsx'
import { getProductosVenta, crearVenta, getEstadoCaja, nuevaClaveVenta } from '../../api/ventas.api.js'
import { calcularTotales, redondear } from '../../utils/impuestos.js'
import { dinero, METODOS_PAGO } from '../../utils/formato.js'
import ProductoCard from '../../components/ventas/ProductoCard.jsx'
import NumeroAnimado from '../../components/common/NumeroAnimado.jsx'
import TabsDeslizantes from '../../components/common/TabsDeslizantes.jsx'
import { EsqueletoProductos } from '../../components/common/Esqueleto.jsx'
import ErrorBox from '../../components/common/ErrorBox.jsx'
import Modal from '../../components/common/Modal.jsx'

const clienteVacio = { nombre: '', nit: '', nrc: '', giro: '', direccion: '' }
const billetes = [5, 10, 20]
const ORDEN_KEY = 'origenes_orden'

// la orden se guarda para no perderla si se recarga la página
function leerOrden(usuarioId) {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(ORDEN_KEY))
    if (guardada?.usuarioId === usuarioId) return guardada
  } catch {
  }
  return null
}

function POS() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const ticketRef = useRef(null)
  // la misma llave si se reintenta el cobro de esta orden
  const claveVenta = useRef(null)
  const busquedaRef = useRef(null)
  const ordenGuardada = useRef(leerOrden(usuario.id)).current

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [categoria, setCategoria] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')

  const [carrito, setCarrito] = useState(ordenGuardada?.carrito || [])
  const [tipoDocumento, setTipoDocumento] = useState(ordenGuardada?.tipoDocumento || 'FCF')
  const [cliente, setCliente] = useState(ordenGuardada?.cliente || clienteVacio)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [errorVenta, setErrorVenta] = useState(null)
  const [ventaCreada, setVentaCreada] = useState(null)
  // null = no se sabe todavía
  const [cajaAbierta, setCajaAbierta] = useState(null)

  const cargarProductos = async () => {
    setCargando(true)
    setErrorCarga(null)
    try {
      const datos = await getProductosVenta(usuario.sucursal_id)
      setProductos(datos)
    } catch (err) {
      setErrorCarga(err)
    } finally {
      setCargando(false)
    }
  }

  const revisarCaja = async () => {
    try {
      const { turno } = await getEstadoCaja(usuario.id)
      setCajaAbierta(Boolean(turno))
    } catch {
      setCajaAbierta(null)
    }
  }

  useEffect(() => {
    cargarProductos()
    revisarCaja()
  }, [])

  useEffect(() => {
    sessionStorage.setItem(ORDEN_KEY, JSON.stringify({ usuarioId: usuario.id, carrito, tipoDocumento, cliente }))
  }, [carrito, tipoDocumento, cliente, usuario.id])

  // otra orden, otra llave
  useEffect(() => {
    claveVenta.current = null
  }, [carrito, tipoDocumento, metodoPago])

  const categorias = ['Todas', ...new Set(productos.map((p) => p.categoria))]
  const texto = busqueda.trim().toLowerCase()
  const productosVisibles = productos.filter((p) => {
    const coincideCategoria = categoria === 'Todas' || p.categoria === categoria
    const coincideTexto = p.nombre.toLowerCase().includes(texto)
    return coincideCategoria && coincideTexto
  })

  const cantidadEnCarrito = (id) => carrito.find((item) => item.id === id)?.cantidad || 0

  const agregar = (producto) => {
    const actual = cantidadEnCarrito(producto.id)
    if (actual >= (producto.disponibles ?? Infinity)) return

    if (actual === 0) {
      setCarrito([...carrito, { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }])
    } else {
      setCarrito(carrito.map((item) => (item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item)))
    }
  }

  const cambiarCantidad = (id, cambio) => {
    const producto = productos.find((p) => p.id === id)
    const nuevoCarrito = carrito
      .map((item) => {
        if (item.id !== id) return item
        const limite = producto ? producto.disponibles ?? Infinity : item.cantidad
        const cantidad = Math.min(item.cantidad + cambio, limite)
        return { ...item, cantidad }
      })
      .filter((item) => item.cantidad > 0)
    setCarrito(nuevoCarrito)
  }

  const quitar = (id) => setCarrito(carrito.filter((item) => item.id !== id))

  const limpiarVenta = () => {
    setCarrito([])
    setCliente(clienteVacio)
    setTipoDocumento('FCF')
    setMetodoPago('efectivo')
    setMontoRecibido('')
    setErrorVenta(null)
  }

  const { subtotal, iva, total } = calcularTotales(carrito)
  const recibido = Number(montoRecibido) || 0
  const cambio = metodoPago === 'efectivo' ? redondear(recibido - total) : 0

  const faltaCliente = tipoDocumento === 'CCF' && (!cliente.nombre.trim() || !cliente.nit.trim() || !cliente.nrc.trim())
  const faltaEfectivo = metodoPago === 'efectivo' && recibido < total
  const puedeCobrar = carrito.length > 0 && !faltaCliente && !faltaEfectivo && !enviando && cajaAbierta !== false

  const cambiarCliente = (e) => setCliente({ ...cliente, [e.target.name]: e.target.value })

  const cobrar = async () => {
    if (!puedeCobrar) return

    const venta = {
      tipo_documento: tipoDocumento,
      sucursal_id: usuario.sucursal_id,
      metodo_pago: metodoPago,
      monto_recibido: metodoPago === 'efectivo' ? recibido : total,
      cliente: tipoDocumento === 'CCF' ? cliente : cliente.nombre.trim() ? { nombre: cliente.nombre.trim() } : null,
      detalle: carrito.map((item) => ({ producto_id: item.id, cantidad: item.cantidad }))
    }

    if (!claveVenta.current) claveVenta.current = nuevaClaveVenta()

    setEnviando(true)
    setErrorVenta(null)
    try {
      const creada = await crearVenta(venta, { clave: claveVenta.current, idUsuario: usuario.id })
      claveVenta.current = null
      setVentaCreada(creada)
      setCajaAbierta(true)
      limpiarVenta()
      cargarProductos()
    } catch (err) {
      if (err.codigo === 'CAJA_CERRADA') {
        setCajaAbierta(false)
      } else {
        setErrorVenta(err)
        // pudo cambiar el stock, se recargan los productos
        cargarProductos()
      }
    } finally {
      setEnviando(false)
    }
  }

  // atajos: "/" buscar, Ctrl+Enter cobrar
  const cobrarRef = useRef(cobrar)
  cobrarRef.current = cobrar

  useEffect(() => {
    const alPresionar = (e) => {
      const escribiendo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if (e.key === '/' && !escribiendo) {
        e.preventDefault()
        busquedaRef.current?.focus()
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        cobrarRef.current()
      }
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [])

  return (
    <div className="pos">
      <section className="pos-catalogo">
        <div className="pos-encabezado">
          <h1 className="pagina-titulo mb-0">Punto de venta</h1>
          <Input
            type="search"
            placeholder="Buscar producto"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setBusqueda('')}
            className="pos-busqueda"
            aria-label="Buscar producto"
            aria-keyshortcuts="/"
            innerRef={busquedaRef}
          />
        </div>
        <p className="pos-atajos">
          Atajos: <kbd>/</kbd> buscar, <kbd>Esc</kbd> limpiar búsqueda, <kbd>Ctrl</kbd> + <kbd>Enter</kbd> cobrar
        </p>

        <div className="pos-categorias">
          <TabsDeslizantes
            variante="pildora"
            etiqueta="Categoría"
            opciones={categorias.map((cat) => ({ valor: cat, texto: cat }))}
            activo={categoria}
            onCambiar={setCategoria}
          />
        </div>

        {cargando && productos.length === 0 && <EsqueletoProductos />}
        <ErrorBox error={errorCarga} onReintentar={cargarProductos} />

        {!cargando && !errorCarga && productosVisibles.length === 0 && (
          <p className="text-secondary mt-4">No hay productos que coincidan con "{busqueda}".</p>
        )}

        <div className="pos-grid">
          {productosVisibles.map((producto) => (
            <ProductoCard
              key={producto.id}
              producto={producto}
              enCarrito={cantidadEnCarrito(producto.id)}
              onAgregar={agregar}
            />
          ))}
        </div>
      </section>

      <aside className="ticket" aria-label="Orden actual" ref={ticketRef}>
        <div className="ticket-cabecera">
          <TabsDeslizantes
            etiqueta="Tipo de documento"
            opciones={[
              { valor: 'FCF', texto: 'Consumidor final' },
              { valor: 'CCF', texto: 'Crédito fiscal' }
            ]}
            activo={tipoDocumento}
            onCambiar={setTipoDocumento}
          />
        </div>

        <div className="ticket-cuerpo">
          {tipoDocumento === 'CCF' ? (
            <div className="ticket-cliente">
              <FormGroup className="mb-2">
                <Label for="nombre" size="sm">Razón social *</Label>
                <Input id="nombre" name="nombre" bsSize="sm" value={cliente.nombre} onChange={cambiarCliente} />
              </FormGroup>
              <Row className="g-2">
                <Col xs="6">
                  <Label for="nit" size="sm">NIT *</Label>
                  <Input id="nit" name="nit" bsSize="sm" placeholder="0614-000000-000-0" value={cliente.nit} onChange={cambiarCliente} />
                </Col>
                <Col xs="6">
                  <Label for="nrc" size="sm">NRC *</Label>
                  <Input id="nrc" name="nrc" bsSize="sm" placeholder="000000-0" value={cliente.nrc} onChange={cambiarCliente} />
                </Col>
              </Row>
              <Row className="g-2 mt-0">
                <Col xs="6">
                  <Label for="giro" size="sm">Giro</Label>
                  <Input id="giro" name="giro" bsSize="sm" value={cliente.giro} onChange={cambiarCliente} />
                </Col>
                <Col xs="6">
                  <Label for="direccion" size="sm">Dirección</Label>
                  <Input id="direccion" name="direccion" bsSize="sm" value={cliente.direccion} onChange={cambiarCliente} />
                </Col>
              </Row>
            </div>
          ) : (
            <Input
              name="nombre"
              bsSize="sm"
              placeholder="Nombre del cliente (opcional)"
              value={cliente.nombre}
              onChange={cambiarCliente}
              className="mb-3"
              aria-label="Nombre del cliente"
            />
          )}

          {carrito.length === 0 ? (
            <p className="ticket-vacio">Toca un producto para agregarlo a la orden.</p>
          ) : (
            <ul className="ticket-lineas">
              {carrito.map((item) => (
                <li key={item.id} className="linea-nueva">
                  <div className="linea-info">
                    <span className="linea-nombre">{item.nombre}</span>
                    <span className="linea-precio">{dinero(item.precio)} c/u</span>
                  </div>
                  <div className="linea-controles">
                    <button type="button" onClick={() => cambiarCantidad(item.id, -1)} aria-label={`Quitar uno de ${item.nombre}`}>
                      −
                    </button>
                                        <span key={item.cantidad} className="cantidad-salto">{item.cantidad}</span>
                    <button type="button" onClick={() => cambiarCantidad(item.id, 1)} aria-label={`Agregar uno de ${item.nombre}`}>
                      +
                    </button>
                  </div>
                  <span className="linea-total">{dinero(item.precio * item.cantidad)}</span>
                  <button type="button" className="linea-quitar" onClick={() => quitar(item.id)} aria-label={`Eliminar ${item.nombre}`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ticket-pie">
          <dl className="ticket-totales">
            <div>
              <dt>{tipoDocumento === 'CCF' ? 'Sumas (sin IVA)' : 'Subtotal'}</dt>
              <dd><NumeroAnimado valor={subtotal} formato={dinero} /></dd>
            </div>
            <div>
              <dt>IVA 13%</dt>
              <dd><NumeroAnimado valor={iva} formato={dinero} /></dd>
            </div>
            <div className="ticket-total">
              <dt>Total</dt>
              <dd><NumeroAnimado valor={total} formato={dinero} /></dd>
            </div>
          </dl>

          <TabsDeslizantes
            etiqueta="Método de pago"
            opciones={Object.keys(METODOS_PAGO).map((clave) => ({
              valor: clave,
              texto: clave === 'chivo_wallet' ? 'Chivo' : METODOS_PAGO[clave]
            }))}
            activo={metodoPago}
            onCambiar={setMetodoPago}
          />

          {metodoPago === 'efectivo' && (
            <div className="ticket-efectivo">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Efectivo recibido"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                aria-label="Efectivo recibido"
              />
              <div className="billetes">
                <button type="button" onClick={() => setMontoRecibido(String(total))} disabled={total === 0}>
                  Exacto
                </button>
                {billetes.map((b) => (
                  <button key={b} type="button" onClick={() => setMontoRecibido(String(b))}>
                    ${b}
                  </button>
                ))}
              </div>
              {recibido > 0 && total > 0 && (
                <p className={`ticket-cambio ${cambio < 0 ? 'falta' : ''}`}>
                  {cambio < 0 ? `Faltan ${dinero(-cambio)}` : `Cambio: ${dinero(cambio)}`}
                </p>
              )}
            </div>
          )}
          {(metodoPago === 'bitcoin' || metodoPago === 'chivo_wallet') && (
            <p className="ticket-nota">Confirma que el pago llegó a la billetera antes de registrar la venta.</p>
          )}

          <ErrorBox error={errorVenta} onCerrar={() => setErrorVenta(null)} />
          {cajaAbierta === false && (
            <div className="caja-cerrada" role="status">
              <p className="mb-2">Tu caja está cerrada. Abre tu turno para poder cobrar.</p>
              <Button color="primary" outline size="sm" onClick={() => navigate('/caja')}>
                Abrir caja
              </Button>
            </div>
          )}
          {faltaCliente && carrito.length > 0 && (
            <p className="ticket-nota">El crédito fiscal necesita razón social, NIT y NRC.</p>
          )}
          {metodoPago === 'efectivo' && carrito.length > 0 && !montoRecibido && (
            <p className="ticket-nota">Escribe cuánto efectivo recibiste para calcular el cambio.</p>
          )}

          <Button color="primary" size="lg" className="w-100" onClick={cobrar} disabled={!puedeCobrar}>
            {enviando && <Spinner size="sm" className="me-2" />}
            Cobrar {total > 0 && dinero(total)}
          </Button>
          {carrito.length > 0 && (
            <Button color="link" size="sm" className="w-100 text-secondary mt-1" onClick={limpiarVenta} disabled={enviando}>
              Vaciar orden
            </Button>
          )}
        </div>
      </aside>

      {carrito.length > 0 && (
        <button
          type="button"
          className="pos-barra-orden"
          onClick={() => ticketRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span>Ver orden ({carrito.reduce((suma, item) => suma + item.cantidad, 0)})</span>
          <span>{dinero(total)}</span>
        </button>
      )}

      <Modal
        abierto={Boolean(ventaCreada)}
        titulo={`Venta registrada: ${ventaCreada?.correlativo ?? ''}`}
        onCerrar={() => setVentaCreada(null)}
        onCancelar={() => navigate(`/facturas/${ventaCreada.id}`)}
        onConfirmar={() => setVentaCreada(null)}
        textoConfirmar="Nueva venta"
        textoCancelar="Ver factura"
      >
        {ventaCreada && (
          <div className="venta-ok">
            {ventaCreada.metodo_pago === 'efectivo' ? (
              <>
                <p className="venta-ok-etiqueta">Cambio a entregar</p>
                <p className="venta-ok-cambio">
                  <NumeroAnimado valor={ventaCreada.cambio} desde={0} formato={dinero} duracion={700} />
                </p>
              </>
            ) : (
              <>
                <p className="venta-ok-etiqueta">Cobrado con {METODOS_PAGO[ventaCreada.metodo_pago].toLowerCase()}</p>
                <p className="venta-ok-cambio">{dinero(ventaCreada.total)}</p>
              </>
            )}
            <div className="venta-ok-datos">
              <span>Total <strong>{dinero(ventaCreada.total)}</strong></span>
              {ventaCreada.metodo_pago === 'efectivo' && (
                <span>Recibido <strong>{dinero(ventaCreada.monto_recibido)}</strong></span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default POS
