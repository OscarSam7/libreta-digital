'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  Smartphone,
  QrCode,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ReceiptText,
  FileSpreadsheet,
  Users,
  Store,
  MessageCircle,
  Banknote,
  Building,
  KeyRound,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  DollarSign,
  Calculator,
  Lock,
  ThumbsUp,
  Star
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function CommercialShowcasePage() {
  const [activeSimTab, setActiveSimTab] = useState<'VENTA' | 'WHATSAPP' | 'LEGAL' | 'CAJA'>('VENTA');

  // Estado del simulador de venta
  const [simAmount, setSimAmount] = useState('45000');
  const [simPin, setSimPin] = useState('');
  const [simSuccess, setSimSuccess] = useState(false);

  // Estado de la calculadora de ROI
  const [fiadoMensual, setFiadoMensual] = useState<number>(5000000); // 5 millones de Gs

  // Cálculos de ROI
  // Un almacén tradicional pierde entre 15% y 25% por morosidad y descontrol. Con LibretaDigital recupera el 85% de esa pérdida.
  const perdidaEstimadaPapel = Math.round(fiadoMensual * 0.18);
  const ahorroLibreta = Math.round(perdidaEstimadaPapel * 0.85);

  const handleSimulateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (simPin === '1234' || simPin.length === 4) {
      setSimSuccess(true);
      setTimeout(() => {
        setSimSuccess(false);
        setSimPin('');
      }, 4000);
    } else {
      alert('Ingresa el PIN de prueba: 1234');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white font-sans">
      {/* NAVBAR */}
      <header className="border-b border-slate-850 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition">
            <BrandLogo size="md" theme="dark" showTagline={false} />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition hidden sm:inline-block"
            >
              Terminal POS
            </Link>
            <Link
              href="/registro-comercio"
              className="text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/30 flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Probar 14 Días Gratis</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 border-b border-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/90 border border-blue-800/60 text-blue-300 text-xs font-black uppercase tracking-wider animate-fadeIn">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Showcase Oficial • FinTech POS & Fiado en Tiempo Real</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Dile adiós al cuaderno de papel. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Cobra tus fiados en tiempo real con respaldo legal.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            La plataforma que transforma despensas, autoservicios y distribuidoras en comercios inteligentes:
            ventas con PIN del cliente, cobranzas automáticas por WhatsApp, escrutinio Informconf y pagos multicanal (QR, Pix, Efectivo).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/registro-comercio"
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Store className="w-4 h-4" />
              <span>Comenzar Mi Prueba Gratis (14 Días)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#simulador"
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <span>Ver Simulador Interactivo</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* MÉTRICAS DE CONFIANZA */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 block">-85%</span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Morosidad en la Calle</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl sm:text-3xl font-black text-blue-400 block">100%</span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cero Disputas (Con PIN)</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 block">+12x</span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Retorno de Inversión</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl sm:text-3xl font-black text-indigo-400 block">3 Seg</span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cobranza por WhatsApp</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: SIMULADOR INTERACTIVO EN VIVO */}
      <section id="simulador" className="py-16 px-4 max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-10">
          <span className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-800/60 inline-block">
            Demostración en Tiempo Real
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Prueba cómo funciona en tu mostrador
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Interactúa con los 4 pilares tecnológicos de LibretaDigital PRO antes de implementarlo en tu negocio.
          </p>

          {/* TABS DEL SIMULADOR */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setActiveSimTab('VENTA')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeSimTab === 'VENTA'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" /> 1. Venta Fiada con PIN
            </button>
            <button
              onClick={() => setActiveSimTab('WHATSAPP')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeSimTab === 'WHATSAPP'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> 2. Cobranza WhatsApp
            </button>
            <button
              onClick={() => setActiveSimTab('LEGAL')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeSimTab === 'LEGAL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> 3. Escudo Informconf
            </button>
            <button
              onClick={() => setActiveSimTab('CAJA')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeSimTab === 'CAJA'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> 4. Roles y Cajeros
            </button>
          </div>
        </div>

        {/* PANELES DEL SIMULADOR */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {activeSimTab === 'VENTA' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-[11px] font-black uppercase text-blue-400 tracking-wider">
                  Certificación Inmutable en Mostrador
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  El cliente aprueba con su PIN de 4 dígitos
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Nunca más una disputa de <i>"yo no llevé eso"</i> ni tachones en hojas sueltas. Cuando el cliente compra fiado, ingresa su PIN personal en tu teléfono o tablet POS. El asiento contable queda bloqueado y certificado.
                </p>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Límite de crédito pactado con tope automático.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Detalle exacto de mercadería (kilos, unidades, marcas).</span>
                  </div>
                </div>
              </div>

              {/* MOCKUP INTERACTIVO TERMINAL */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Cliente en Mostrador</span>
                    <span className="text-sm font-black text-white">Don Roberto Gómez</span>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Crédito Aprobado
                  </span>
                </div>

                <form onSubmit={handleSimulateSale} className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">Monto de la Compra (₲)</label>
                    <input
                      type="text"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white font-mono font-bold text-base rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">
                      PIN del Cliente (Digita <b className="text-emerald-400">1234</b> para probar)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={simPin}
                      onChange={(e) => setSimPin(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-black text-center tracking-widest text-lg rounded-xl focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5"
                  >
                    <span>Confirmar Fiado con PIN</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {simSuccess && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center space-y-1 animate-fadeIn">
                    <span className="text-xs font-black text-emerald-300 block">✓ ¡Fiado Certificado con Éxito!</span>
                    <p className="text-[10px] text-slate-300">Asiento inmutable registrado. Comprobante digital enviado al cliente.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSimTab === 'WHATSAPP' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                  Cobranza en 1 Clic
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Recordatorios automáticos con botón de pago
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Envía avisos de saldo por WhatsApp con un solo clic. El mensaje incluye el detalle exacto de las compras, el total adeudado y los datos bancarios (o QR) para que te abonen al instante.
                </p>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Redacción cortés y profesional que cuida la relación de vecindad.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Acepta Pix, QR bancario, Transferencia o Efectivo en caja.</span>
                  </div>
                </div>
              </div>

              {/* MOCKUP WHATSAPP CHAT */}
              <div className="bg-[#0b141a] border border-slate-800 rounded-2xl p-4 space-y-3 font-sans shadow-xl max-w-sm mx-auto w-full">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-black text-white">
                    DM
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Almacén Don Mario</span>
                    <span className="text-[10px] text-emerald-400">En línea</span>
                  </div>
                </div>

                <div className="bg-[#202c33] rounded-2xl p-3 text-xs text-slate-200 space-y-2 border-l-4 border-emerald-500 shadow-md">
                  <p className="font-bold text-emerald-400">Estimado Don Roberto Gómez,</p>
                  <p className="text-[11px] text-slate-300">
                    Le saludamos de <b>Almacén Don Mario</b>. Su saldo de compras fiadas al día de hoy es de:
                  </p>
                  <div className="bg-[#111b21] p-2.5 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block">TOTAL ADEUDADO:</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">₲ 145.000</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Puede liquidar en caja o transferir a nuestra cuenta con su comprobante. ¡Muchas gracias por su preferencia!
                  </p>
                  <div className="text-right text-[9px] text-slate-500">10:45 AM ✓✓</div>
                </div>
              </div>
            </div>
          )}

          {activeSimTab === 'LEGAL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-[11px] font-black uppercase text-indigo-400 tracking-wider">
                  Blindaje Jurídico y Financiero
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Términos de Crédito y Cláusula Informconf
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Al registrarse, el cliente valida digitalmente su identidad y firma los términos que autorizan al comercio a reportar morosidades ante burós crediticios conforme a la Ley de Protección de Datos Personales.
                </p>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Contrato digital respaldado con IP, fecha y PIN de cliente.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Exportación de Estados de Cuenta con validez ejecutiva en PDF.</span>
                  </div>
                </div>
              </div>

              {/* MOCKUP CONTRATO */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-indigo-400 font-black">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Certificado de Aceptación Digital</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl space-y-2 border border-slate-800 font-mono text-[11px] text-slate-300">
                  <p><b>Titular:</b> Roberto Gómez (CI: 3.456.789)</p>
                  <p><b>Cláusula:</b> "Autorizo expresamente la verificación y reporte de obligaciones crediticias ante burós autorizados..."</p>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                    <span>ESTADO: FIRMADO DIGITALMENTE</span>
                    <span>✓ AUTORIZACIÓN VIGENTE</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSimTab === 'CAJA' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-[11px] font-black uppercase text-purple-400 tracking-wider">
                  Control Total de Empleados
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Roles para Cajeros y Cobradores con PIN
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Tus cajeros pueden cargar fiados y registrar cobros en la caja, pero no pueden alterar límites de crédito, anular ventas ni ver las ganancias globales de la tienda sin tu autorización.
                </p>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Trazabilidad absoluta: cada venta registra el cajero responsable.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cambio de turno rápido en el mostrador mediante PIN de 4 dígitos.</span>
                  </div>
                </div>
              </div>

              {/* MOCKUP ROLES */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-black flex items-center justify-center text-xs">D</div>
                    <div>
                      <span className="font-bold text-white block">Don Mario Gómez</span>
                      <span className="text-[10px] text-amber-400">Dueño (Acceso Total)</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">PIN: 1234</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 font-black flex items-center justify-center text-xs">J</div>
                    <div>
                      <span className="font-bold text-white block">Juan Pérez</span>
                      <span className="text-[10px] text-blue-400">Cajero Mañana (Ventas & Cobros)</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full">PIN: 1111</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CALCULADORA INTERACTIVA DE RETORNO DE INVERSIÓN (ROI) */}
      <section className="py-16 px-4 bg-slate-900/40 border-y border-slate-900">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/60 inline-block">
              Calculadora de Ganancias Recuperadas
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              ¿Cuánto dinero estás perdiendo hoy con el cuaderno?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Mueve la barra según el dinero que fías en la calle al mes y calcula tu ahorro neto.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase">Total fiado estimado por mes:</span>
                <span className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
                  ₲ {fiadoMensual.toLocaleString('es-PY')}
                </span>
              </div>
              <input
                type="range"
                min={1000000}
                max={30000000}
                step={500000}
                value={fiadoMensual}
                onChange={(e) => setFiadoMensual(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>₲ 1.000.000</span>
                <span>₲ 15.000.000</span>
                <span>₲ 30.000.000</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50">
                <span className="text-[11px] font-bold text-rose-400 uppercase block mb-1">
                  Pérdida típica en papel (Morosidad/Olvidos):
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-300 font-mono">
                  - ₲ {perdidaEstimadaPapel.toLocaleString('es-PY')}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Estimado 18% de cuentas incobrables o disputadas en cuadernos comunes.</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60">
                <span className="text-[11px] font-bold text-emerald-400 uppercase block mb-1">
                  Dinero que rescatas con LibretaDigital PRO:
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                  + ₲ {ahorroLibreta.toLocaleString('es-PY')}
                </span>
                <p className="text-[10px] text-slate-300 mt-1">Recuperas hasta el 85% de la morosidad mediante avisos WhatsApp y PIN inmutable.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARATIVA: CUADERNO VS LIBRETADIGITAL PRO */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-4xl font-black text-white">Cuaderno de Papel vs. LibretaDigital PRO</h2>
          <p className="text-xs sm:text-sm text-slate-400">¿Por qué los mejores almacenes están modernizando su caja?</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-slate-800 rounded-2xl overflow-hidden">
            <thead className="bg-slate-900 text-slate-300 uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Característica</th>
                <th className="py-3 px-4 text-rose-400 bg-rose-950/20">Cuaderno Tradicional</th>
                <th className="py-3 px-4 text-emerald-400 bg-emerald-950/30">LibretaDigital PRO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/60">
              <tr>
                <td className="py-3 px-4 font-bold text-white">Firma y Certificación de Deuda</td>
                <td className="py-3 px-4 text-slate-400">Garabatos o nada (fácil de negar)</td>
                <td className="py-3 px-4 font-bold text-emerald-400">PIN de 4 dígitos en mostrador</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Recordatorios de Pago</td>
                <td className="py-3 px-4 text-slate-400">Llamadas incómodas o visitas puerta a puerta</td>
                <td className="py-3 px-4 font-bold text-emerald-400">1 Clic por WhatsApp con detalle y QR</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Seguridad de la Información</td>
                <td className="py-3 px-4 text-slate-400">Pérdida por robo, agua o extravío de hojas</td>
                <td className="py-3 px-4 font-bold text-emerald-400">Nube cifrada PostgreSQL / Supabase</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Límite de Crédito</td>
                <td className="py-3 px-4 text-slate-400">De memoria (riesgo de fiar de más)</td>
                <td className="py-3 px-4 font-bold text-emerald-400">Bloqueo automático al superar el tope</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Control de Empleados</td>
                <td className="py-3 px-4 text-slate-400">Cualquiera anota y no se sabe quién cobró</td>
                <td className="py-3 px-4 font-bold text-emerald-400">Trazabilidad por Cajero y Turno POS</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* PLANES COMERCIALES */}
      <section className="py-16 px-4 bg-slate-900/30 border-t border-slate-900">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800/60 inline-block">
              Inversión Transparente
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">Planes Comerciales Simples</h2>
            <p className="text-xs sm:text-sm text-slate-400">Elige el plan que mejor se adapte al tamaño de tu comercio.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PLAN VECINAL */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                  Emprendedor
                </span>
                <h3 className="text-xl font-black text-white">Plan Vecinal</h3>
                <p className="text-xs text-slate-400">Para pequeñas despensas que quieren ordenar sus cuentas.</p>
                <div className="pt-2">
                  <span className="text-2xl font-black text-white">₲ 89.000</span>
                  <span className="text-xs text-slate-500"> / mes</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2">✓ Hasta 60 clientes activos</li>
                  <li className="flex items-center gap-2">✓ Validación con PIN en caja</li>
                  <li className="flex items-center gap-2">✓ Avisos básicos de saldo</li>
                </ul>
              </div>
              <Link
                href="/registro-comercio"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold text-center block transition"
              >
                Comenzar Prueba
              </Link>
            </div>

            {/* PLAN COMERCIO PRO (DESTACADO) */}
            <div className="bg-gradient-to-b from-blue-900/40 via-slate-900 to-slate-900 border-2 border-blue-500 rounded-3xl p-6 space-y-5 flex flex-col justify-between relative shadow-2xl shadow-blue-900/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-md">
                El Más Elegido
              </div>
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 bg-blue-950 px-2.5 py-1 rounded-full border border-blue-800/60">
                  Negocio en Crecimiento
                </span>
                <h3 className="text-xl font-black text-white">Comercio PRO</h3>
                <p className="text-xs text-slate-300">Para almacenes y minimercados con alto flujo de clientes.</p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-white">₲ 189.000</span>
                  <span className="text-xs text-slate-400"> / mes</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-200 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2 font-bold text-white">✓ Clientes y Fiados Ilimitados</li>
                  <li className="flex items-center gap-2">✓ Cobranzas por WhatsApp automáticas</li>
                  <li className="flex items-center gap-2">✓ Módulo Legal Informconf Digital</li>
                  <li className="flex items-center gap-2">✓ Multi-Cajeros y Control de Turnos</li>
                  <li className="flex items-center gap-2">✓ Estados de Cuenta PDF al instante</li>
                </ul>
              </div>
              <Link
                href="/registro-comercio"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black text-center block transition shadow-lg shadow-blue-600/30"
              >
                Probar 14 Días Gratis
              </Link>
            </div>

            {/* PLAN MULTI-SUCURSAL */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-950 px-2.5 py-1 rounded-full border border-purple-800/60">
                  Cadenas y Distribución
                </span>
                <h3 className="text-xl font-black text-white">Multi-Sucursal</h3>
                <p className="text-xs text-slate-400">Para empresas con varias sucursales y cobradores en calle.</p>
                <div className="pt-2">
                  <span className="text-2xl font-black text-white">₲ 349.000</span>
                  <span className="text-xs text-slate-500"> / mes</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2">✓ Todo lo del plan PRO</li>
                  <li className="flex items-center gap-2">✓ Múltiples sucursales consolidadas</li>
                  <li className="flex items-center gap-2">✓ App móvil para cobradores en moto</li>
                  <li className="flex items-center gap-2">✓ Soporte VIP prioritario 24/7</li>
                </ul>
              </div>
              <Link
                href="/registro-comercio"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold text-center block transition"
              >
                Contactar Ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL DE ALTA CONVERSIÓN */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            ¿Listo para blindar tu negocio y cobrar a tiempo?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Configura tu almacén en 60 segundos. No necesitas tarjeta de crédito para comenzar tu prueba gratuita de 14 días.
          </p>
          <div className="pt-2">
            <Link
              href="/registro-comercio"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm sm:text-base font-black shadow-xl shadow-blue-600/40 transition active:scale-95"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Crear Mi Almacén Ahora (Gratis)</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-[11px] text-slate-500">
            LibretaDigital PRO • FinTech POS & Fiado en Tiempo Real • Soporte en Español y Guaraní
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <BrandLogo size="sm" theme="dark" showTagline={false} />
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/" className="hover:text-white transition">Terminal POS</Link>
            <Link href="/registro-comercio" className="hover:text-white transition">Registro Comercios</Link>
            <Link href="/registro-cliente" className="hover:text-white transition">Registro Clientes</Link>
            <Link href="/admin" className="text-indigo-400 hover:text-indigo-300 font-bold transition">Super Admin</Link>
          </div>
          <p className="text-[11px] text-slate-600">© 2026 LibretaDigital Pro. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
