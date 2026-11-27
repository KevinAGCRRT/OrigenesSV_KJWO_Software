import { useEffect, useRef, useState } from 'react'

// basado en "Number Ticker" de 21st.dev
const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function NumeroAnimado({ valor, desde, formato = (n) => n, duracion = 450 }) {
  const [mostrado, setMostrado] = useState(desde ?? valor)
  const anterior = useRef(desde ?? valor)

  useEffect(() => {
    const desde = anterior.current
    const hasta = Number(valor) || 0
    anterior.current = hasta

    if (desde === hasta || sinMovimiento()) {
      setMostrado(hasta)
      return
    }

    let frame
    const inicio = performance.now()

    const paso = (ahora) => {
      const progreso = Math.min((ahora - inicio) / duracion, 1)
      const suavizado = 1 - Math.pow(1 - progreso, 3)
      setMostrado(desde + (hasta - desde) * suavizado)
      if (progreso < 1) frame = requestAnimationFrame(paso)
    }

    frame = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(frame)
  }, [valor, duracion])

  return (
    <>
      <span aria-hidden="true">{formato(mostrado)}</span>
      <span className="visually-hidden">{formato(valor)}</span>
    </>
  )
}

export default NumeroAnimado
