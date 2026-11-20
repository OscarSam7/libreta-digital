'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Transaction, Tenant } from '@/types';
import { getStoredData, syncFromSupabase } from '@/lib/storage';
import { certifyTransactionWithPin } from '@/lib/ledger';
import { acceptCustomerTerms } from '@/lib/customers';
import { exportTransactionsToCSV } from '@/lib/reports';
import { PDFReportPreviewModal } from '@/components/PDFReportPreviewModal';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
  Download,
  AlertCircle,
  Lock,
  ArrowDownLeft,
  ShoppingBag,
  FileText,
  Check,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BrandLogo } from '@/components/BrandLogo';

interface Props {
  token: string;
}

export function CustomerPortalView({ token }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [signingTxId, setSigningTxId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [signError, setSignError] = useState('');

  // Estados de aceptación de términos e Informconf
  const [termsPin, setTermsPin] = useState('');
  const [termsAcceptedCheckbox, setTermsAcceptedCheckbox] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [showContractModal, setShowContractModal] = useState(false);

  const loadData = () => {
    const data = getStoredData();
    setTenant(data.tenant);
    const found = data.customers.find((c) => c.qr_token === token);
    if (found) {
      setCustomer(found);
      const custTxs = data.transactions.filter((t) => t.customer_id === found.id);
      setTransactions(custTxs);
    }
  };

  useEffect(() => {
    loadData();
    syncFromSupabase();

    const handleUpdate = () => loadData();
    window.addEventListener('libreta_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('libreta_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [token]);

  if (!customer || !tenant) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-xl space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-800">Código QR No Encontrado</h2>
          <p className="text-xs text-slate-500">
            El enlace o código escaneado no es válido o ha expirado. Comuníquese con el comercio.
          </p>
        </div>
      </div>
    );
  }

  const handleSignOperation = (txId: string) => {
    setSignError('');
    const res = certifyTransactionWithPin(txId, pinInput, 'REMOTE_QR_APPROVAL');
    if (res.success) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      setSigningTxId(null);
      setPinInput('');
      loadData();
    } else {
      setSignError(res.message);
    }
  };

  const handleAcceptTerms = () => {
    setTermsError('');
    if (!customer) return;

    if (!termsAcceptedCheckbox) {
      setTermsError('Debe marcar la casilla aceptando los términos y la autorización Informconf.');
      return;
    }

    if (!termsPin.trim()) {
      setTermsError('Ingrese su PIN de seguridad de 4 dígitos para convalidar la firma.');
      return;
    }

    const res = acceptCustomerTerms(
      customer.id,
      termsPin.trim(),
      'PORTAL_PIN',
      customer.credit_cycle || 'MENSUAL'
    );
    if (!res.success || !res.customer) {
      setTermsError(res.error || 'PIN incorrecto');
      return;
    }

    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
    } catch {}

    setCustomer(res.customer);
    setTermsPin('');
  };

  const isOverLimit =
    customer.credit_limit > 0 && customer.current_balance > customer.credit_limit;

  return (
    <main className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto pb-16 font-sans">
      {/* Logotipo Oficial LibretaDigital Pro */}
      <div className="flex justify-center mb-3 pt-2">
        <BrandLogo size="md" theme="light" />
      </div>

      {/* Header Comercio emisor */}
      <div className="text-center mb-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
          Comercio Emisor
        </span>
        <h2 className="text-base font-black text-slate-900">{tenant.business_name}</h2>
        {tenant.phone && (
          <p className="text-xs text-slate-500 font-medium mt-0.5">Contacto: +{tenant.phone}</p>
        )}
      </div>

      {/* Tarjeta Principal de Saldo */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
              Titular de Cuenta
            </span>
            <h1 className="text-2xl font-black tracking-tight">{customer.full_name}</h1>
            {customer.nickname && (
              <p className="text-xs text-indigo-300">"{customer.nickname}"</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">
              C.I / Documento: {customer.document_id || 'Registrado'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5" /> Verificado
          </div>
        </div>

        <div className="my-5">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
            Saldo Deudor al Momento
          </span>
          <div className="text-4xl font-black tracking-tight text-white mt-1">
            {tenant.currency_symbol} {customer.current_balance.toLocaleString('es-PY')}
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-300 border-t border-white/10 pt-4">
          <div>
            <span className="text-[10px] uppercase block text-slate-400 font-bold">
              Límite Autorizado
            </span>
            <span className="font-bold text-white">
              {customer.credit_limit > 0
                ? `${tenant.currency_symbol} ${customer.credit_limit.toLocaleString('es-PY')}`
                : 'Sin límite'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase block text-indigo-300 font-bold">
              Mi PIN de Firma
            </span>
            <span className="font-mono font-black text-white bg-white/20 px-2.5 py-0.5 rounded text-sm tracking-widest">
              {customer.security_pin}
            </span>
          </div>
        </div>

        {isOverLimit && (
          <div className="mt-4 bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs p-2.5 rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Ha alcanzado el límite máximo de crédito pactado con el local.</span>
          </div>
        )}
      </div>

      {/* TARJETA DE ACEPTACIÓN DE TÉRMINOS & INFORMCONF */}
      {!customer.terms_accepted ? (
        <div className="mt-4 bg-white rounded-3xl p-5 shadow-lg border-2 border-indigo-500 space-y-3.5 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                Habilitación de Crédito
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-snug">
                Términos y Condiciones & Autorización Informconf
              </h3>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              <b>1. Factura a Crédito:</b> Al cierre de cada ciclo ({customer.credit_cycle || 'Mensual'}), el local emitirá una factura legal a crédito por el total acumulado de tus compras.
            </p>
            <p className="text-rose-800 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              <b>2. Informconf (Ley N° 6534/20):</b> Autorizas a {tenant.business_name} a consultar tu historial crediticio y a reportar tus datos a la base de morosidad de INFORMCONF en caso de incumplimiento de pagos por el plazo legal.
            </p>
          </div>

          {termsError && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-xl border border-rose-200">
              {termsError}
            </p>
          )}

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAcceptedCheckbox}
                onChange={(e) => setTermsAcceptedCheckbox(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                He leído y acepto los Términos de Crédito y la autorización crediticia de Informconf conforme a la Ley N° 6534/20.
              </span>
            </label>

            <div className="flex gap-2 items-center">
              <input
                type="password"
                maxLength={4}
                placeholder="PIN"
                value={termsPin}
                onChange={(e) => setTermsPin(e.target.value)}
                className="w-24 p-2.5 bg-slate-50 border-2 border-indigo-400 rounded-xl font-mono text-center text-sm font-black tracking-widest focus:outline-none focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAcceptTerms}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30 transition active:scale-95"
              >
                Activar Línea de Crédito
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Digita tu PIN de 4 dígitos ({customer.security_pin}) para convalidar electrónicamente.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block">Crédito Habilitado</span>
              <span className="text-[10px] text-emerald-700">
                Términos e Informconf convalidado electrónicamente
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowContractModal(true)}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
          >
            Ver Contrato
          </button>
        </div>
      )}

      {/* Historial de Transacciones */}
      <section className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-black text-slate-800">Historial de Operaciones</h2>
          <button
            onClick={() => exportTransactionsToCSV(transactions, tenant, customer.full_name)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Descargar CSV
          </button>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
              No registra compras ni pagos hasta el momento.
            </div>
          ) : (
            transactions.map((tx) => {
              const isPurchase =
                tx.type === 'DEBIT_PURCHASE' || tx.type === 'ADJUSTMENT_DEBIT';
              const isOpen = expandedTxId === tx.id;
              const isPending = tx.status === 'PENDING_CUSTOMER';

              return (
                <div
                  key={tx.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition ${
                    isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/80'
                  }`}
                >
                  <div
                    className="flex justify-between items-center cursor-pointer select-none"
                    onClick={() => setExpandedTxId(isOpen ? null : tx.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                          isPurchase
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {isPurchase ? (
                          <ShoppingBag className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900 leading-snug">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(tx.created_at).toLocaleDateString('es-PY', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div
                          className={`font-black text-sm ${
                            isPurchase ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isPurchase ? '+' : '-'}
                          {tenant.currency_symbol} {tx.amount.toLocaleString('es-PY')}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            !isPending
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {tx.status === 'CERTIFIED_BOTH' ? 'Certificado' : 'Por Validar'}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Detalle Desplegable */}
                  {isOpen && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 text-xs animate-in fade-in duration-200">
                      {tx.items && tx.items.length > 0 && (
                        <div className="bg-slate-50 p-2.5 rounded-xl space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Detalle de Productos
                          </p>
                          {tx.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-slate-600">
                              <span>
                                {it.qty}x {it.name}
                              </span>
                              <span className="font-semibold">
                                {tenant.currency_symbol} {(it.qty * it.price).toLocaleString('es-PY')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Auditoría de Saldo Inmutable */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl font-mono">
                        <div>
                          <span>Saldo Anterior:</span>{' '}
                          <b className="text-slate-800">
                            {tenant.currency_symbol} {tx.previous_balance.toLocaleString('es-PY')}
                          </b>
                        </div>
                        <div>
                          <span>Saldo Nuevo:</span>{' '}
                          <b className="text-slate-800">
                            {tenant.currency_symbol} {tx.new_balance.toLocaleString('es-PY')}
                          </b>
                        </div>
                      </div>

                      {/* Acciones de Firma Remota si está pendiente */}
                      {isPending && (
                        <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 space-y-2">
                          <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                            <Lock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Conformar esta compra con su PIN</span>
                          </div>
                          <p className="text-[11px] text-indigo-700/80">
                            Ingrese su PIN de 4 dígitos para certificar que retiró estas mercaderías:
                          </p>

                          {signingTxId === tx.id ? (
                            <div className="space-y-2 pt-1">
                              {signError && (
                                <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-1.5 rounded-lg">
                                  {signError}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="password"
                                  maxLength={4}
                                  placeholder="• • • •"
                                  value={pinInput}
                                  onChange={(e) => setPinInput(e.target.value)}
                                  className="w-28 text-center text-lg font-mono font-bold tracking-widest bg-white border-2 border-indigo-500 rounded-xl focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSignOperation(tx.id)}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl shadow-md transition text-xs"
                                >
                                  Certificar
                                </button>
                                <button
                                  onClick={() => setSigningTxId(null)}
                                  className="px-3 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSigningTxId(tx.id);
                                setPinInput('');
                                setSignError('');
                              }}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                            >
                              Firmar Operación con Mi PIN
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* MODAL CONTRATO EN PDF */}
      {showContractModal && (
        <PDFReportPreviewModal
          mode="TERMS_CONTRACT"
          tenant={tenant}
          customer={customer}
          onClose={() => setShowContractModal(false)}
        />
      )}
    </main>
  );
}
