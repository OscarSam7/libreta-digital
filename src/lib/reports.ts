import { Transaction, Customer, Tenant } from '@/types';
import { sanitizeCSVCell } from '@/lib/validation';
import { getCustomerDueStatus } from '@/lib/overdue';
import {
  AppLocale,
  getCurrentLocale,
  getDateLocale,
  tLocale,
  appendLocaleQuery,
} from '@/lib/i18n';

export function exportTransactionsToCSV(
  transactions: Transaction[],
  tenant: Tenant,
  customerName?: string,
  customersMap?: Map<string, string>,
  locale?: AppLocale
) {
  const activeLocale = locale ?? getCurrentLocale();
  const isPt = activeLocale === 'pt';
  const dateLocale = getDateLocale(activeLocale);

  const headers = isPt
    ? [
        'ID_Operacao',
        'Data_Hora',
        'Cliente',
        'Tipo',
        'Detalhes_Produtos',
        'Meio_Pagamento',
        'Referencia',
        `Valor_${tenant.currency_code}`,
        'Saldo_Anterior',
        'Saldo_Atual',
        'Status_Validacao',
        'Metodo_Assinatura',
      ]
    : [
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
    sanitizeCSVCell(new Date(t.created_at).toLocaleString(dateLocale)),
    sanitizeCSVCell(customersMap?.get(t.customer_id) || t.customer_id),
    sanitizeCSVCell(t.type),
    sanitizeCSVCell(t.description || ''),
    sanitizeCSVCell(t.payment_method || (t.type === 'CREDIT_PAYMENT' ? (isPt ? 'DINHEIRO' : 'EFECTIVO') : 'N/A')),
    sanitizeCSVCell(t.payment_reference || ''),
    t.amount.toFixed(2),
    t.previous_balance.toFixed(2),
    t.new_balance.toFixed(2),
    sanitizeCSVCell(t.status),
    sanitizeCSVCell(t.validation_method || (isPt ? 'SEM_ASSINATURA' : 'SIN_FIRMA')),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const fileName = isPt
    ? customerName
      ? `Relatorio_Vendas_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
      : `Relatorio_Vendas_e_Movimentacoes_${new Date().toISOString().slice(0, 10)}.csv`
    : customerName
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
  paymentDueDate?: string | null;
  daysOverdue?: number;
}

export function exportCustomersPortfolioToCSV(
  portfolio: CustomerPortfolioSummary[],
  tenant: Tenant,
  dateFrom: string,
  dateTo: string,
  locale?: AppLocale
) {
  const activeLocale = locale ?? getCurrentLocale();
  const isPt = activeLocale === 'pt';

  const headers = isPt
    ? [
        'Cliente',
        'Apelido_Referencia',
        'Documento_ID',
        'Telefone',
        'Situacao_Credito',
        `Saldo_Devedor_${tenant.currency_code}`,
        `Limite_Credito_${tenant.currency_code}`,
        'Percentual_Uso_Limite',
        `Compras_Periodo_${tenant.currency_code}`,
        `Pagamentos_Periodo_${tenant.currency_code}`,
        'Data_Ultimo_Pagamento',
        'Dias_Sem_Pagamento',
        'Data_Vencimento',
        'Dias_Em_Atraso',
        'Data_Ultima_Compra',
      ]
    : [
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
        'Fecha_Vencimiento',
        'Dias_Mora',
        'Fecha_Ultima_Compra',
      ];

  const rows = portfolio.map((item) => {
    const c = item.customer;
    const dueInfo = getCustomerDueStatus(c, new Date(), activeLocale);
    const effectiveDueDate =
      item.paymentDueDate ?? dueInfo.dueDate ?? (isPt ? 'SEM_VENCIMENTO' : 'SIN_VENCIMIENTO');
    const effectiveDaysOverdue = item.daysOverdue ?? dueInfo.daysOverdue;
    const statusLabel = isPt
      ? item.statusCategory === 'MORA'
        ? 'EM ATRASO'
        : item.statusCategory === 'EXCEDIDO'
        ? 'LIMITE EXCEDIDO'
        : item.statusCategory === 'BLOQUEADO'
        ? 'BLOQUEADO'
        : item.statusCategory === 'PENDIENTE'
        ? 'COM SALDO EM ABERTO'
        : 'EM DIA (Sem Divida)'
      : item.statusCategory === 'MORA'
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
      sanitizeCSVCell(
        item.lastPaymentDate ? item.lastPaymentDate.slice(0, 10) : isPt ? 'SEM PAGAMENTOS' : 'SIN PAGOS'
      ),
      item.daysWithoutPayment !== null ? item.daysWithoutPayment.toString() : 'N/A',
      sanitizeCSVCell(effectiveDueDate),
      effectiveDaysOverdue.toString(),
      sanitizeCSVCell(
        item.lastPurchaseDate ? item.lastPurchaseDate.slice(0, 10) : isPt ? 'SEM COMPRAS' : 'SIN COMPRAS'
      ),
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    isPt
      ? `Relatorio_Carteira_Clientes_Atraso_EmDia_${dateFrom}_ate_${dateTo}.csv`
      : `Reporte_Cartera_Clientes_Mora_AlDia_${dateFrom}_al_${dateTo}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateWhatsAppReminderUrl(customer: Customer, tenant: Tenant, locale?: AppLocale) {
  const activeLocale = locale ?? getCurrentLocale();
  const isPt = activeLocale === 'pt';
  const numLocale = getDateLocale(activeLocale);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://libretadigital.app';
  const portalUrl = appendLocaleQuery(`${origin}/portal/${customer.qr_token}`, activeLocale);
  const dueStatus = getCustomerDueStatus(customer, new Date(), activeLocale);

  const dueLine = dueStatus.dueDateFormatted
    ? `📅 *${isPt ? 'Vencimento' : 'Vencimiento'}:* ${dueStatus.dueDateFormatted}\n`
    : '';
  const moraLine =
    dueStatus.state === 'OVERDUE'
      ? `⚠️ *${isPt ? 'Atraso' : 'Mora'}:* *${dueStatus.label}*\n`
      : '';

  const message = isPt
    ? `Olá *${customer.full_name}*! Compartilhamos o extrato atualizado da sua conta em *${tenant.business_name}*.\n\n` +
      `💳 *Saldo Devedor Atual:* ${tenant.currency_symbol} ${customer.current_balance.toLocaleString(numLocale)}\n` +
      `🔒 *Limite de Crédito:* ${tenant.currency_symbol} ${customer.credit_limit.toLocaleString(numLocale)}\n` +
      dueLine +
      moraLine +
      `\nAcesse seu extrato oficial e valide operações pelo celular aqui:\n` +
      `${portalUrl}\n\n` +
      `_Seu PIN de segurança para autorizar no balcão:_ *${customer.security_pin}*`
    : `Hola *${customer.full_name}*! Te compartimos tu estado de cuenta al día en *${tenant.business_name}*.\n\n` +
      `💳 *Saldo Deudor Actual:* ${tenant.currency_symbol} ${customer.current_balance.toLocaleString(numLocale)}\n` +
      `🔒 *Límite de Crédito:* ${tenant.currency_symbol} ${customer.credit_limit.toLocaleString(numLocale)}\n` +
      dueLine +
      moraLine +
      `\nAccedé a tu estado de cuenta oficial y convalidá operaciones desde tu móvil aquí:\n` +
      `${portalUrl}\n\n` +
      `_Tu PIN de seguridad para autorizar en mostrador:_ *${customer.security_pin}*`;

  const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function generatePaymentReceiptWhatsAppUrl(
  customer: Customer,
  tenant: Tenant,
  transaction: Transaction,
  locale?: AppLocale
): string {
  const activeLocale = locale ?? getCurrentLocale();
  const isPt = activeLocale === 'pt';
  const numLocale = getDateLocale(activeLocale);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://libretadigital.app';
  const portalUrl = appendLocaleQuery(`${origin}/portal/${customer.qr_token}`, activeLocale);
  const receiptPdfUrl = appendLocaleQuery(`${origin}/recibo/${transaction.id}`, activeLocale);
  const isFullPayment = transaction.new_balance <= 0;
  const paymentBadge = isPt
    ? isFullPayment
      ? '✅ QUITAÇÃO TOTAL DA DÍVIDA'
      : '💳 PAGAMENTO PARCIAL NA CONTA'
    : isFullPayment
    ? '✅ CANCELACIÓN TOTAL DE DEUDA'
    : '💳 ABONO PARCIAL A CUENTA CORRIENTE';

  const dateStr = new Date(transaction.created_at).toLocaleString(numLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const cleanId = transaction.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const receiptNum = `REC-${new Date(transaction.created_at).getFullYear()}-${cleanId}`;

  const message = isPt
    ? `🧾 *COMPROVANTE OFICIAL DE PAGAMENTO EM PDF*\n` +
      `🏪 *${tenant.business_name.toUpperCase()}*\n` +
      (tenant.tax_id ? `📋 *CNPJ / Doc.:* ${tenant.tax_id}\n` : '') +
      (tenant.phone ? `📞 *Tel / WhatsApp:* ${tenant.phone}\n` : '') +
      (tenant.address ? `📍 *Endereço:* ${tenant.address}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 *Recibo Nº:* ${receiptNum}\n` +
      `📅 *Data:* ${dateStr}\n` +
      `👤 *Cliente:* ${customer.full_name}${customer.nickname ? ` (${customer.nickname})` : ''}\n` +
      (customer.document_id ? `🪪 *Documento/CPF:* ${customer.document_id}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💵 *DETALHAMENTO DO PAGAMENTO:*\n` +
      `• *Tipo:* ${paymentBadge}\n` +
      `• Saldo Anterior: ${tenant.currency_symbol} ${transaction.previous_balance.toLocaleString(numLocale)}\n` +
      `• *VALOR RECEBIDO:* *${tenant.currency_symbol} ${transaction.amount.toLocaleString(numLocale)}*\n` +
      `• *SALDO RESTANTE:* *${tenant.currency_symbol} ${transaction.new_balance.toLocaleString(numLocale)}*` +
      (isFullPayment ? ' 🎉 *(DÍVIDA QUITADA TOTALMENTE - EM DIA!)*' : '') + `\n` +
      `• *Meio de Pagamento:* ${transaction.payment_method || 'Dinheiro no Caixa'}` +
      (transaction.payment_reference ? ` (Ref: ${transaction.payment_reference})` : '') + `\n` +
      (transaction.operator_name ? `• *Operador/Caixa:* ${transaction.operator_name}\n` : '') +
      `• *Status:* Certificado e Registrado no Livro Razão\n` +
      (transaction.blockchain_hash ? `🔐 *Hash Imutável:* ${transaction.blockchain_hash}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `⬇️ *BAIXE SEU COMPROVANTE EM PDF AQUI:*\n` +
      `${receiptPdfUrl}\n\n` +
      `📱 *Consulte sua caderneta digital ao vivo:*\n` +
      `${portalUrl}\n\n` +
      `_Muito obrigado pelo seu pagamento e preferência em ${tenant.business_name}!_`
    : `🧾 *COMPROBANTE OFICIAL DE PAGO EN PDF*\n` +
      `🏪 *${tenant.business_name.toUpperCase()}*\n` +
      (tenant.tax_id ? `📋 *RUC / Ident:* ${tenant.tax_id}\n` : '') +
      (tenant.phone ? `📞 *Tel / WhatsApp:* ${tenant.phone}\n` : '') +
      (tenant.address ? `📍 *Dirección:* ${tenant.address}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 *Recibo N°:* ${receiptNum}\n` +
      `📅 *Fecha:* ${dateStr}\n` +
      `👤 *Cliente:* ${customer.full_name}${customer.nickname ? ` (${customer.nickname})` : ''}\n` +
      (customer.document_id ? `🪪 *Cédula/DNI:* ${customer.document_id}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💵 *DESGLOSE DEL PAGO:*\n` +
      `• *Tipo:* ${paymentBadge}\n` +
      `• Saldo Anterior: ${tenant.currency_symbol} ${transaction.previous_balance.toLocaleString(numLocale)}\n` +
      `• *MONTO RECIBIDO:* *${tenant.currency_symbol} ${transaction.amount.toLocaleString(numLocale)}*\n` +
      `• *SALDO RESTANTE:* *${tenant.currency_symbol} ${transaction.new_balance.toLocaleString(numLocale)}*` +
      (isFullPayment ? ' 🎉 *(¡DEUDA PAGADA TOTALMENTE - AL DÍA!)*' : '') + `\n` +
      `• *Medio de Pago:* ${transaction.payment_method || 'Efectivo en Caja'}` +
      (transaction.payment_reference ? ` (Ref: ${transaction.payment_reference})` : '') + `\n` +
      (transaction.operator_name ? `• *Operador/Cajero:* ${transaction.operator_name}\n` : '') +
      `• *Estado:* Certificado y Registrado en Libro Mayor\n` +
      (transaction.blockchain_hash ? `🔐 *Hash Inmutable:* ${transaction.blockchain_hash}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `⬇️ *DESCARGÁ TU COMPROBANTE EN FORMATO PDF AQUÍ:*\n` +
      `${receiptPdfUrl}\n\n` +
      `📱 *Consultá tu libreta digital en vivo:*\n` +
      `${portalUrl}\n\n` +
      `_¡Muchas gracias por su pago y preferencia en ${tenant.business_name}!_`;

  const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function generateDailyClosingWhatsAppUrl(
  tenant: Tenant,
  customers: Customer[],
  transactions: Transaction[],
  dateStr?: string,
  targetPhone?: string,
  locale?: AppLocale
): string {
  const activeLocale = locale ?? getCurrentLocale();
  const isPt = activeLocale === 'pt';
  const numLocale = getDateLocale(activeLocale);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://libretadigital.app';
  const now = new Date();
  const closingDate = dateStr || now.toLocaleDateString(numLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const closingTime = now.toLocaleTimeString(numLocale, { hour: '2-digit', minute: '2-digit' });

  // Calcular movimientos de la jornada
  const todayYMD = now.toISOString().slice(0, 10);
  const todayTxs = transactions.filter((t) => t.created_at.startsWith(todayYMD));

  const totalFiadoHoy = todayTxs
    .filter((t) => t.type === 'DEBIT_PURCHASE' || t.type === 'ADJUSTMENT_DEBIT')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCobradoHoy = todayTxs
    .filter((t) => t.type === 'CREDIT_PAYMENT')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCarteraPendiente = customers.reduce(
    (acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0),
    0
  );
  const clientesConDeuda = customers.filter((c) => c.current_balance > 0);
  const clientesAlDia = customers.filter((c) => c.current_balance <= 0);

  // Lista compacta de saldos ordenada descendentemente por deuda
  let listadoClientes = '';
  const sortedCustomers = [...customers].sort((a, b) => b.current_balance - a.current_balance);
  sortedCustomers.forEach((c, idx) => {
    const balanceFormatted = `${tenant.currency_symbol} ${c.current_balance.toLocaleString(numLocale)}`;
    const statusIcon = c.current_balance > 0 ? '🔴' : '🟢';
    listadoClientes += `${idx + 1}. ${statusIcon} *${c.full_name}*${c.nickname ? ` ("${c.nickname}")` : ''}: ${balanceFormatted}\n`;
  });

  const adminUrl = appendLocaleQuery(`${origin}/admin`, activeLocale);

  const message = isPt
    ? `🔒 *FECHAMENTO GERAL DE ATIVIDADES & BACKUP CONTÁBIL*\n` +
      `🏪 *${tenant.business_name.toUpperCase()}*\n` +
      (tenant.tax_id ? `📋 *CNPJ / Doc.:* ${tenant.tax_id}\n` : '') +
      (tenant.phone ? `📞 *Tel:* ${tenant.phone}\n` : '') +
      `📅 *Data e Hora de Corte:* ${closingDate} às ${closingTime}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📊 *RESUMO GERAL DE CAIXA E CARTEIRA:*\n` +
      `💰 *TOTAL DA CARTEIRA FIADA A RECEBER:* *${tenant.currency_symbol} ${totalCarteraPendiente.toLocaleString(numLocale)}*\n` +
      `📥 *Total Recebido Hoje:* ${tenant.currency_symbol} ${totalCobradoHoy.toLocaleString(numLocale)}\n` +
      `📤 *Total Fiado Hoje:* ${tenant.currency_symbol} ${totalFiadoHoy.toLocaleString(numLocale)}\n` +
      `👥 *Clientes com Dívida Ativa:* ${clientesConDeuda.length} de ${customers.length}\n` +
      `✅ *Clientes em Dia (${tenant.currency_symbol} 0):* ${clientesAlDia.length}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *RELATÓRIO COMPACTO DE SALDOS NO FECHAMENTO:*\n` +
      listadoClientes +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🛡️ *REGISTRO DE BACKUP E SEGURANÇA IMUTÁVEL:*\n` +
      `Esta mensagem contém o extrato consolidado exato dos saldos no fechamento das atividades. Guarde-o no seu WhatsApp como respaldo contábil oficial em caso de troca ou perda de aparelho.\n\n` +
      `📱 *Painel de Gestão LibretaDigital:* ${adminUrl}`
    : `🔒 *CIERRE GENERAL DE ACTIVIDADES & RESPALDO CONTABLE*\n` +
      `🏪 *${tenant.business_name.toUpperCase()}*\n` +
      (tenant.tax_id ? `📋 *RUC / Ident:* ${tenant.tax_id}\n` : '') +
      (tenant.phone ? `📞 *Tel:* ${tenant.phone}\n` : '') +
      `📅 *Fecha y Hora de Corte:* ${closingDate} a las ${closingTime}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📊 *RESUMEN GENERAL DE CAJA Y CARTERA:*\n` +
      `💰 *TOTAL CARTERA FIADA EN LA CALLE:* *${tenant.currency_symbol} ${totalCarteraPendiente.toLocaleString(numLocale)}*\n` +
      `📥 *Total Cobrado Hoy:* ${tenant.currency_symbol} ${totalCobradoHoy.toLocaleString(numLocale)}\n` +
      `📤 *Total Fiado Hoy:* ${tenant.currency_symbol} ${totalFiadoHoy.toLocaleString(numLocale)}\n` +
      `👥 *Clientes con Deuda Activa:* ${clientesConDeuda.length} de ${customers.length}\n` +
      `✅ *Clientes al Día (${tLocale('$0', 'R$ 0', activeLocale)}):* ${clientesAlDia.length}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *RELATORIO COMPACTO DE SALDOS AL CIERRE:*\n` +
      listadoClientes +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🛡️ *CONSTANCIA DE RESPALDO Y SEGURIDAD INMUTABLE:*\n` +
      `Este mensaje contiene el extracto consolidado exacto de saldos al cierre de actividades. Guárdelo en su WhatsApp como resguardo contable oficial ante cualquier contingencia, pérdida de dispositivo o falla técnica (Validez Ley N° 6822/21 y Ley N° 6534/20).\n\n` +
      `📱 *Panel de Gestión LibretaDigital:* ${adminUrl}`;

  const phone = (targetPhone || tenant.phone || '').replace(/[^0-9]/g, '');
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}
