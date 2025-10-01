# 📦 Inventario & Ventas

Sistema web para **gestión de inventario, ventas, caja por ubicación y transferencias**, construido con **Laravel + Inertia + React (Breeze, dark mode)** y **MySQL**.

---

## Tabla de contenidos

- [Descripción](#descripción)
- [Arquitectura y stack](#arquitectura-y-stack)
- [Menú y funcionalidades](#menú-y-funcionalidades)
- [Roles y permisos](#roles-y-permisos)
- [Modelo de datos (ER)](#modelo-de-datos-er)
- [Lógica de negocio](#lógica-de-negocio)
- [Wireframes / estructura de pantallas](#wireframes--estructura-de-pantallas)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Comandos útiles](#comandos-útiles)
- [Consultas de referencia](#consultas-de-referencia)
- [Índices recomendados](#índices-recomendados)
- [Roadmap](#roadmap)
- [Licencia](#licencia)

---

## Descripción

El sistema permite:

- Registrar **ventas** con control estricto de **stock por ubicación**.
- Administrar **productos** y existencias en **múltiples ubicaciones**.
- **Transferir inventario** y **transferir/retirar efectivo** por ubicación.
- Obtener **KPIs y gráficas** (top productos, top ubicaciones, ventas vs pagos, métodos de pago).
- Operar en **modo oscuro** (Breeze + Tailwind).

> En este proyecto, una **venta efectiva** para el dashboard se define como aquella con **`sales.status = 'pagado'` y `sales.location_id NOT NULL`**.

---

## Arquitectura y stack

- **Backend:** Laravel 10, PHP 8.2, Eloquent, Spatie Roles/Permissions.
- **Frontend:** React 18, Inertia.js, Tailwind (Breeze con dark mode), Recharts.
- **Base de datos:** MySQL 8 (compatible 5.7).
- **Autenticación:** Breeze (sesiones).
- **Patrones:** Servicios/Repos opcional, Controladores finos, Validaciones FormRequest (sugerido).

---

## Menú y funcionalidades

### Dashboard
- KPIs: **Ventas**, **Pagos recibidos**, **Ticket promedio**.
- Gráficas:
  - **Líneas:** Ventas vs. Pagos por día (rango seleccionable).
  - **Barras:** Top productos (por cantidad).
  - **Barras:** Top ubicaciones (por monto).
  - **Pie:** Distribución por método de pago.
- Filtros: Desde/Hasta, atajos “Últimos 7/30 días”.

### Productos
- CRUD de inventarios (unidad, precio compra/venta).
- Reglas de cantidad por unidad: `pcs` (enteros) vs fraccionables (múltiplos de **0.5**).

### Ventas
- Crear/editar/anular ventas.
- Ubicación obligatoria en cabecera o por línea (override).
- **Validación de stock por ubicación** y movimientos `inventory_moves (out)`.
- Registro de **pagos** (método, referencia, fecha).
- Estados: `pagado | parcial | debe | anulada`.
- Reverso de stock/caja al **anular**.

### Stock Totales
- Consolidado global: on_hand/reserved/disponible.

### Stock por Ubicación
- Detalle por `location`.
- Historial de `inventory_moves`.

### Transferencias
- **Inventario** entre ubicaciones (movimientos in/out espejo).
- **Efectivo** entre ubicaciones (CASH_TRANSFER), con nota y sufijo “· se quedó sin efectivo” si el saldo final del origen va a 0.

### Caja / Efectivo
- Saldos por ubicación (`location_cashes`).
- Movimientos (`cash_moves`): `SALE`, `SALE_PAYMENT`, `SALE_CANCEL`, `CASH_TRANSFER`, `CASH_PICKUP`.
- Acciones admin: **Transferir** y **Recoger** efectivo.

### Usuarios
- Gestión de usuarios y roles/permisos (Spatie).

---

## Roles y permisos

| Recurso / Acción           | super-admin | admin | dealer | vendedor |
|----------------------------|:-----------:|:-----:|:------:|:--------:|
| Dashboard (ver)            | ✅ | ✅ | ✅ | ✅ |
| Productos (CRUD)           | ✅ | ✅ | ❌ | R |
| Stock (ver)                | ✅ | ✅ | ✅ | ✅ |
| Transferencias inventario  | ✅ | ✅ | ✅(solo propias) | ❌ |
| Caja: ver movimientos      | ✅ | ✅ | ✅(propias) | ✅(propias) |
| Caja: transferir/retirar   | ✅ | ✅ | ❌ | ❌ |
| Ventas (crear)             | ✅ | ✅ | ✅ | ✅ |
| Ventas (anular)            | ✅ | ✅ | ❌ | ❌ |
| Usuarios (CRUD/roles)      | ✅ | ✅ | ❌ | ❌ |

> *R = lectura*

---

## Modelo de datos (ER)

> Diagrama Mermaid (se renderiza en GitHub):

```mermaid
erDiagram
  users ||--o{ sales : "crea"
  users ||--o{ transfers : "crea"
  users ||--o{ cash_moves : "crea"

  roles ||--o{ model_has_roles : ""
  permissions ||--o{ model_has_permissions : ""

  locations ||--o{ location_cashes : "1-1"
  locations ||--o{ inventory_stocks : ""
  locations ||--o{ inventory_moves : ""
  locations ||--o{ cash_moves : ""
  locations ||--o{ transfers : "origen/destino"

  inventories ||--o{ inventory_stocks : ""
  inventories ||--o{ inventory_moves : ""
  inventories ||--o{ sale_items : ""

  sales ||--o{ sale_items : ""
  sales ||--o{ payments : ""
  sales ||--o| sale_voids : "1-0/1"
  sale_items ||--o{ inventory_moves : ""

  payment_methods ||--o{ payments : ""

  transfers ||--o{ transfer_items : ""
