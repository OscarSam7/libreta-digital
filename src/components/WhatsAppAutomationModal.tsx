'use client';

import React, { useState } from 'react';
import { Customer, Tenant, Transaction } from '@/types';
import { generateWhatsAppReminderUrl } from '@/lib/reports';
import { getStoredData } from '@/lib/storage';
import { PDFReportPreviewModal } from '@/components/PDFReportPreviewModal';
import {
  MessageSquare,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Users,
  AlertCircle,
  X,
  ExternalLink,
  FileText
} from 'lucide-react';

interface Props {
  customers: Customer[];
  tenant: Tenant;
  onClose: () => void;
}

export function WhatsAppAutomationModal({ customers, tenant, onClose }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'OVERLIMIT' | 'WITH_DEBT'>('WITH_DEBT');
  const [scheduledDay, setScheduledDay] = useState<'1' | '15' | '30'>('30');
  const [customIntro, setCustomIntro] = useState(
    'Estimado cliente, te compartimos tu resumen de cuenta corriente al día.'
  );
  const [sentCount, setSentCount] = useState(0);

  // Estado para previsualizar PDF individual
  const [selectedPdfCustomer, setSelectedPdfCustomer] = useState<Customer | null>(null);

  // Obtener transacciones para el PDF
  const data = getStoredData();
  const transactions: Transaction[] = data.transactions || [];

  // Filtrado de destinatarios
  const targetCustomers = customers.filter((c) => {
    if (selectedFilter === 'OVERLIMIT') return c.credit_limit > 0 && c.current_balance > c.credit_limit;
    if (selectedFilter === 'WITH_DEBT') return c.current_balance > 0;
    return true;
  });

  const totalDebtTarget = targetCustomers.reduce((acc, c) => acc + c.current_balance, 0);

  const formatMoney = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat().format(val)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              Automatización de Cobranzas por WhatsApp
            </h2>
            <p className="text-xs text-slate-500">
              Previsualiza en PDF oficial antes de enviar o descarga el comprobante
            </p>
          </div>
        </div>

        {/* Resumen de Segmento */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Clientes Seleccionados</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {targetCustomers.length} <span className="text-xs font-semibold text-slate-400">cuentas</span>
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Monto a Recuperar</span>
            <div className="text-2xl font-black text-emerald-700 mt-1 truncate">
              {formatMoney(totalDebtTarget)}
            </div>
          </div>
        </div>

        {/* Filtro de Destinatarios */}
        <div className="mb-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Segmentar Destinatarios
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedFilter('WITH_DEBT')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                selectedFilter === 'WITH_DEBT'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Con Saldo Deudor
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('OVERLIMIT')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                selectedFilter === 'OVERLIMIT'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Límite Excedido
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('ALL')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                selectedFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todos ({customers.length})
            </button>
          </div>
        </div>

        {/* Mensaje Personalizado */}
        <div className="mb-5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Encabezado del Mensaje
          </label>
          <textarea
            rows={2}
            value={customIntro}
            onChange={(e) => setCustomIntro(e.target.value)}
            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Cada cliente recibirá automáticamente su saldo exacto, su PIN de firma y su enlace QR único.
          </p>
        </div>

        {/* Lista de Envío Asistido con botón Ver PDF primero */}
        <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 max-h-52 overflow-y-auto space-y-2 mb-5">
          {targetCustomers.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">No hay clientes con este criterio.</p>
          ) : (
            targetCustomers.map((cust) => {
              const waUrl = generateWhatsAppReminderUrl(cust, tenant);

              return (
                <div
                  key={cust.id}
                  className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 hover:border-slate-300 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-800 truncate">{cust.full_name}</p>
                    <p className="text-[11px] text-slate-500">
                      Saldo: <span className="font-bold text-slate-700">{formatMoney(cust.current_balance)}</span> • {cust.phone || 'Sin tel'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* BOTÓN VER PDF PRIMERO */}
                    <button
                      type="button"
                      onClick={() => setSelectedPdfCustomer(cust)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition"
                      title="Ver extracto en PDF y descargar"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </button>

                    {/* BOTÓN ENVIAR WHATSAPP */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSentCount((prev) => prev + 1)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Enviados en esta sesión: <b className="text-slate-800">{sentCount}</b>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
          >
            Finalizar
          </button>
        </div>
      </div>

      {/* MODAL DE VISTA PREVIA PDF INDIVIDUAL DE CLIENTE */}
      {selectedPdfCustomer && (
        <PDFReportPreviewModal
          mode="CUSTOMER_STATEMENT"
          tenant={tenant}
          customer={selectedPdfCustomer}
          transactions={transactions.filter((t) => t.customer_id === selectedPdfCustomer.id)}
          onClose={() => setSelectedPdfCustomer(null)}
        />
      )}
    </div>
  );
}
