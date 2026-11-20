'use client';

import React, { useState, useEffect } from 'react';
import { Printer, Check, X, FileText, Receipt, Sparkles, SlidersHorizontal, Info } from 'lucide-react';
import { PrinterFormat } from '@/types';
import { getStoredPrinterFormat, setStoredPrinterFormat } from '@/lib/storage';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrinterSettingsModal({ isOpen, onClose }: PrinterSettingsModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<PrinterFormat>('TICKET_80MM');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFormat(getStoredPrinterFormat());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectFormat = (format: PrinterFormat) => {
    setSelectedFormat(format);
    setStoredPrinterFormat(format);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestPrint = () => {
    // Generar ventana emergente de prueba según formato
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      alert('Por favor permite ventanas emergentes para la prueba de impresión.');
      return;
    }

    const isTicket = selectedFormat === 'TICKET_80MM';
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prueba de Impresión - LibretaDigital PRO</title>
          <style>
            @page {
              size: ${isTicket ? '80mm auto' : 'A4 portrait'};
              margin: ${isTicket ? '3mm' : '12mm'};
            }
            body {
              font-family: ${isTicket ? 'monospace' : 'system-ui, -apple-system, sans-serif'};
              font-size: ${isTicket ? '11px' : '13px'};
              color: #000;
              margin: 0;
              padding: ${isTicket ? '4px' : '20px'};
              width: ${isTicket ? '74mm' : '100%'};
              box-sizing: border-box;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .badge { display: inline-block; padding: 2px 6px; border: 1px solid #000; font-size: 10px; font-weight: bold; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="margin: 0; font-size: ${isTicket ? '14px' : '20px'};">LibretaDigital PRO</h2>
            <p style="margin: 2px 0; font-size: ${isTicket ? '10px' : '12px'};">SISTEMA OFICIAL DE COBRANZAS</p>
            <div class="badge" style="margin: 4px 0;">
              PRUEBA DE CONFIGURACIÓN DE IMPRESORA
            </div>
            <p style="margin: 2px 0; font-size: ${isTicket ? '9px' : '11px'};">
              Formato Seleccionado: <strong>${isTicket ? 'TICKET TÉRMICO POS 80mm' : 'HOJA ESTÁNDAR A4'}</strong>
            </p>
          </div>

          <div class="divider"></div>

          <div class="row">
            <span>Fecha y Hora:</span>
            <span>${new Date().toLocaleString('es-PY')}</span>
          </div>
          <div class="row">
            <span>Terminal:</span>
            <span>POS Mostrador / Android</span>
          </div>
          <div class="row">
            <span>Estado:</span>
            <span class="bold">CALIBRACIÓN CORRECTA OK</span>
          </div>

          <div class="divider"></div>

          <div class="row">
            <span>Muestra de Producto:</span>
            <span>1 x Arroz 5kg</span>
          </div>
          <div class="row">
            <span>Subtotal:</span>
            <span>₲ 35.000</span>
          </div>
          <div class="row bold" style="font-size: ${isTicket ? '12px' : '15px'}; margin-top: 4px;">
            <span>TOTAL DE PRUEBA:</span>
            <span>₲ 35.000</span>
          </div>

          <div class="divider"></div>

          <div class="text-center" style="font-size: ${isTicket ? '9px' : '11px'}; margin-top: 8px;">
            <p style="margin: 2px 0;">¡Tu impresora está lista para emitir comprobantes y reportes!</p>
            <p style="margin: 2px 0; font-size: 8px;">Validez comprobada • LibretaDigital PRO</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(sampleHtml);
    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* ENCABEZADO */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Configuración de Impresora</h3>
              <p className="text-xs text-indigo-200/80">Selecciona el formato para tickets y reportes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              El formato que elijas aquí se aplicará de forma <strong>predeterminada</strong> al emitir comprobantes de pago, estados de cuenta y todos los informes contables.
            </p>
          </div>

          {/* OPCIÓN 1: TICKET TÉRMICO POS 80MM */}
          <button
            type="button"
            onClick={() => handleSelectFormat('TICKET_80MM')}
            className={`w-full text-left p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-4 relative ${
              selectedFormat === 'TICKET_80MM'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                selectedFormat === 'TICKET_80MM'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Receipt className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  Ticket Térmico POS (80mm / 8.0 cm)
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                  Recomendado Comercios
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Diseñado para impresoras térmicas de mostrador (Epson, Xprinter, Star, terminales POS Android y rollos estándar de 80mm).
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  ✓ Letra monoespaciada de alta claridad
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  ✓ Ahorro de papel térmico
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  ✓ Corte automático
                </span>
              </div>
            </div>

            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 absolute top-4 right-4 ${
                selectedFormat === 'TICKET_80MM'
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-slate-300 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </button>

          {/* OPCIÓN 2: HOJA ESTÁNDAR A4 */}
          <button
            type="button"
            onClick={() => handleSelectFormat('PAGE_A4')}
            className={`w-full text-left p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-4 relative ${
              selectedFormat === 'PAGE_A4'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                selectedFormat === 'PAGE_A4'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <FileText className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  Hoja A4 / Carta (210 x 297 mm)
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full">
                  Oficina & Legal
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Diseñado para impresoras estándar de oficina (Láser, Chorro de tinta, impresoras multifunción HP/Canon/Epson) y exportación de PDFs ejecutivos.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  ✓ Tablas detalladas con membrete
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  ✓ Espacio para firmas y sellos
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  ✓ Ideal para archivar en biblioratos
                </span>
              </div>
            </div>

            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 absolute top-4 right-4 ${
                selectedFormat === 'PAGE_A4'
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-slate-300 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </button>

          {/* MENSAJE DE CONFIRMACIÓN */}
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Formato guardado exitosamente. Se aplicará a todos los comprobantes e informes.</span>
            </div>
          )}
        </div>

        {/* PIE CON BOTONES */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleTestPrint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Imprimir Página de Prueba</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition shadow-md cursor-pointer"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
