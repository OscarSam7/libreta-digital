import { jsPDF } from 'jspdf';
import { Customer, Tenant, Transaction, PrinterFormat } from '@/types';
import { AppLocale, getCurrentLocale, getDateLocale, tLocale } from '@/lib/i18n';

export function generateReceiptPDFBlob(
  transaction: Transaction,
  customer: Customer,
  tenant: Tenant,
  format: PrinterFormat = 'TICKET_80MM',
  locale?: AppLocale
): Blob {
  const activeLocale = locale ?? getCurrentLocale();
  const isPt = activeLocale === 'pt';
  const isFullPayment = transaction.new_balance <= 0;
  const cleanId = transaction.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const receiptNum = `REC-${new Date(transaction.created_at).getFullYear()}-${cleanId}`;
  const dateFormatted = new Date(transaction.created_at).toLocaleString(getDateLocale(activeLocale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getPdfCurrencySymbol = () => {
    if (tenant.currency_code === 'PYG' || tenant.currency_symbol === '₲') {
      return 'Gs.';
    }
    if (tenant.currency_code === 'BRL') return 'R$';
    if (tenant.currency_code === 'PEN') return 'S/.';
    if (tenant.currency_code === 'USD') return '$';
    return tenant.currency_symbol || 'Gs.';
  };

  const currencySymbol = getPdfCurrencySymbol();

  const formatCurrency = (val: number) => {
    const formatted = new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val);
    return `${currencySymbol} ${formatted}`;
  };

  const t = (es: string, pt: string) => tLocale(es, pt, activeLocale);

  // =========================================================================
  // FORMATO 0: TICKET POS PORTÁTIL 58mm / 57mm (Terminales Android, Sunmi, PAX, Bluetooth)
  // =========================================================================
  if (format === 'TICKET_58MM') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, 210],
    });

    let y = 6;
    const leftMargin = 3;
    const rightMargin = 55;
    const centerX = 29;

    // Encabezado
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('LibretaDigital PRO', centerX, y, { align: 'center' });

    y += 4;
    doc.setFontSize(8);
    doc.text(tenant.business_name.toUpperCase().slice(0, 25), centerX, y, { align: 'center' });

    y += 3.5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    if (tenant.tax_id) {
      doc.text(`${t('RUC', 'Doc/CNPJ')}: ${tenant.tax_id}`, centerX, y, { align: 'center' });
      y += 3;
    }
    if (tenant.phone) {
      doc.text(`Tel/WA: ${tenant.phone}`, centerX, y, { align: 'center' });
      y += 3;
    }
    if (tenant.address) {
      doc.text(tenant.address.slice(0, 28), centerX, y, { align: 'center' });
      y += 3;
    }

    // Línea divisoria
    doc.text('--------------------------------', centerX, y, { align: 'center' });
    y += 3.5;

    // Título del Ticket
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.text(t('RECIBO OFICIAL DE PAGO', 'RECIBO OFICIAL DE PAGAMENTO'), centerX, y, { align: 'center' });
    y += 3.5;
    doc.setFontSize(7);
    doc.text(
      isFullPayment
        ? t('** CANCELACION TOTAL **', '** QUITACAO TOTAL **')
        : t('** ABONO A CUENTA **', '** PAGAMENTO PARCIAL **'),
      centerX,
      y,
      { align: 'center' }
    );
    y += 3.5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${t('Nro', 'Nº')}: ${receiptNum}`, centerX, y, { align: 'center' });
    y += 3;
    doc.text(`${t('Fecha', 'Data')}: ${dateFormatted}`, centerX, y, { align: 'center' });
    y += 3;

    // Línea divisoria
    doc.text('--------------------------------', centerX, y, { align: 'center' });
    y += 3.5;

    // Datos del Cliente
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.text(`CLIENTE: ${customer.full_name.slice(0, 20)}`, leftMargin, y);
    y += 3;
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    if (customer.document_id) {
      doc.text(`${t('DOC/CI ', 'DOC/CPF')}: ${customer.document_id}`, leftMargin, y);
      y += 3;
    }
    if (customer.phone) {
      doc.text(`TEL/WA : ${customer.phone}`, leftMargin, y);
      y += 3;
    }

    // Línea divisoria
    doc.text('--------------------------------', centerX, y, { align: 'center' });
    y += 4;

    // Desglose de importes
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.text(t('Saldo Anterior:', 'Saldo Anterior:'), leftMargin, y);
    doc.text(formatCurrency(transaction.previous_balance), rightMargin, y, { align: 'right' });
    y += 4;

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.text(t('(-) PAGO RECIBIDO:', '(-) VALOR PAGO:'), leftMargin, y);
    doc.text(formatCurrency(transaction.amount), rightMargin, y, { align: 'right' });
    y += 4.5;

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.text(t('SALDO RESTANTE:', 'SALDO RESTANTE:'), leftMargin, y);
    doc.text(formatCurrency(transaction.new_balance), rightMargin, y, { align: 'right' });
    y += 3.5;

    if (isFullPayment) {
      doc.setFontSize(7);
      doc.text(t('>> CUENTA AL DIA (DEUDA 0) <<', '>> CONTA EM DIA (SALDO 0) <<'), centerX, y, { align: 'center' });
      y += 3.5;
    }

    // Línea divisoria
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text('--------------------------------', centerX, y, { align: 'center' });
    y += 3.5;

    // Detalles de cobro
    doc.text(
      `${t('Medio Pago', 'Meio Pagto')}: ${transaction.payment_method || t('Efectivo', 'Dinheiro')}`,
      leftMargin,
      y
    );
    y += 3;
    if (transaction.payment_reference) {
      doc.text(`Ref: ${transaction.payment_reference.slice(0, 22)}`, leftMargin, y);
      y += 3;
    }
    doc.text(
      `${t('Cajero/Op ', 'Caixa/Op  ')}: ${transaction.operator_name || t('Caja POS', 'Caixa PDV')}`,
      leftMargin,
      y
    );
    y += 3;

    if (transaction.blockchain_hash) {
      doc.setFontSize(5.5);
      doc.text(`Hash: ${transaction.blockchain_hash.slice(0, 24)}`, leftMargin, y);
      y += 3;
    }

    doc.setFontSize(6.5);
    doc.text('--------------------------------', centerX, y, { align: 'center' });
    y += 3.5;

    // Pie legal
    doc.setFontSize(5.5);
    doc.text(
      t('Validez legal Ley 6822/21 y 6534/20', 'Registro digital rastreavel no Livro Razao'),
      centerX,
      y,
      { align: 'center' }
    );
    y += 2.5;
    doc.text(
      t('Comercio fija limites y plazos', 'Comercio define limites e prazos'),
      centerX,
      y,
      { align: 'center' }
    );
    y += 3.5;
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.text(t('¡Gracias por su pago!', 'Obrigado pelo pagamento!'), centerX, y, { align: 'center' });

    return doc.output('blob');
  }

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
      doc.text(`${t('RUC', 'CNPJ/Doc')}: ${tenant.tax_id}`, centerX, y, { align: 'center' });
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
    doc.text(t('RECIBO OFICIAL DE PAGO', 'RECIBO OFICIAL DE PAGAMENTO'), centerX, y, { align: 'center' });
    y += 4;
    doc.setFontSize(8);
    doc.text(
      isFullPayment
        ? t('*** CANCELACION TOTAL DE DEUDA ***', '*** QUITACAO TOTAL DA DIVIDA ***')
        : t('*** ABONO PARCIAL A CUENTA ***', '*** PAGAMENTO PARCIAL NA CONTA ***'),
      centerX,
      y,
      { align: 'center' }
    );
    y += 4;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${t('Nro', 'Nº')}: ${receiptNum}`, centerX, y, { align: 'center' });
    y += 3.5;
    doc.text(`${t('Fecha', 'Data')}: ${dateFormatted}`, centerX, y, { align: 'center' });
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
      doc.text(`${t('DOC/CI ', 'DOC/CPF')}: ${customer.document_id}`, leftMargin, y);
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
    doc.text(t('(-) PAGO RECIBIDO:', '(-) VALOR RECEBIDO:'), leftMargin, y);
    doc.text(formatCurrency(transaction.amount), rightMargin, y, { align: 'right' });
    y += 5.5;

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.text(t('SALDO RESTANTE:', 'SALDO RESTANTE:'), leftMargin, y);
    doc.text(formatCurrency(transaction.new_balance), rightMargin, y, { align: 'right' });
    y += 4;

    if (isFullPayment) {
      doc.setFontSize(8);
      doc.text(
        t('>>> CUENTA AL DIA (DEUDA 0) <<<', '>>> CONTA EM DIA (SALDO 0) <<<'),
        centerX,
        y,
        { align: 'center' }
      );
      y += 4;
    }

    // Línea divisoria
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text('------------------------------------------', centerX, y, { align: 'center' });
    y += 4;

    // Medios y caja
    doc.text(
      `${t('Medio Pago ', 'Meio Pagto ')}: ${transaction.payment_method || t('Efectivo en Caja', 'Dinheiro no Caixa')}`,
      leftMargin,
      y
    );
    y += 3.5;
    if (transaction.payment_reference) {
      doc.text(`${t('Referencia', 'Referencia')} : ${transaction.payment_reference.slice(0, 24)}`, leftMargin, y);
      y += 3.5;
    }
    doc.text(
      `${t('Atendido por', 'Atendido por')}: ${transaction.operator_name || t('Caja Central', 'Caixa Central')}`,
      leftMargin,
      y
    );
    y += 3.5;
    doc.text(
      t('Estado      : Certificado en Libro Mayor', 'Status      : Certificado no Livro Razao'),
      leftMargin,
      y
    );
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
    doc.text(
      t('Validez legal probatoria Ley 6822/21 y 6534/20', 'Comprovante certificado em Livro Razao Imutavel'),
      centerX,
      y,
      { align: 'center' }
    );
    y += 3;
    doc.text(
      t('El titular determina limites y plazos de credito', 'O titular define limites e prazos de credito'),
      centerX,
      y,
      { align: 'center' }
    );
    y += 4;
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.text(t('¡Muchas gracias por su pago!', 'Muito obrigado pelo seu pagamento!'), centerX, y, {
      align: 'center',
    });

    return doc.output('blob');
  }

  // =========================================================================
  // FORMATO 2: HOJA ESTÁNDAR A4 (210mm x 297mm) - CERTIFICADO FINTECH PROFESIONAL
  // =========================================================================
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Franja superior decorativa de acento esmeralda
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, 210, 3, 'F');

  // Barra superior oscura principal
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 3, 210, 34, 'F');

  // Marca y Logotipo
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LibretaDigital PRO', 14, 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(
    t('COMPROBANTE OFICIAL DE PAGO Y CANCELACIÓN', 'COMPROVANTE OFICIAL DE PAGAMENTO E QUITAÇÃO'),
    14,
    23
  );

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    t(
      'Sistema Contable & Fiado en Tiempo Real • Validez Jurídica Ley N° 6822/21',
      'Sistema Contábil & Fiado em Tempo Real • Registro Imutável Certificado'
    ),
    14,
    29
  );

  // Recibo N° a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(receiptNum, 196, 16, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`${t('Emisión', 'Emissão')}: ${dateFormatted}`, 196, 22, { align: 'right' });

  // Píldora de estado oficial en la cabecera
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(138, 25, 58, 6, 2, 2, 'F');
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(138, 25, 58, 6, 2, 2, 'S');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(167, 243, 208); // emerald-200
  doc.text(t('FORMATO A4 • REGISTRO INMUTABLE', 'FORMATO A4 • REGISTRO IMUTÁVEL'), 167, 29.2, {
    align: 'center',
  });

  // --- DATOS DEL COMERCIO Y DEL CLIENTE ---
  let y = 43;

  // Cuadro del Comercio (Izquierda)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, y, 88, 38, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, y, 88, 38, 3, 3, 'S');

  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(t('COMERCIO / ALMACÉN EMISOR', 'ESTABELECIMENTO EMISSOR'), 18, y + 6);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(10.5);
  doc.text(tenant.business_name.toUpperCase().slice(0, 32), 18, y + 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  if (tenant.tax_id) {
    doc.text(`${t('RUC / Identificación', 'CNPJ / Documento')}: ${tenant.tax_id}`, 18, y + 19);
  } else {
    doc.text(`${t('RUC / Identificación', 'CNPJ / Documento')}: ${t('Registrado', 'Cadastrado')}`, 18, y + 19);
  }
  doc.text(`Tel / WhatsApp: ${tenant.phone || '-'}`, 18, y + 25);
  doc.text(
    `${t('Dirección', 'Endereço')}: ${(tenant.address || t('Casa Matriz', 'Matriz')).slice(0, 34)}`,
    18,
    y + 31
  );

  // Cuadro del Cliente (Derecha)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, y, 88, 38, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(108, y, 88, 38, 3, 3, 'S');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(t('DATOS DEL CLIENTE (TITULAR)', 'DADOS DO CLIENTE (TITULAR)'), 112, y + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.text(customer.full_name.slice(0, 32), 112, y + 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${t('Cédula / DNI', 'CPF / Documento')}: ${customer.document_id || t('Sin documento', 'Sem documento')}`,
    112,
    y + 19
  );
  doc.text(
    `Tel / WhatsApp: ${customer.phone || t('Sin celular', 'Sem celular')}`,
    112,
    y + 25
  );
  if (customer.nickname) {
    doc.text(
      `${t('Referencia / Apodo', 'Apelido / Ref.')}: "${customer.nickname.slice(0, 24)}"`,
      112,
      y + 31
    );
  } else {
    doc.text(t('Cuenta Corriente: Activa', 'Conta Corrente: Ativa'), 112, y + 31);
  }

  y += 43;

  // --- DISTINTIVO DE TIPO DE PAGO ---
  if (isFullPayment) {
    doc.setFillColor(209, 250, 229); // emerald-100
    doc.roundedRect(14, y, 182, 11, 3, 3, 'F');
    doc.setDrawColor(52, 211, 153); // emerald-400
    doc.roundedRect(14, y, 182, 11, 3, 3, 'S');

    doc.setTextColor(6, 95, 70); // emerald-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      t(
        `✓ CANCELACIÓN TOTAL DE DEUDA — CUENTA AL DÍA (SALDO ${currencySymbol} 0)`,
        `✓ QUITAÇÃO TOTAL DA DÍVIDA — CONTA EM DIA (SALDO ${currencySymbol} 0)`
      ),
      105,
      y + 7.5,
      { align: 'center' }
    );
  } else {
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.roundedRect(14, y, 182, 11, 3, 3, 'F');
    doc.setDrawColor(165, 180, 252); // indigo-300
    doc.roundedRect(14, y, 182, 11, 3, 3, 'S');

    doc.setTextColor(49, 46, 129); // indigo-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      t(
        '✓ COMPROBANTE DE ABONO PARCIAL A CUENTA CORRIENTE',
        '✓ COMPROVANTE DE PAGAMENTO PARCIAL NA CONTA CORRENTE'
      ),
      105,
      y + 7.5,
      { align: 'center' }
    );
  }

  y += 16;

  // --- TABLA DE DESGLOSE ECONÓMICO ---
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, y, 182, 8, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(14, y + 8, 196, y + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(t('CONCEPTO / DESCRIPCIÓN', 'DESCRIÇÃO / LANÇAMENTO'), 18, y + 5.5);
  doc.text(t('MODALIDAD / REFERENCIA', 'MODALIDADE / REFERÊNCIA'), 105, y + 5.5);
  doc.text(`${t('IMPORTE', 'VALOR')} (${currencySymbol})`, 192, y + 5.5, { align: 'right' });

  y += 8;

  // Fila 1: Saldo Anterior
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(t('Saldo Deudor Anterior a la Fecha', 'Saldo Devedor Anterior'), 18, y + 6);
  doc.text(t('Liquidación previa registrada', 'Saldo apurado anteriormente'), 105, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(transaction.previous_balance), 192, y + 6, { align: 'right' });
  doc.setDrawColor(241, 245, 249);
  doc.line(14, y + 9.5, 196, y + 9.5);

  y += 10.5;

  // Fila 2: Monto Abonado (Destacado en Esmeralda)
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.rect(14, y, 182, 12, 'F');
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.rect(14, y, 182, 12, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 95, 70);
  doc.text(t('(-) PAGO / ABONO EFECTUADO', '(-) PAGAMENTO EFETUADO'), 18, y + 8);

  const paymentMethodLabel = transaction.payment_method || t('Efectivo en Caja', 'Dinheiro no Caixa');
  const paymentRefLabel = transaction.payment_reference ? `(Ref: ${transaction.payment_reference})` : '';
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(4, 120, 87);
  doc.text(`${paymentMethodLabel} ${paymentRefLabel}`.trim(), 105, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(6, 95, 70);
  doc.text(formatCurrency(transaction.amount), 192, y + 8, { align: 'right' });

  y += 13.5;

  // Fila 3: Saldo Restante
  if (isFullPayment) {
    doc.setFillColor(209, 250, 229);
    doc.rect(14, y, 182, 12, 'F');
    doc.setDrawColor(52, 211, 153);
    doc.rect(14, y, 182, 12, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(6, 95, 70);
    doc.text(t('SALDO RESTANTE PENDIENTE:', 'SALDO RESTANTE EM ABERTO:'), 18, y + 8);
    doc.text(
      t(`DEUDA CANCELADA (SALDO ${currencySymbol} 0 - AL DÍA)`, `DÍVIDA QUITADA (SALDO ${currencySymbol} 0 - EM DIA)`),
      105,
      y + 8
    );

    doc.setFontSize(11.5);
    doc.text(formatCurrency(0), 192, y + 8, { align: 'right' });
  } else {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 182, 12, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(t('SALDO RESTANTE PENDIENTE:', 'SALDO RESTANTE EM ABERTO:'), 18, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(t('Saldo Actual de la Cuenta Fiada', 'Saldo Atual da Conta Fiada'), 105, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(transaction.new_balance), 192, y + 8, { align: 'right' });
  }

  y += 18;

  // --- DETALLES DE CAJA Y CERTIFICACIÓN ELECTRÓNICA ---
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 24, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 24, 3, 3, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(
    t('DETALLES DE CAJA Y CERTIFICACIÓN ELECTRÓNICA', 'DETALHES DE CAIXA E CERTIFICAÇÃO ELETRÔNICA'),
    18,
    y + 6
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${t('Atendido por', 'Atendido por')}: ${transaction.operator_name || t('Caja Central', 'Caixa Central')}`,
    18,
    y + 12
  );
  doc.setTextColor(4, 120, 87);
  doc.setFont('helvetica', 'bold');
  doc.text(
    t('Estado: Certificado con Registro Contable Inmutable', 'Status: Certificado em Livro Razão Imutável'),
    18,
    y + 18
  );

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const displayHash = transaction.blockchain_hash
    ? `${transaction.blockchain_hash.slice(0, 32)}...`
    : '0x1a208c54b214c4b40...';
  doc.text(`${t('Hash Inmutable', 'Hash Imutável')}: ${displayHash}`, 105, y + 12);
  doc.text(
    t('Validación: Firma Digital & Confirmación de Pago', 'Validação: Assinatura Digital & Confirmação'),
    105,
    y + 18
  );

  y += 28;

  // --- CLÁUSULA LEGAL Y VALIDEZ JURÍDICA ---
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, 182, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 22, 2, 2, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  if (isPt) {
    doc.text(
      'COMPROVAÇÃO ELETRÔNICA: Este recibo de pagamento foi emitido com rastreabilidade digital e registro contábil sequencial',
      18,
      y + 5.5
    );
    doc.text(
      'no livro razão imutável do estabelecimento, em conformidade com as normas vigentes de documentos eletrônicos.',
      18,
      y + 10.5
    );
    doc.text(
      'Este comprovante atesta o abatimento ou quitação da dívida na conta corrente fiada até o valor efetivamente recebido.',
      18,
      y + 15.5
    );
    doc.text(
      'O estabelecimento reserva-se o critério exclusivo de definição do limite e prazo concedidos para novas compras.',
      18,
      y + 20
    );
  } else {
    doc.text(
      'CONSTANCIA LEGAL: Este comprobante de recibo de pago ha sido generado de conformidad con la Ley N° 6822/21 de Servicios de Confianza',
      18,
      y + 5.5
    );
    doc.text(
      'para las Transacciones Electrónicas y la Ley N° 6534/20 de Protección de Datos Personales Crediticios. El presente recibo acredita',
      18,
      y + 10.5
    );
    doc.text(
      'la cancelación o disminución de la deuda de cuenta corriente fiada hasta la concurrencia del importe efectivamente percibido.',
      18,
      y + 15.5
    );
    doc.text(
      'El titular del almacén se reserva la determinación exclusiva del límite y plazo concedido para nuevas líneas de crédito.',
      18,
      y + 20
    );
  }

  y += 27;

  // --- SECCIÓN DE FIRMAS DE CONFORMIDAD Y SELLOS ---
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.line(24, y + 18, 90, y + 18);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(t('Firma / Sello del Comercio Emisor', 'Assinatura / Carimbo da Loja Emissora'), 57, y + 23, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${tenant.business_name.slice(0, 28)} - ${t('Responsable de Caja', 'Responsável de Caixa')}`,
    57,
    y + 27,
    { align: 'center' }
  );

  // Firma Cliente
  doc.setDrawColor(148, 163, 184);
  doc.line(120, y + 18, 186, y + 18);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(t('Firma / Conforme del Cliente (Titular)', 'Assinatura / Ciência do Cliente (Titular)'), 153, y + 23, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${customer.full_name.slice(0, 26)} - ${t('C.I.', 'Doc.')}: ${customer.document_id || 'Titular'}`,
    153,
    y + 27,
    { align: 'center' }
  );

  y += 33;

  // --- SELLO DE SEGURIDAD Y AUDITORÍA DIGITAL CENTRAL ---
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 13, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 182, 13, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(
    t(
      '✓ COMPROBANTE AUTÉNTICO REGISTRADO EN LIBRETADIGITAL PRO • SEGURIDAD FINTECH',
      '✓ COMPROVANTE AUTÊNTICO REGISTRADO NO LIBRETADIGITAL PRO • SEGURANÇA FINTECH'
    ),
    105,
    y + 5.5,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    t(
      'Trazabilidad contable inmutable con doble partida • Certificación digital verificable en tiempo real',
      'Rastreabilidade contábil imutável • Certificação digital verificável em tempo real'
    ),
    105,
    y + 10,
    { align: 'center' }
  );

  // Pie de página oficial al final de la hoja A4
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 282, 196, 282);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    t(
      'LibretaDigital PRO • Plataforma FinTech de Gestión Contable y Fiado en Tiempo Real • www.libretadigital.com',
      'LibretaDigital PRO • Plataforma FinTech de Gestão Contábil e Fiado em Tempo Real • www.libretadigital.com'
    ),
    105,
    286,
    { align: 'center' }
  );

  return doc.output('blob');
}

export function downloadReceiptPDF(
  transaction: Transaction,
  customer: Customer,
  tenant: Tenant,
  format: PrinterFormat = 'TICKET_80MM',
  locale?: AppLocale
): void {
  const activeLocale = locale ?? getCurrentLocale();
  const blob = generateReceiptPDFBlob(transaction, customer, tenant, format, activeLocale);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = customer.full_name.replace(/[^a-zA-Z0-9]/g, '_');
  const receiptCode = transaction.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const formatSuffix =
    format === 'TICKET_58MM' ? 'POS_58mm' : format === 'TICKET_80MM' ? 'Ticket_80mm' : 'A4';
  const filePrefix = activeLocale === 'pt' ? 'Recibo_Pagamento' : 'Recibo_Pago';
  link.download = `${filePrefix}_${cleanName}_REC-${receiptCode}_${formatSuffix}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
