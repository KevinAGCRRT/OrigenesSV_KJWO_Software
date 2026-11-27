// "Base de datos" de los datos simulados. Cada módulo registra sus
// colecciones con coleccion('nombre', datosIniciales) y llama a guardar()
// cuando cambia algo. Todo se guarda en sessionStorage para no perderlo al recargar.
const GUARDADO = 'origenes_mock'

const estado = JSON.parse(sessionStorage.getItem(GUARDADO) || '{}')

export function coleccion(nombre, semilla = []) {
  if (!estado[nombre]) {
    estado[nombre] = structuredClone(semilla)
  }
  return estado[nombre]
}

export function existe(nombre) {
  return Array.isArray(estado[nombre])
}

export function guardar() {
  sessionStorage.setItem(GUARDADO, JSON.stringify(estado))
}

export function siguienteId(lista) {
  return lista.reduce((mayor, item) => Math.max(mayor, item.id), 0) + 1
}

// Lanza un error con la misma forma que el backend: { mensaje, codigo, detalles }
export function fallar(status, mensaje, detalles = null, codigo = null) {
  throw { status, mensaje, detalles, codigo }
}

// YYYY-MM-DD en hora local (los filtros de fecha del frontend usan hora local)
export function diaLocal(valor = new Date()) {
  const fecha = new Date(valor)
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset())
  return fecha.toISOString().slice(0, 10)
}

export function hoyALas(hora, minuto, diasAtras = 0) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - diasAtras)
  fecha.setHours(hora, minuto, 0, 0)
  return fecha.toISOString()
}
