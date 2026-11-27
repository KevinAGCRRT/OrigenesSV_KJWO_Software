function EnConstruccion({ titulo, responsable }) {
  return (
    <div className="pagina-vacia">
      <h1 className="pagina-titulo">{titulo}</h1>
      <p className="text-secondary">
        Esta pantalla todavía no está lista. La está desarrollando {responsable}.
      </p>
    </div>
  )
}

export default EnConstruccion
