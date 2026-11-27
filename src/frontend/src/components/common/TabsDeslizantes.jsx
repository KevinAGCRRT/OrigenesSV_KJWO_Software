import { useLayoutEffect, useRef, useState } from 'react'

// basado en "Animated Tabs" de 21st.dev
function TabsDeslizantes({ opciones, activo, onCambiar, variante = 'segmento', etiqueta }) {
  const contenedor = useRef(null)
  const botones = useRef({})
  const [indicador, setIndicador] = useState(null)

  useLayoutEffect(() => {
    const medir = () => {
      const boton = botones.current[activo]
      if (!boton) return
      setIndicador({
        x: boton.offsetLeft,
        y: boton.offsetTop,
        ancho: boton.offsetWidth,
        alto: boton.offsetHeight
      })
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [activo, opciones])

  // flechas del teclado
  const conTeclado = (e, indice) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const paso = e.key === 'ArrowRight' ? 1 : -1
    const siguiente = opciones[(indice + paso + opciones.length) % opciones.length]
    onCambiar(siguiente.valor)
    botones.current[siguiente.valor]?.focus()
  }

  return (
    <div ref={contenedor} className={`tabs-deslizantes tabs-${variante}`} role="radiogroup" aria-label={etiqueta}>
      {indicador && (
        <span
          className="tabs-indicador"
          aria-hidden="true"
          style={{
            width: indicador.ancho,
            height: indicador.alto,
            transform: `translate(${indicador.x}px, ${indicador.y}px)`
          }}
        />
      )}
      {opciones.map((op, i) => (
        <button
          key={op.valor}
          ref={(el) => (botones.current[op.valor] = el)}
          type="button"
          role="radio"
          aria-checked={activo === op.valor}
          tabIndex={activo === op.valor ? 0 : -1}
          className={activo === op.valor ? 'activo' : ''}
          onClick={() => onCambiar(op.valor)}
          onKeyDown={(e) => conTeclado(e, i)}
        >
          {op.texto}
        </button>
      ))}
    </div>
  )
}

export default TabsDeslizantes
