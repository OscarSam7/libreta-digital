# 🚀 LibretaDigital Pro - Arquitectura y Guía de Uso

**LibretaDigital Pro** es una Progressive Web App (PWA) FinTech / POS orientada a comercios minoristas (almacenes, despensas, autoservicios, kioscos) para la gestión contable inmutable de cuentas corrientes ("fiado"), pagos y certificación mutua anti-disputas.

---

## 📂 Estructura del Proyecto Creado

```
libreta-digital/
├── public/
│   ├── manifest.json            # Configuración PWA (Instalable en Android/iOS)
│   └── favicon.ico
├── src/
│   ├── types/
│   │   └── index.ts             # Tipos TypeScript: Tenant, Customer, Transaction, Ledger
│   ├── lib/
│   │   ├── storage.ts           # Almacenamiento local con sincronización reactiva entre ventanas
│   │   ├── ledger.ts            # Motor Ledger Append-Only & Doble Certificación con PIN/Hash
│   │   ├── customers.ts         # Creación de clientes con generación de UUID y PIN maestro
│   │   └── reports.ts           # Exportador CSV para Excel e integración a WhatsApp API
│   ├── components/
│   │   ├── MerchantDashboard.tsx    # POS Comerciante: KPIs en vivo, buscador instantáneo, libro mayor
│   │   ├── QuickTransactionModal.tsx# Modal rápido táctil de Fiado/Abono + Validación
│   │   ├── CustomerQRModal.tsx      # Generador de Código QR + PIN mostrador + Enlace directo
│   │   ├── CreateCustomerModal.tsx  # Alta rápida de clientes con control de límite de crédito
│   │   └── CustomerPortalView.tsx   # Vista Mobile-First del cliente con firma remota por PIN
│   └── app/
│       ├── page.tsx                 # Dashboard principal del Comerciante
│       ├── layout.tsx               # Shell PWA con meta-tags móviles
│       └── portal/[token]/page.tsx  # Portal público reactivo del cliente con token seguro
```

---

## 🛠️ Cómo Iniciar la Aplicación

1. **Entrar al directorio del proyecto:**
   ```bash
   cd libreta-digital
   ```

2. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación se encuentra corriendo en: `http://localhost:3000`

---

## 📱 Flujos Operativos Implementados

### 1. Panel del Comerciante (`http://localhost:3000`)
- **KPIs en Tiempo Real:** 
  - Capital total en la calle (saldo acumulado adeudado).
  - Total cobrado hoy en abonos/pagos.
  - Alerta de clientes que superan el límite de crédito acordado.
- **Buscador Reactivo:** Búsqueda instantánea por nombre, teléfono o documento.
- **Carga Rápida de Operaciones:**
  - Botón táctil para alternar entre **Fiado (Cargo)** y **Abono (Pago)**.
  - Generación de código dinámico de 4 dígitos para certificar en mostrador.
- **Credencial QR & WhatsApp:**
  - Genera el código QR oficial del cliente.
  - Botón de WhatsApp que pre-arma el mensaje con el saldo al día y el enlace directo al portal.
- **Libro Mayor Inmutable:** Visualización cronológica de cada movimiento contable, impacto en saldos y hash de firma digital. Exportación a archivo **CSV/Excel**.

### 2. Portal Público del Cliente Vía QR (`http://localhost:3000/portal/[token]`)
- Puede probarse directamente en:
  - `http://localhost:3000/portal/rgomez-7b4c-4e89` (Roberto Gómez)
  - `http://localhost:3000/portal/lbenitez-992a-11f2` (Laura Benítez - con saldo excedido)
- **Diseño Mobile-First:** Tarjeta de saldo de alto contraste y tarjetas desplegables para consultar ítems comprados, saldo anterior y nuevo saldo.
- **Firma / Certificación Remota:** Si una operación quedó con estado `PENDIENTE_FIRMA`, el cliente puede ingresar su PIN personal de 4 dígitos desde su propio teléfono para firmarla y cambiar el estado a `CERTIFICADO_AMBAS_PARTES` con animación de confetti y registro de auditoría.
