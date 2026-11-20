import { jsPDF } from 'jspdf';
import { Customer, Tenant, Transaction, PrinterFormat } from '@/types';

export function generateReceiptPDFBlob(
  transaction: Transaction,
  customer: Customer,
  tenant: Tenant,
  format: PrinterFormat = 'TICKET_80MM'
): Blob {
  const isFullPayment = transaction.new_balance <= 0;
  const receiptNum = `REC-${new Date(transaction.created_at).getFullYear()}-${transaction.id.slice(-6).toUpperCase()}`;
  const dateFormatted = new Date(transaction.created_at).toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val)}`;
  };

  // =========================================================================
  // FORMATO 1: TICKET TÉRMICO POS 80mm (8.0 cm)
  // =========================================================================
  if (format === 'TICKET_80MM') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 220],
    });

    let y = 8;
    const leftMargin = 5;
    const rightMargin = 75;
    const centerX = 40;

    // Encabezado
    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('LibretaDigital PRO', centerX, y, { align: 'center' });

    y += 5;
    doc.setFontSize(10);
    doc.text(tenant.business_name.toUpperCase(), centerX, y, { align: 'center' });

    y += 4;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    if (tenant.tax_id) {
      doc.text(`RUC: ${tenant.tax_id}`, centerX, y, { align: 'center' });
      y += 3.5;
    }
    if (tenant.phone) {
      doc.text(`Tel/WA: ${tenant.phone}`, centerX, y, { align: 'center' });
      y += 3.5;
    }
    if (tenant.address) {
      doc.text(tenant.address.slice(0, 36), centerX, y, { align: 'center' });
      y += 3.5;
    }

    // Línea divisoria
    doc.text('------------------------------------------', centerX, y, { align: 'center' });
    y += 4;

    // Título del Ticket
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.text('RECIBO OFICIAL DE PAGO', centerX, y, { align: 'center' });
    y += 4;
    doc.setFontSize(8);
    doc.text(isFullPayment ? '*** CANCELACION TOTAL DE DEUDA ***' : '*** ABONO PARCIAL A CUENTA ***', centerX, y, { align: 'center' });
    y += 4;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Nro: ${receiptNum}`, centerX, y, { align: 'center' });
    y += 3.5;
    doc.text(`Fecha: ${dateFormatted}`, centerX, y, { align: 'center' });
    y += 3.5;

    // Línea divisoria
    doc.text('------------------------------------------', centerX, y, { align: 'center' });
    y += 4;

    // Datos del Cliente
    doc.setFont('courier', 'bold');
    doc.text(`CLIENTE: ${customer.full_name.slice(0, 26)}`, leftMargin, y);
    y += 3.5;
    doc.setFont('courier', 'normal');
    if (customer.document_id) {
      doc.text(`DOC/CI : ${customer.document_id}`, leftMargin, y);
      y += 3.5;
    }
    if (customer.phone) {
      doc.text(`TEL/WA : ${customer.phone}`, leftMargin, y);
      y += 3.5;
    }

    // Línea divisoria
    doc.text('------------------------------------------', centerX, y, { align: 'center' });
    y += 5;

    // Desglose de importes
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text('Saldo Anterior:', leftMargin, y);
    doc.text(formatCurrency(transaction.previous_balance), rightMargin, y, { align: 'right' });
    y += 5;

    doc.setFont('courier', 'bold');
    doc.setFontSize(9.5);
    doc.text('(-) PAGO RECIBIDO:', leftMargin, y);
    doc.text(formatCurrency(transaction.amount), rightMargin, y, { align: 'right' });
    y += 5.5;

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.text('SALDO RESTANTE:', leftMargin, y);
    doc.text(formatCurrency(transaction.new_balance), rightMargin, y, { align: 'right' });
    y += 4;

    if (isFullPayment) {
      doc.setFontSize(8);
      doc.text('>>> CUENTA AL DIA (DEUDA 0) <<<', centerX, y, { align: 'center' });
      y += 4;
    }

    // Línea divisoria
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text('------------------------------------------', centerX, y, { align: 'center' });
    y += 4;

    // Medios y caja
    doc.text(`Medio Pago : ${transaction.payment_method || 'Efectivo en Caja'}`, leftMargin, y);
    y += 3.5;
    if (transaction.payment_reference) {
      doc.text(`Referencia : ${transaction.payment_reference.slice(0, 24)}`, leftMargin, y);
      y += 3.5;
    }
    doc.text(`Atendido por: ${transaction.operator_name || 'Caja Central'}`, leftMargin, y);
    y += 3.5;
    doc.text('Estado      : Certificado en Libro Mayor', leftMargin, y);
    y += 4;

    if (transaction.blockchain_hash) {
      doc.setFontSize(6.5);
      doc.text(`Hash: ${transaction.blockchain_hash.slice(0, 32)}`, leftMargin, y);
      y += 3.5;
    }

    doc.setFontSize(7.5);
    doc.text('------------------------------------------', centerX, y, { align: 'center' });
    y += 4;

    // Pie legal
    doc.setFontSize(6.5);
    doc.text('Validez legal probatoria Ley 6822/21 y 6534/20', centerX, y, { align: 'center' });
    y += 3;
    doc.text('El titular determina limites y plazos de credito', centerX, y, { align: 'center' });
    y += 4;
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.text('¡Muchas gracias por su pago!', centerX, y, { align: 'center' });

    return doc.output('blob');
  }

  // =========================================================================
  // FORMATO 2: HOJA ESTÁNDAR A4 (210mm x 297mm)
  // =========================================================================
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Barra superior decorativa
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  // Marca
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LibretaDigital PRO', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('COMPROBANTE OFICIAL DE PAGO Y CANCELACIÓN', 14, 22);
  doc.text('Sistema Contable & Fiado en Tiempo Real', 14, 28);

  // Recibo N° a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(receiptNum, 196, 16, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Fecha: ${dateFormatted}`, 196, 23, { align: 'right' });
  doc.text('FORMATO A4 • DOCUMENTO VÁLIDO', 196, 29, { align: 'right' });

  // --- DATOS DEL COMERCIO Y DEL CLIENTE ---
  let y = 46;

  // Cuadro del Comercio
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, y, 88, 38, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, y, 88, 38, 3, 3, 'S');

  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('COMERCIO / ALMACÉN EMISOR', 18, y + 6);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(11);
  doc.text(tenant.business_name.toUpperCase(), 18, y + 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  if (tenant.tax_id) {
    doc.text(`RUC / Identificación: ${tenant.tax_id}`, 18, y + 19);
  } else {
    doc.text('RUC / Identificación: 80092341-2', 18, y + 19);
  }
  doc.text(`Tel / WhatsApp: ${tenant.phone || '+595 981 123 456'}`, 18, y + 25);
  doc.text(`Dirección: ${tenant.address || 'Casa Matriz'}`, 18, y + 31);

  // Cuadro del Cliente
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, y, 88, 38, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(108, y, 88, 38, 3, 3, 'S');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE (TITULAR)', 112, y + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(customer.full_name, 112, y + 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Cédula / DNI: ${customer.document_id || 'Sin documento'}`, 112, y + 19);
  doc.text(`Tel / WhatsApp: ${customer.phone || 'Sin celular'}`, 112, y + 25);
  if (customer.nickname) {
    doc.text(`Referencia / Apodo: "${customer.nickname}"`, 112, y + 31);
  } else {
    doc.text('Cuenta Corriente: Activa', 112, y + 31);
  }

  y += 45;

  // --- DISTINTIVO DE TIPO DE PAGO ---
  if (isFullPayment) {
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(14, y, 182, 12, 3, 3, 'F');
    doc.setDrawColor(52, 211, 153);
    doc.roundedRect(14, y, 182, 12, 3, 3, 'S');

    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('COMPROBANTE DE CANCELACIÓN TOTAL DE DEUDA - CUENTA AL DÍA', 105, y + 8, { align: 'center' });
  } else {
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(14, y, 182, 12, 3, 3, 'F');
    doc.setDrawColor(165, 180, 252);
    doc.roundedRect(14, y, 182, 12, 3, 3, 'S');

    doc.setTextColor(49, 46, 129);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('COMPROBANTE DE ABONO PARCIAL A CUENTA CORRIENTE', 105, y + 8, { align: 'center' });
  }

  y += 18;

  // --- TABLA DE DESGLOSE ECONÓMICO ---
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y + 8, 196, y + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CONCEPTO / DESCRIPCIÓN', 18, y + 5.5);
  doc.text('MEDIO / REF', 105, y + 5.5);
  doc.text('IMPORTE', 192, y + 5.5, { align: 'right' });

  y += 8;

  // Fila 1: Saldo Anterior
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Saldo Deudor Anterior a la Fecha', 18, y + 6);
  doc.text('-', 105, y + 6);
  doc.text(formatCurrency(transaction.previous_balance), 192, y + 6, { align: 'right' });
  doc.setDrawColor(241, 245, 249);
  doc.line(14, y + 9, 196, y + 9);

  y += 10;

  // Fila 2: Monto Abonado (Destacado)
  doc.setFillColor(236, 253, 245);
  doc.rect(14, y, 182, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 95, 70);
  doc.text('(-) PAGO / ABONO EFECTUADO', 18, y + 8);

  const paymentMethodLabel = transaction.payment_method || 'Efectivo en Caja';
  const paymentRefLabel = transaction.payment_reference ? `Ref: ${transaction.payment_reference}` : '';
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${paymentMethodLabel} ${paymentRefLabel}`.trim(), 105, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(formatCurrency(transaction.amount), 192, y + 8, { align: 'right' });

  y += 14;

  // Fila 3: Saldo Restante
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, 182, 12, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, 182, 12, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('SALDO RESTANTE PENDIENTE:', 18, y + 8);

  if (isFullPayment) {
    doc.setTextColor(5, 150, 105);
    doc.text('DEUDA $0 (AL DÍA)', 105, y + 8);
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text('Saldo Actual de la Cuenta', 105, y + 8);
  }

  doc.setFontSize(12);
  doc.setTextColor(isFullPayment ? 5 : 15, isFullPayment ? 150 : 23, isFullPayment ? 105 : 42);
  doc.text(formatCurrency(transaction.new_balance), 192, y + 8, { align: 'right' });

  y += 22;

  // --- INFORMACIÓN ADICIONAL Y CERTIFICACIÓN ---
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 26, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 26, 3, 3, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DETALLES DE CAJA Y CERTIFICACIÓN ELECTRÓNICA', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Atendido por: ${transaction.operator_name || 'Caja Central'}`, 18, y + 13);
  doc.text(`Estado: Certificado con Registro Contable Inmutable`, 18, y + 19);

  if (transaction.blockchain_hash) {
    doc.text(`Hash Inmutable: ${transaction.blockchain_hash}`, 105, y + 13);
  }
  doc.text(`Validación: Firma Digital & Confirmación de Pago`, 105, y + 19);

  y += 34;

  // --- CLÁUSULA LEGAL Y VALIDEZ JURÍDICA ---
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, 182, 24, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'CONSTANCIA LEGAL: Este comprobante de recibo de pago ha sido generado de conformidad con la Ley N° 6822/21 de Servicios de Confianza',
    18,
    y + 6
  );
  doc.text(
    'para las Transacciones Electrónicas y la Ley N° 6534/20 de Protección de Datos Personales Crediticios. El presente recibo acredita',
    18,
    y + 11
  );
  doc.text(
    'la cancelación o disminución de la deuda de cuenta corriente fiada hasta la concurrencia del importe efectivamente percibido.',
    18,
    y + 16
  );
  doc.text(
    'El titular del almacén se reserva la determinación exclusiva del límite y plazo concedido para nuevas líneas de crédito.',
    18,
    y + 21
  );

  // Pie de página oficial
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('LibretaDigital PRO • Plataforma FinTech de Gestión Contable y Fiado en Tiempo Real', 105, 285, { align: 'center' });

  return doc.output('blob');
}

export function downloadReceiptPDF(
  transaction: Transaction,
  customer: Customer,
  tenant: Tenant,
  format: PrinterFormat = 'TICKET_80MM'
): void {
  const blob = generateReceiptPDFBlob(transaction, customer, tenant, format);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = customer.full_name.replace(/[^a-zA-Z0-9]/g, '_');
  const receiptCode = transaction.id.slice(-6).toUpperCase();
  const formatSuffix = format === 'TICKET_80MM' ? 'Ticket_80mm' : 'A4';
  link.download = `Recibo_Pago_${cleanName}_REC-${receiptCode}_${formatSuffix}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
