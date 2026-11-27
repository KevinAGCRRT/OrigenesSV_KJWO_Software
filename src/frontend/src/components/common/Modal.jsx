import { Modal as RsModal, ModalHeader, ModalBody, ModalFooter, Button, Spinner } from 'reactstrap'

// con textoConfirmar={null} no muestra los botones
function Modal({
  abierto,
  titulo,
  children,
  onCerrar,
  onConfirmar,
  onCancelar,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  colorConfirmar = 'primary',
  cargando = false,
  deshabilitado = false
}) {
  return (
    <RsModal isOpen={abierto} toggle={cargando ? undefined : onCerrar} centered>
      <ModalHeader toggle={cargando ? undefined : onCerrar}>{titulo}</ModalHeader>
      <ModalBody>{children}</ModalBody>
      {textoConfirmar && (
        <ModalFooter>
          <Button color="link" className="text-secondary" onClick={onCancelar || onCerrar} disabled={cargando}>
            {textoCancelar}
          </Button>
          <Button color={colorConfirmar} onClick={onConfirmar} disabled={cargando || deshabilitado}>
            {cargando && <Spinner size="sm" className="me-2" />}
            {textoConfirmar}
          </Button>
        </ModalFooter>
      )}
    </RsModal>
  )
}

export default Modal
