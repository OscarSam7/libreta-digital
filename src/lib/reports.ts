import { Transaction, Customer, Tenant } from '@/types';
import { sanitizeCSVCell } from '@/lib/validation';

export function exportTransactionsToCSV(
  transactions: Transaction[],
  tenant: Tenant,
  customerName?: string,
  customersMap?: Map<string, string>
) {
  const headers = [
    'ID_Operacion',
    'Fecha_Hora',
    'Cliente',
    'Tipo',
    'Detalle_Productos',
    'Medio_Pago',
    'Referencia',
    `Monto_${tenant.currency_code}`,
    'Saldo_Anterior',
    'Saldo_Nuevo',
    'Estado_Validacion',
    'Metodo_Firma',
  ];

  const rows = transactions.map((t) => [
    sanitizeCSVCell(t.id),
    sanitizeCSVCell(new Date(t.created_at).toLocaleString('es-PY')),
    sanitizeCSVCell(customersMap?.get(t.customer_id) || t.customer_id),
    sanitizeCSVCell(t.type),
    sanitizeCSVCell(t.description || ''),
    sanitizeCSVCell(t.payment_method || (t.type === 'CREDIT_PAYMENT' ? 'EFECTIVO' : 'N/A')),
    sanitizeCSVCell(t.payment_reference || ''),
    t.amount.toFixed(2),
    t.previous_balance.toFixed(2),
    t.new_balance.toFixed(2),
    sanitizeCSVCell(t.status),
    sanitizeCSVCell(t.validation_method || 'SIN_FIRMA'),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const fileName = customerName
    ? `Reporte_Ventas_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    : `Reporte_Ventas_y_Movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface CustomerPortfolioSummary {
  customer: Customer;
  statusCategory: 'MORA' | 'AL_DIA' | 'PENDIENTE' | 'EXCEDIDO' | 'BLOQUEADO';
  currentBalance: number;
  creditLimit: number;
  limitUsagePercent: number;
  purchasesInPeriod: number;
  paymentsInPeriod: number;
  lastPaymentDate: string | null;
  lastPurchaseDate: string | null;
  daysWithoutPayment: number | null;
}

export function exportCustomersPortfolioToCSV(
  portfolio: CustomerPortfolioSummary[],
  tenant: Tenant,
  dateFrom: string,
  dateTo: string
) {
  const headers = [
    'Cliente',
    'Apodo_Alias',
    'Documento_ID',
    'Telefono',
    'Estado_Crediticio',
    `Saldo_Pendiente_${tenant.currency_code}`,
    `Limite_Credito_${tenant.currency_code}`,
    'Porcentaje_Uso_Limite',
    `Compras_Periodo_${tenant.currency_code}`,
    `Pagos_Periodo_${tenant.currency_code}`,
    'Fecha_Ultimo_Pago',
    'Dias_Sin_Pagar_Mora',
    'Fecha_Ultima_Compra',
  ];

  const rows = portfolio.map((item) => {
    const c = item.customer;
    const statusLabel =
      item.statusCategory === 'MORA'
        ? 'EN MORA (Atrasado)'
        : item.statusCategory === 'EXCEDIDO'
        ? 'LIMITE EXCEDIDO'
        : item.statusCategory === 'BLOQUEADO'
        ? 'BLOQUEADO'
        : item.statusCategory === 'PENDIENTE'
        ? 'CON SALDO PENDIENTE'
        : 'AL DIA (Sin Deuda)';

    return [
      sanitizeCSVCell(c.full_name),
      sanitizeCSVCell(c.nickname || ''),
      sanitizeCSVCell(c.document_id || ''),
      sanitizeCSVCell(c.phone || ''),
      sanitizeCSVCell(statusLabel),
      item.currentBalance.toFixed(2),
      item.creditLimit.toFixed(2),
      item.limitUsagePercent.toFixed(1) + '%',
      item.purchasesInPeriod.toFixed(2),
      item.paymentsInPeriod.toFixed(2),
      sanitizeCSVCell(item.lastPaymentDate ? item.lastPaymentDate.slice(0, 10) : 'SIN PAGOS'),
      item.daysWithoutPayment !== null ? item.daysWithoutPayment.toString() : 'N/A',
      sanitizeCSVCell(item.lastPurchaseDate ? item.lastPurchaseDate.slice(0, 10) : 'SIN COMPRAS'),
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Reporte_Cartera_Clientes_Mora_AlDia_${dateFrom}_al_${dateTo}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateWhatsAppReminderUrl(customer: Customer, tenant: Tenant) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://libretadigital.app';
  const portalUrl = `${origin}/portal/${customer.qr_token}`;

  const message =
    `Hola *${customer.full_name}*! Te compartimos tu estado de cuenta al día en *${tenant.business_name}*.\n\n` +
    `💳 *Saldo Deudor Actual:* ${tenant.currency_symbol} ${customer.current_balance.toLocaleString('es-PY')}\n` +
    `🔒 *Límite de Crédito:* ${tenant.currency_symbol} ${customer.credit_limit.toLocaleString('es-PY')}\n\n` +
    `Accedé a tu estado de cuenta oficial y convalidá operaciones desde tu móvil aquí:\n` +
    `${portalUrl}\n\n` +
    `_Tu PIN de seguridad para autorizar en mostrador:_ *${customer.security_pin}*`;

  const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
