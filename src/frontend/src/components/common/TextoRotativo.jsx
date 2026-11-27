import { useEffect, useState } from 'react'

// basado en "Text Rotate" de 21st.dev
function TextoRotativo({ palabras, intervalo = 2200 }) {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => {
      setIndice((actual) => (actual + 1) % palabras.length)
    }, intervalo)
    return () => clearInterval(timer)
  }, [palabras.length, intervalo])

  return (
    <span className="texto-rotativo" aria-live="off">
      <span key={palabras[indice]} className="texto-rotativo-palabra">
        {palabras[indice]}
      </span>
    </span>
  )
}

export default TextoRotativo
