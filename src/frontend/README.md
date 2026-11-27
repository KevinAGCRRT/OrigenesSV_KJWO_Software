# Frontend: Restaurante Orígenes SV

Aplicación hecha con React, Vite, React Router y Reactstrap para el ERP y POS de Orígenes SV.

## Cómo correrlo

```bash
cd src/frontend
npm install
cp .env.example .env   # en Windows: copy .env.example .env
npm run dev
```

Luego abre http://localhost:5173.

### Requisitos

El frontend necesita la API del backend corriendo en `http://localhost:3000` (con SQL Server encendido) y usuarios en la base. La app debe abrirse en `http://localhost:5173`, que es el origen que acepta el backend.

### Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `VITE_API_URL` | URL de la API Express, por ejemplo `http://localhost:3000/api` |

En el repo, el frontend vive en `src/frontend/`, al lado de `src/backend/`. El backend corre en `http://localhost:3000` y expone sus rutas bajo `/api`.

## Estructura

```
src/
├── api/            client.js (base de todas las llamadas) y un archivo por módulo
├── context/        AuthContext: usuario, rol, sucursal y token
├── components/
│   ├── layout/     Layout, Sidebar (menú según el rol), Navbar
│   ├── common/     Tabla, Modal, Alerta, Loader, ErrorBox
│   ├── ventas/     ProductoCard
│   └── ProtectedRoute.jsx
├── pages/          una carpeta por módulo
└── utils/          formato.js (moneda y fechas), impuestos.js (IVA 13%)
```

## Para P6 y P7

1. Creen sus páginas en `pages/<modulo>/`.
2. En `App.jsx`, cambien el `<EnConstruccion ... />` de su ruta por su página. Las rutas y los roles ya están puestos.
3. Hagan sus llamadas en su archivo de `api/`, siempre a través de `client.js`:

   ```js
   import client from './client.js'
   export const getInsumos = () => client.get('/insumos')
   ```

4. En la página, usen `async/await` con `try/catch` y muestren el error con `<ErrorBox error={error} />`.
5. P6: el `StockBadge` va en `components/layout/Navbar.jsx`, donde está el comentario.

## Detalles del POS

- **Atajos:**
  - `/` enfoca la búsqueda;
  - `Esc` la limpia;
  - `Ctrl` + `Enter` cobra.
- **La orden en curso se guarda en `sessionStorage`:** si la página se recarga a media venta, no se pierde.
- **Aviso de caja cerrada:** al entrar, el POS revisa si el cajero tiene caja abierta (`src/api/cajaActual.js`). Si está cerrada, muestra un aviso con un botón para abrir caja y no deja cobrar. Si no se puede saber (la caja se abrió en otra computadora), no bloquea: el backend responde 409 al cobrar y ahí aparece el aviso.
- **Cobro sin duplicados:** cada orden lleva una clave `Idempotency-Key`. Si se reintenta el cobro de la misma orden, el backend devuelve la venta ya registrada en vez de crear otra.
- **Métodos de pago:** efectivo, tarjeta, Bitcoin y Chivo Wallet, los mismos cuatro que cuadra el cierre de caja.
- **Cierre de sesión automático:** la sesión se cierra sola cuando vence el JWT (según su `exp`).
- **Formato del backend:** `src/api/adaptadores.js` convierte la respuesta real de `GET /api/productos` (`id_producto`, `precio_venta`, `es_elaborado`, `receta`) al formato del POS. Las unidades disponibles se calculan con la receta y `GET /api/inventario/:idSucursal`: en un producto elaborado manda el insumo que primero se acaba.
- **Exportar facturas:** en Facturas, el botón "Descargar CSV" exporta la lista filtrada para abrirla en Excel.

## Flujos para la defensa

**Login y rutas protegidas**

1. `Login.jsx` llama a `iniciarSesion()` del `AuthContext`.
2. El contexto llama a `POST /auth/login` y guarda el `token` y el `usuario` en `localStorage` y en el estado.
3. `client.js` lee el token y lo manda en cada petición con el header `Authorization: Bearer ...`.
4. `ProtectedRoute` revisa si hay sesión y si el rol está permitido. Si no hay sesión, manda a `/login`; si el rol no está permitido, manda a `/no-autorizado`.
5. Si la API responde `401`, `client.js` borra la sesión y regresa al login.

**Venta en el POS**

1. Al montar, `useEffect` carga los productos con `disponibles`.
2. Cada clic agrega el producto al carrito, que es un arreglo en `useState`. No deja pasar de `disponibles`.
3. `calcularTotales()` separa el IVA, porque los precios ya lo incluyen: `subtotal = total / 1.13`.
4. Al cobrar, se envía `POST /ventas` solo con `producto_id` y `cantidad`. El backend calcula los precios, valida el stock y la caja, descuenta el inventario y genera el correlativo.
5. Si responde `409` (sin stock), se muestra el detalle y se recargan los productos.

**Anulación**

- Solo la ve el gerente.
- Pide el motivo.
- Llama a `PATCH /ventas/:id/anular`; el backend devuelve el inventario.

El contrato completo de la API está en `docs/contrato-api-p5.md`.

## Componentes animados

Tomamos las ideas de componentes publicados en [21st.dev](https://21st.dev/community/components). Allá están hechos con Tailwind, shadcn y framer-motion; aquí los reescribimos solo con hooks de React y CSS, sin librerías nuevas.

| Componente | Dónde se usa | Idea original | Cómo funciona |
|---|---|---|---|
| `NumeroAnimado` | Totales del ticket, cambio, resumen de facturas | Number Ticker (Magic UI), Sliding Number (Motion Primitives) | `useEffect` + `requestAnimationFrame` interpolan del valor anterior al nuevo |
| `TabsDeslizantes` | Categorías, tipo de documento, método de pago | Animated Tabs (SmoothUI) | `useRef` mide el botón activo y un indicador se mueve con `transform`. Las flechas del teclado cambian la opción |
| `TextoRotativo` | Login | Text Rotate (Fancy Components) | `setInterval` cambia la palabra y la `key` vuelve a montar el `<span>` para repetir la animación |
| `Esqueleto` | Carga del menú y de facturas | Patrón skeleton | Bloques con brillo mientras llegan los datos |

Todas las animaciones se apagan si el sistema tiene activado "reducir movimiento" (`prefers-reduced-motion`).
