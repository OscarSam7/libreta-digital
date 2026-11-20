'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  CheckCircle2, Clock, ChevronDown, ChevronUp, 
  ShieldCheck, Store, AlertCircle, Receipt, Lock 
} from 'lucide-react';
import { getStoredData, saveTransactions } from '@/lib/storage';
import { certifyTransactionWithPin } from '@/lib/ledger';

// Inicialización condicional de Supabase para soportar tanto modo API real como Mock reactivo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

interface TransactionItem {
  qty: number;
  name: string;
  price: number;
}

interface Transaction {
  id: string;
  type: 'DEBIT_PURCHASE' | 'CREDIT_PAYMENT' | 'ADJUSTMENT_DEBIT' | 'ADJUSTMENT_CREDIT';
  amount: number;
  previous_balance: number;
  new_balance: number;
  description: string;
  items: TransactionItem[];
  status: 'PENDING_CUSTOMER' | 'CERTIFIED_BOTH' | 'DISPUTED';
  validated_at: string | null;
  created_at: string;
}

interface StatementData {
  business: {
    business_name: string;
    phone: string;
    currency_symbol: string;
    logo_url?: string;
  };
  customer: {
    id: string;
    full_name: string;
    current_balance: number;
    credit_limit: number;
    is_blocked: boolean;
  };
  transactions: Transaction[];
}

export default function CustomerQRPortal({ qrToken }: { qrToken: string }) {
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para tarjetas desplegables (Accordion)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  
  // Estado para modal de firma con PIN
  const [certifyingTx, setCertifyingTx] = useState<Transaction | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  // Cargar datos iniciales vía RPC o almacenamiento local de contingencia
  const fetchStatement = async () => {
    if (supabase) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_statement_by_qr', {
          p_qr_token: qrToken,
        });

        if (!rpcError && rpcData && !rpcData.error) {
          setData(rpcData);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Fallback a almacenamiento local sincronizado');
      }
    }

    // Fallback reactivo con el almacenamiento local sincronizado
    const stored = getStoredData();
    const customer = stored.customers.find((c) => c.qr_token === qrToken);

    if (!customer) {
      setError('Código QR inválido o no encontrado');
      setLoading(false);
      return;
    }

    const customerTxs = stored.transactions
      .filter((t) => t.customer_id === customer.id)
      .map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        previous_balance: t.previous_balance,
        new_balance: t.new_balance,
        description: t.description || '',
        items: t.items || [],
        status: t.status,
        validated_at: t.validated_at || null,
        created_at: t.created_at,
      }));

    setData({
      business: {
        business_name: stored.tenant.business_name,
        phone: stored.tenant.phone || '',
        currency_symbol: stored.tenant.currency_symbol || '₲',
        logo_url: stored.tenant.logo_url,
      },
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        current_balance: customer.current_balance,
        credit_limit: customer.credit_limit,
        is_blocked: customer.is_blocked,
      },
      transactions: customerTxs,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchStatement();

    // Sincronización en TIEMPO REAL si Supabase está conectado
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel(`customer-qr-${qrToken}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => {
            fetchStatement();
          }
        )
        .subscribe();
    }

    const handleLocalUpdate = () => fetchStatement();
    window.addEventListener('libreta_data_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      if (supabase && channel) supabase.removeChannel(channel);
      window.removeEventListener('libreta_data_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, [qrToken]);

  // Ejecutar firma/convalidación con PIN
  const handleCertifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certifyingTx || pinInput.length < 4) return;

    setPinLoading(true);
    setPinFeedback(null);

    if (supabase) {
      try {
        const { data: res, error: certError } = await supabase.rpc('certify_transaction_with_pin', {
          p_qr_token: qrToken,
          p_transaction_id: certifyingTx.id,
          p_pin: pinInput,
          p_method: 'REMOTE_QR_APPROVAL',
          p_metadata: { userAgent: navigator.userAgent },
        });

        if (!certError && res?.success) {
          setPinLoading(false);
          setPinFeedback({ type: 'success', msg: '¡Operación certificada con éxito!' });
          setTimeout(() => {
            setCertifyingTx(null);
            setPinInput('');
            setPinFeedback(null);
            fetchStatement();
          }, 1200);
          return;
        }
      } catch (err) {
        // Fallback al ledger local
      }
    }

    // Validación mediante función de convalidación ledger
    const res = certifyTransactionWithPin(certifyingTx.id, pinInput, 'REMOTE_QR_APPROVAL');
    setPinLoading(false);

    if (!res.success) {
      setPinFeedback({ type: 'error', msg: res.message || 'Error al verificar PIN' });
    } else {
      setPinFeedback({ type: 'success', msg: '¡Operación certificada con éxito!' });
      setTimeout(() => {
        setCertifyingTx(null);
        setPinInput('');
        setPinFeedback(null);
        fetchStatement();
      }, 1200);
    }
  };

  const formatMoney = (amount: number) => {
    const symbol = data?.business.currency_symbol || '₲';
    return `${symbol} ${new Intl.NumberFormat('es-PY').format(amount)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-pulse text-slate-500 font-medium">Cargando libreta digital...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Enlace no válido</h2>
        <p className="text-slate-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const pendingCount = data.transactions.filter((t) => t.status === 'PENDING_CUSTOMER').length;

  return (
    <div className="min-h-screen bg-slate-100 pb-12 max-w-md mx-auto shadow-xl font-sans">
      {/* CABECERA DEL COMERCIO */}
      <header className="bg-slate-900 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 p-2 rounded-xl">
              <Store className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Estado de Cuenta</p>
              <h1 className="font-bold text-base leading-tight">{data.business.business_name}</h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> En vivo
          </span>
        </div>

        {/* TARJETA DE SALDO ACTUAL */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mt-2">
          <p className="text-sm text-slate-300">Hola, <span className="font-semibold text-white">{data.customer.full_name}</span></p>
          <p className="text-xs text-slate-400 mt-3">Saldo Total Adeudado</p>
          <div className="text-3xl font-extrabold tracking-tight text-white mt-0.5">
            {formatMoney(data.customer.current_balance)}
          </div>
          
          {data.customer.credit_limit > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/70 flex justify-between text-xs text-slate-400">
              <span>Límite autorizado:</span>
              <span className="text-slate-200 font-medium">{formatMoney(data.customer.credit_limit)}</span>
            </div>
          )}
        </div>
      </header>

      {/* ALERTA DE OPERACIONES PENDIENTES DE FIRMA */}
      {pendingCount > 0 && (
        <div className="mx-4 -mt-4 bg-amber-50 border border-amber-300 rounded-xl p-3.5 shadow-sm flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <p className="font-bold">Tienes {pendingCount} movimiento(s) por convalidar</p>
            <p className="mt-0.5 text-amber-800">Revisa el detalle abajo y confirma con tu PIN de seguridad.</p>
          </div>
        </div>
      )}

      {/* LISTA DE MOVIMIENTOS (TARJETAS DESPLEGABLES) */}
      <main className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-slate-500" /> Historial de Movimientos
          </h2>
          <span className="text-xs text-slate-500">{data.transactions.length} registros</span>
        </div>

        <div className="space-y-3">
          {data.transactions.map((tx) => {
            const isPurchase = tx.type === 'DEBIT_PURCHASE' || tx.type === 'ADJUSTMENT_DEBIT';
            const isExpanded = expandedTxId === tx.id;
            const isCertified = tx.status === 'CERTIFIED_BOTH';

            return (
              <div 
                key={tx.id} 
                className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-sm ${
                  !isCertified ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                }`}
              >
                {/* CABECERA DE LA TARJETA (SIEMPRE VISIBLE) */}
                <button
                  onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        isPurchase ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {isPurchase ? 'COMPRA' : 'ABONO / PAGO'}
                      </span>
                      
                      {isCertified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Certificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Pendiente firma
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-800 truncate mt-1.5">
                      {tx.description || (isPurchase ? 'Retiro de mercaderías' : 'Pago registrado')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleString('es-PY', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <p className={`text-base font-extrabold ${isPurchase ? 'text-slate-900' : 'text-emerald-600'}`}>
                        {isPurchase ? '+' : '-'}{formatMoney(tx.amount)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Saldo: {formatMoney(tx.new_balance)}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* CONTENIDO DESPLEGABLE (DETALLE DE ÍTEMS Y BOTÓN DE FIRMA) */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 text-xs space-y-3">
                    {tx.items && tx.items.length > 0 && (
                      <div>
                        <p className="font-semibold text-slate-600 mb-1.5">Detalle de mercaderías:</p>
                        <ul className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/70">
                          {tx.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between text-slate-700">
                              <span>{item.qty}x {item.name}</span>
                              <span className="font-medium">{formatMoney(item.price * item.qty)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-500 pt-1">
                      <span>Saldo anterior: {formatMoney(tx.previous_balance)}</span>
                      <span>Nuevo saldo: {formatMoney(tx.new_balance)}</span>
                    </div>

                    {!isCertified ? (
                      <button
                        onClick={() => setCertifyingTx(tx)}
                        className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
                      >
                        <ShieldCheck className="w-4 h-4" /> Convalidar esta operación con mi PIN
                      </button>
                    ) : (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50/80 p-2 rounded-lg text-center font-medium">
                        ✓ Convalidado por ambas partes el {new Date(tx.validated_at!).toLocaleString('es-PY')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* MODAL PARA INGRESAR PIN Y FIRMAR */}
      {certifyingTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-slate-800 mb-2">
              <Lock className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-lg">Certificar Operación</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Confirmas el movimiento por <strong className="text-slate-900">{formatMoney(certifyingTx.amount)}</strong> en <strong>{data.business.business_name}</strong>.
            </p>

            <form onSubmit={handleCertifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ingresa tu PIN personal de 4 dígitos
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center text-2xl tracking-[0.5em] font-bold py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              {pinFeedback && (
                <p className={`text-xs font-medium text-center p-2 rounded-lg ${
                  pinFeedback.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {pinFeedback.msg}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCertifyingTx(null);
                    setPinInput('');
                    setPinFeedback(null);
                  }}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pinInput.length < 4 || pinLoading}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition"
                >
                  {pinLoading ? 'Verificando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
