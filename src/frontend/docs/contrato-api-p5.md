# API que consume el frontend de P5

Rutas reales del backend en `develop` (revisado el 26-nov-2026, después de los PR #8 y #9) y cómo las usa el frontend.

- **Conversión de formatos:** está toda en `src/api/adaptadores.js`. Si el backend cambia un campo, solo se toca ese archivo.
- **Base:** `VITE_API_URL`, por defecto `http://localhost:3000/api`.
- **Token:** se manda en el header `Authorization: Bearer <token>`.
- **Errores:** el frontend lee el texto de `mensaje` y, si viene, el campo opcional `codigo`.

| Status | El frontend hace |
|---|---|
| 400 / 404 / 409 / 500 | Muestra el `mensaje` |
| 401 en cualquier ruta (menos el login) | Borra la sesión y regresa al login |

---

## Login (P4) — listo

### `POST /auth/login`

```json
{ "username": "cajero", "password": "1234" }
```

```json
{
  "mensaje": "Inicio de sesión exitoso",
  "token": "eyJ...",
  "usuario": { "id_usuario": 2, "id_empleado": 2, "username": "cajero", "nombre": "Carlos", "apellido": "Rivas", "rol": "cajero", "id_sucursal": 1 }
}
```

- El JWT trae `id_usuario`, `id_empleado`, `rol`, `id_sucursal` y `exp` (dura 8 h). El frontend cierra la sesión sola cuando vence.
- `rol` vale `gerente`, `cajero` o `barista`.
- **Falta:** el nombre de la sucursal. Mientras no venga, el frontend muestra el número.

### `GET /auth/perfil`
Responde `{ mensaje, usuario }` con los datos del token.

---

## Productos e inventario — listo

### `GET /productos`
```json
[{ "id_producto": 4, "nombre": "Latte Grande 16oz", "precio_venta": 3.75, "es_elaborado": true, "id_insumo_reventa": null,
   "receta": [{ "id_insumo": 3, "insumo": "Vaso Desechable 16oz", "cantidad_requerida": 1, "unidad_medida": "unidades" }] }]
```

### `GET /inventario/:idSucursal`
```json
[{ "id_insumo": 3, "insumo": "Vaso Desechable 16oz", "stock_actual": 45, "stock_minimo": 100, ... }]
```

El POS calcula cuántas unidades alcanzan de cada producto:

- **Elaborado:** el mínimo de `stock_actual ÷ cantidad_requerida` entre todos los insumos de su receta.
- **Reventa:** el stock de su `id_insumo_reventa`.

**Falta:** el campo `categoria` en productos. Mientras no exista, el POS los agrupa en "Menú" y "Para llevar".

---

## Ventas (P2) — listo, con pendientes

Todas piden token y rol `gerente` o `cajero`. La sucursal sale del token.

**Los precios se guardan SIN IVA.** El total se calcula así:

- `subtotal` = suma de precio × cantidad
- `iva` = 13% del subtotal, redondeado a centavos
- `total` = subtotal + iva

El POS hace la misma cuenta para la vista previa.

### `POST /ventas`

Header obligatorio `Idempotency-Key` (de 16 a 100 caracteres):

```json
{ "tipo_documento": "FCF", "metodo_pago": "EFECTIVO", "productos": [{ "id_producto": 4, "cantidad": 2 }],
  "monto_recibido": 20, "cliente": null }
```

- `tipo_documento`: `FCF` o `CCF`.
- `metodo_pago`: `EFECTIVO`, `TARJETA`, `BITCOIN` o `CHIVO_WALLET`. En el frontend se manejan en minúscula (`efectivo`, `chivo_wallet`) y `formato.js` los convierte.
- El cajero debe tener una **caja abierta**; si no, responde **409** `"El empleado no tiene una caja abierta"` y el POS muestra el aviso de caja cerrada.
- La venta crea un ingreso en `movimientos_caja` con el método de pago.
- `monto_recibido` y `cliente` el frontend los manda, pero **el backend todavía no los guarda**.
- **201** responde con:

```json
{ "mensaje": "Venta registrada correctamente",
  "venta": { "id_venta": 3, "id_sucursal": 1, "id_caja": 1, "tipo_documento": "FCF", "correlativo": 2, "estado": "completada",
             "subtotal": "8.75", "iva": "1.14", "total": "9.89", "metodo_pago": "EFECTIVO",
             "detalle": [{ "id_producto": 4, "nombre": "Latte Grande 16oz", "cantidad": 2, "precio_unitario": "3.75", "total_producto": "7.50" }] } }
```

#### La clave de idempotencia

El POS genera una clave por orden (`nuevaClaveVenta()` en `ventas.api.js`) y la reutiliza si hay que reintentar el cobro. Si la primera petición sí llegó pero se perdió la respuesta, el backend responde **200** con `"Solicitud previamente procesada"` y la venta ya registrada (con `repetida: true` y sin detalle). En ese caso el frontend pide `GET /ventas/:id` para armar el ticket. Así no se cobra dos veces.

La clave se cambia en cuanto cambia el carrito, el documento o el método de pago.

El frontend muestra el correlativo como `FCF-000002` y el estado `completada` como "Emitida".

### `GET /ventas` y `GET /ventas/:id`

- `GET /ventas` devuelve la lista sin detalle.
- `GET /ventas/:id` trae el `detalle` con `id_producto`, `cantidad`, `precio_unitario` e `importe`. **No trae el nombre del producto**: el frontend lo cruza con `GET /productos`.
- `GET /ventas` todavía no filtra por `tipo_documento`, `estado`, `desde` ni `hasta`. El frontend manda esos filtros en la URL y además los aplica él mismo.
- Ninguna de las dos devuelve `metodo_pago` (solo queda en `movimientos_caja`).

### `PATCH /ventas/:id/anular`
```json
{ "reintegrarInventario": true, "motivo": "El cliente canceló el pedido" }
```

- Responde `{ mensaje, venta: { id_venta, estado: "anulada", inventario_reintegrado } }`. El frontend vuelve a pedir la venta completa.
- Registra un egreso "Reversión de venta" en la caja de la venta.
- Un cajero solo puede anular ventas de su propia caja (403 si no).
- **El backend todavía no guarda el `motivo`.**

### Pendientes de ventas

1. **Responder 409 con `codigo: "SIN_STOCK"`** cuando falta inventario. Hoy `inventario.service.js` lanza un `Error` sin `status` y el controlador responde 500 con un mensaje genérico.
2. **Guardar `metodo_pago`, `monto_recibido` y `cliente`** en la venta (con NIT y NRC para el CCF), y devolverlos en `GET /ventas/:id`.
3. **Guardar el `motivo` de la anulación.**
4. **Agregar el nombre del producto** al detalle de `GET /ventas/:id`.
5. **Filtros en `GET /ventas`** (`tipo_documento`, `estado`, `desde`, `hasta`).

---

## Caja (P3) — lo que usa el POS

El POS solo necesita saber si el cajero tiene caja abierta. El detalle de todas las rutas de caja está en `contrato-api-p7.md`.

Como todavía no existe una ruta para "mi caja abierta", `src/api/cajaActual.js` hace esto:

1. Pide `GET /cajas/actual`. Hoy responde 400 (el backend lee "actual" como un id inválido).
2. Si no existe, usa el id de caja que guardó en `localStorage` al abrir la caja o al vender, y pide `GET /cajas/:id`.
3. Si no tiene ningún id guardado (la caja se abrió en otra computadora), el POS no bloquea; si el backend responde 409 al cobrar, ahí muestra el aviso.

**Pendiente:** `GET /cajas/actual` → `{ caja, movimientos, arqueos }` de la caja `ABIERTA` del usuario, o `{ caja: null }`. Con eso el paso 2 y 3 sobran.
