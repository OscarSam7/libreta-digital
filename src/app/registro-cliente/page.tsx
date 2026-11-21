'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Store,
  User,
  Phone,
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  FileText,
  MapPin,
  Check,
  HelpCircle,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { Tenant } from '@/types';
import { getStoredData, saveCustomers, cleanCustomerForSupabase } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';
import { BrandLogo } from '@/components/BrandLogo';
import { CustomSelect } from '@/components/ui/CustomSelectModal';
import { sanitizeText } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt } from '@/lib/rateLimit';

function ClientRegisterContent() {
  const searchParams = useSearchParams();
  const preselectedTenantId = searchParams.get('almacen') || '';

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(preselectedTenantId);
  const [loadingTenants, setLoadingTenants] = useState(true);

  // Formulario del cliente
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Términos y condiciones
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Estados de proceso
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState<{
    customerName: string;
    qrToken: string;
    businessName: string;
  } | null>(null);

  // Cargar comercios disponibles
  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await fetch('/api/tenants');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.tenants) && json.tenants.length > 0) {
            setTenants(json.tenants);
            if (preselectedTenantId) {
              const match = json.tenants.find((t: Tenant) => t.id === preselectedTenantId);
              if (match) {
                setSelectedTenantId(match.id);
              } else {
                setSelectedTenantId(preselectedTenantId);
              }
            } else {
              setSelectedTenantId(json.tenants[0].id);
            }
            setLoadingTenants(false);
            return;
          }
        }
      } catch (apiErr) {}

      try {
        const supabase = createClient();
        if (supabase) {
          const { data, error } = await supabase.from('tenants').select('*').order('business_name');
          if (!error && data && data.length > 0) {
            setTenants(data);
            if (!preselectedTenantId) {
              setSelectedTenantId(data[0].id);
            } else {
              setSelectedTenantId(preselectedTenantId);
            }
            setLoadingTenants(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Fallback a almacenamiento local para tenants');
      }

      // Fallback local
      const stored = getStoredData();
      if (stored.tenant) {
        setTenants([stored.tenant]);
        setSelectedTenantId(preselectedTenantId || stored.tenant.id);
      }
      setLoadingTenants(false);
    }

    fetchTenants();
  }, [preselectedTenantId]);

  const activeTenant = tenants.find((t) => t.id === selectedTenantId) || tenants[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Por favor ingresa tu nombre y apellido completo.');
      return;
    }
    if (!documentId.trim()) {
      setErrorMsg('Por favor ingresa tu número de cédula de identidad.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Por favor ingresa tu número de teléfono / WhatsApp.');
      return;
    }
    if (securityPin.length !== 4 || !/^\d{4}$/.test(securityPin)) {
      setErrorMsg('El PIN de seguridad debe contener exactamente 4 dígitos numéricos.');
      return;
    }
    if (securityPin !== confirmPin) {
      setErrorMsg('Los dos PIN ingresados no coinciden.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('Debes leer y aceptar los Términos y Condiciones Legales y la Autorización de Informconf.');
      return;
    }
    if (!selectedTenantId) {
      setErrorMsg('Por favor selecciona el comercio o almacén al que solicitas crédito.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const rateCheck = checkRateLimit(`client_reg_${cleanPhone}`, 4, 15);
    if (!rateCheck.allowed) {
      setErrorMsg(`Demasiadas solicitudes registradas recientemente. Espere ${rateCheck.retryAfterSeconds} segundos.`);
      return;
    }

    setSubmitting(true);

    try {
      const cleanDoc = documentId.replace(/\D/g, '') || Math.floor(1000 + Math.random() * 9000).toString();
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const generatedToken = `c-${cleanDoc}-${randomSuffix}`;
      const newCustomerId = crypto.randomUUID();

      const newCustomer = {
        id: newCustomerId,
        tenant_id: selectedTenantId,
        full_name: sanitizeText(fullName, 100),
        nickname: address.trim() ? `Dir: ${sanitizeText(address, 150)}` : '',
        document_id: sanitizeText(documentId, 30),
        phone: cleanPhone,
        qr_token: generatedToken,
        security_pin: securityPin,
        credit_limit: 0, // Inicia con 0 hasta que el almacenero evalúe el límite
        current_balance: 0,
        is_blocked: false,
        credit_cycle: 'MENSUAL' as const,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_acceptance_method: 'PORTAL_PIN' as const,
        terms_acceptance_metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Customer Mobile Web',
          registeredVia: 'SELF_REGISTER_FORM',
          registrationDate: new Date().toISOString()
        },
        registered_via: 'SELF_MOBILE_LINK' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Sincronizar de inmediato con el servidor central para que el almacenero lo vea al instante
      try {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCustomer),
        });
      } catch (apiErr) {
        console.warn('API cloud sync notice:', apiErr);
      }

      // 2. BroadcastChannel para actualización en vivo entre pestañas/navegadores
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('libretadigital_customers_channel');
          bc.postMessage({ type: 'NEW_CUSTOMER_REGISTERED', customer: newCustomer });
          bc.close();
        }
      } catch (e) {}

      // 3. Guardar en Supabase si está disponible
      const supabase = createClient();
      if (supabase) {
        const { error: sbError } = await supabase.from('customers').insert(cleanCustomerForSupabase(newCustomer as any));
        if (sbError) {
          console.warn('Supabase insert notice:', sbError.message);
        }
      }

      // Guardar en almacenamiento local
      const stored = getStoredData();
      saveCustomers([newCustomer, ...stored.customers]);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setRegisteredSuccess({
        customerName: fullName.trim(),
        qrToken: generatedToken,
        businessName: activeTenant ? activeTenant.business_name : 'el Almacén',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al procesar tu registro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 py-10 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-lg">
        {/* ENCABEZADO DE MARCA OFICIAL */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo size="lg" theme="dark" showTagline />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-2">
            Solicitud de Libreta & Cuenta Corriente
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Regístrate digitalmente para acceder a compras fiadas con firma segura por PIN
          </p>
        </div>

        {/* CASO ÉXITO */}
        {registeredSuccess ? (
          <div className="bg-slate-800 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
              ¡Registro Completado con Éxito!
            </span>

            <h2 className="text-xl font-bold text-white mb-2">
              ¡Bienvenido, {registeredSuccess.customerName}!
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Tu solicitud de libreta para <strong className="text-white">{registeredSuccess.businessName}</strong> ha sido registrada. 
              Tus Términos y Condiciones y consentimiento de Informconf quedaron convalidados digitalmente con tu PIN.
            </p>

            <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 mb-6 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <QrCode className="w-4 h-4" /> Tu Libreta Digital Personal
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Guarda este enlace en tus favoritos o añade la página a la pantalla de inicio de tu celular para consultar tu saldo y autorizar compras en cualquier momento:
              </p>
              <a
                href={`/portal/${registeredSuccess.qrToken}`}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition"
              >
                Acceder a mi Libreta Digital <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <p className="text-[11px] text-slate-400">
              El comerciante ya tiene tu registro en su panel y asignará tu límite de crédito en tu próxima visita o compra.
            </p>
          </div>
        ) : (
          /* FORMULARIO DE REGISTRO */
          <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-300 text-xs font-medium">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* COMERCIO / ALMACÉN */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" /> Comercio / Almacén Solicitado
                </label>
                {loadingTenants ? (
                  <div className="text-xs text-slate-400 py-2">Cargando comercios...</div>
                ) : (
                  <CustomSelect
                    value={selectedTenantId}
                    onChange={(val) => setSelectedTenantId(String(val))}
                    title="Seleccionar Almacén / Comercio"
                    placeholder="Elige el comercio..."
                    searchable={true}
                    buttonClassName="bg-slate-900 border border-slate-700 text-white hover:border-emerald-500"
                    options={tenants.map((t) => ({
                      value: t.id,
                      label: t.business_name,
                      sublabel: t.address || undefined,
                    }))}
                  />
                )}
              </div>

              {/* NOMBRE COMPLETO */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> Nombre y Apellido
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Roberto Gómez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* CÉDULA Y TELÉFONO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Cédula de Identidad / DNI
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 3.456.789"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 0981 123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* DIRECCIÓN / BARRIO */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Dirección o Barrio (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Barrio San Pablo, Casa 12"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* CREAR PIN DE SEGURIDAD (4 DÍGITOS) */}
              <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Crea tu PIN de Seguridad (4 dígitos)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Este PIN será tu firma digital secreta para confirmar cuando lleves mercaderías a crédito y evitar suplantaciones de identidad.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        PIN (4 números)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="text-slate-400 hover:text-white transition cursor-pointer"
                        title={showPin ? "Ocultar PIN" : "Ver PIN"}
                      >
                        {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <input
                      type={showPin ? "text" : "password"}
                      maxLength={4}
                      inputMode="numeric"
                      required
                      placeholder="••••"
                      value={securityPin}
                      onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center text-lg font-mono tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">
                        Confirmar PIN
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                        className="text-slate-400 hover:text-white transition cursor-pointer"
                        title={showConfirmPin ? "Ocultar PIN" : "Ver PIN"}
                      >
                        {showConfirmPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <input
                      type={showConfirmPin ? "text" : "password"}
                      maxLength={4}
                      inputMode="numeric"
                      required
                      placeholder="••••"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center text-lg font-mono tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* CASILLA DE TÉRMINOS Y CONDICIONES & INFORCONF */}
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      id="terms-client-checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <label htmlFor="terms-client-checkbox" className="text-xs text-slate-300 leading-snug cursor-pointer">
                    He leído y acepto los{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      Términos de Crédito y Autorización de Informconf <FileText className="w-3 h-3" />
                    </button>
                    , consintiendo la facturación periódica y el reporte crediticio legal en caso de mora (Ley N° 6534/20 y Ley N° 6822/21).
                  </label>
                </div>
              </div>

              {/* BOTÓN ENVIAR REGISTRO */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition active:scale-[0.99]"
              >
                {submitting ? (
                  <span>Registrando solicitud...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Solicitar Mi Libreta Digital
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <div className="text-center mt-6">
          <a
            href="/"
            className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1 font-medium"
          >
            ← Volver al Portal Principal
          </a>
        </div>
      </div>

      {/* MODAL LECTURA DE TÉRMINOS Y CONDICIONES */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  Términos y Condiciones Legales & Informconf
                </h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>1. OBJETO Y LÍMITE DE CRÉDITO:</strong> El establecimiento ({activeTenant ? activeTenant.business_name : 'El Comercio'}) otorga una línea de crédito rotativo de consumo familiar (&quot;fiado&quot;) conforme a su evaluación comercial.
              </p>
              <p className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/50 text-amber-200">
                <strong>2. FACULTAD EXCLUSIVA DEL DUEÑO DEL COMERCIO:</strong> El dueño del almacén es la única persona facultada para determinar, evaluar y fijar el límite máximo de crédito autorizado y los plazos de pago para conceder, ampliar o suspender el crédito en función al historial y cumplimiento del cliente.
              </p>
              <p>
                <strong>3. FIRMA DIGITAL MEDIANTE PIN:</strong> Conforme a la <strong>Ley N° 6822/21</strong>, cada compra confirmada mediante el PIN de 4 dígitos creado por el cliente constituye prueba fehaciente de la recepción de mercaderías con plena validez probatoria.
              </p>
              <p>
                <strong>4. FACTURACIÓN Y CICLO:</strong> Al cierre de cada ciclo (semanal, quincenal o mensual), el comercio emitirá una factura legal a crédito por el total adeudado.
              </p>
              <p>
                <strong>5. AUTORIZACIÓN INFORMCONF (Ley N° 6534/20):</strong> En caso de mora superior a los plazos legales, el cliente autoriza irrevocablemente al comercio a comunicar sus datos a las bases de datos de información crediticia (Equifax / Informconf u otras autorizadas por el BCP).
              </p>
            </div>

            <div className="p-4 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" /> Entendido y Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegisterCustomerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">Cargando formulario...</div>}>
      <ClientRegisterContent />
    </Suspense>
  );
}
