'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, AlertTriangle, Scale, Lock, ExternalLink } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { isMerchantLoggedIn } from '@/lib/storage';

function TerminosContent() {
  const searchParams = useSearchParams();
  const queryReturnTo = searchParams.get('returnTo');
  const [backHref, setBackHref] = useState('/');
  const [backLabel, setBackLabel] = useState('Volver a la App');

  useEffect(() => {
    if (queryReturnTo && queryReturnTo.startsWith('/')) {
      setBackHref(queryReturnTo);
      setBackLabel(queryReturnTo.startsWith('/portal/') ? 'Volver a Mi Libreta' : 'Volver');
      return;
    }
    if (!isMerchantLoggedIn()) {
      try {
        const raw = localStorage.getItem('libretadigital_last_customer');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.token) {
            setBackHref(`/portal/${parsed.token}`);
            setBackLabel('Volver a Mi Libreta');
          }
        }
      } catch {}
    }
  }, [queryReturnTo]);

  const privacyHref = queryReturnTo ? `/privacidad?returnTo=${encodeURIComponent(queryReturnTo)}` : '/privacidad';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* HEADER NAVEGACIÓN */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={backHref} className="flex items-center gap-2 hover:opacity-90 transition">
            <BrandLogo size="sm" theme="dark" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={privacyHref}
              className="text-xs text-slate-400 hover:text-white font-medium transition hidden sm:inline"
            >
              Política de Privacidad →
            </Link>
            <Link
              href={backHref}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-800 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="py-12 px-4 border-b border-slate-900/60 bg-gradient-to-b from-blue-950/20 via-slate-950 to-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
            <Scale className="w-3.5 h-3.5" /> Contrato de Licencia & Términos de Servicio SaaS
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-3xl">
            Acuerdo legal y contractual vinculante entre el Proveedor Tecnológico de <b>LibretaDigital Pro</b> y los
            Comercios, Administradores, Operadores y Clientes usuarios de la plataforma.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-500">
            <span>Versión Oficial: <b>2.4-PRO</b></span>
            <span>•</span>
            <span>Actualización: <b>21 de Noviembre de 2026</b></span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Conforme a Leyes Nacionales e Internacionales
            </span>
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10 text-sm text-slate-300 leading-relaxed">
        
        {/* AVISO IMPORTANTE DE MERO INTERMEDIARIO TECNOLÓGICO */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-slate-900 border-2 border-amber-500/30 text-amber-200 space-y-3">
          <div className="flex items-center gap-2.5 font-black text-amber-400 text-base">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
            DECLARACIÓN EXPRESA: ROL DE MERO INTERMEDIARIO TECNOLÓGICO
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            <b>LibretaDigital Pro es exclusivamente una plataforma informática de software en la nube (SaaS).</b> El
            Proveedor <b>NO ES UNA ENTIDAD BANCARIA, FINANCIERA, COOPERATIVA DE CRÉDITO NI ENTIDAD DE INTERMEDIACIÓN FINANCIERA</b> sujeta
            a la Ley General de Bancos o fiscalización del Banco Central del Paraguay (BCP).
          </p>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            El Proveedor <b>NO presta dinero, NO financia compras, NO capta fondos o depósitos del público, NO cobra comisiones por crédito ni asume riesgo crediticio alguno.</b> Todas
            las ventas al fiado, plazos otorgados, intereses acordados o deudas pendientes son acuerdos privados, bilaterales y directos entre el <b>Comercio Adherido</b> y sus <b>Clientes Finales</b>.
          </p>
        </div>

        {/* 1. DEFINICIONES */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileText className="w-4 h-4 text-blue-400" /> 1. Definiciones Contractuales
          </h2>
          <ul className="space-y-2 text-slate-300 pl-4 list-disc">
            <li><b>Plataforma / Software:</b> El sistema web, móvil y backend conocido como <i>LibretaDigital Pro</i>.</li>
            <li><b>Comercio Adherido:</b> Dueño de almacén, despensa o negocio que contrata el software para la gestión de cuentas corrientes.</li>
            <li><b>Operador / Cajero:</b> Dependiente autorizado por el Comercio para operar la terminal POS bajo permisos restringidos.</li>
            <li><b>Cliente Final:</b> Persona registrada en el sistema que mantiene una libreta o cuenta corriente en dicho comercio.</li>
            <li><b>Libro Mayor Inmutable:</b> Registro criptográfico y secuencial de transacciones contables (compras, abonos, liquidaciones).</li>
            <li><b>PIN de Seguridad:</b> Clave confidencial de 4 dígitos utilizada para certificar cargos y autorizaciones en punto de venta o portal web.</li>
          </ul>
        </section>

        {/* 2. FUNCIONALIDADES DEL SISTEMA */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 2. Cobertura de Funcionalidades del Software
          </h2>
          <p>El Proveedor concede al Comercio acceso a las siguientes capacidades tecnológicas:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-blue-400">Terminal POS & Fiados</h3>
              <p className="text-xs text-slate-400">Asiento de compras a crédito, entregas a cuenta, pagos parciales y liquidación total en guaraníes u otras monedas.</p>
            </div>
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Libro Inmutable & Auditoría</h3>
              <p className="text-xs text-slate-400">Cálculo de balances, trazabilidad histórica, sellos de tiempo ISO y auditoría para evitar adulteraciones.</p>
            </div>
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">Doble Validación por PIN</h3>
              <p className="text-xs text-slate-400">Convalidación de operaciones mediante PIN de 4 dígitos ingresado por el cliente en mostrador o vía web móvil.</p>
            </div>
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-400">Portal del Cliente con QR</h3>
              <p className="text-xs text-slate-400">Acceso cifrado mediante token único para que el cliente consulte su extracto y detalle de compras en tiempo real.</p>
            </div>
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400">Impresión POS Térmica & A4</h3>
              <p className="text-xs text-slate-400">Emisión de tickets para impresoras térmicas de 58 mm, 80 mm y reportes en hoja A4 para comprobantes y pagarés.</p>
            </div>
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-green-400">Recordatorios vía WhatsApp</h3>
              <p className="text-xs text-slate-400">Generación de enlaces preformateados para que el Comercio envíe resúmenes de deuda y recordatorios a sus clientes.</p>
            </div>
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-purple-400">Referencia Crediticia / Informconf</h3>
              <p className="text-xs text-slate-400">Módulo informativo sustentado en la autorización expresa otorgada por el titular según la Ley N° 6534/20.</p>
            </div>
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-rose-400">Roles y Carga de Cuaderno</h3>
              <p className="text-xs text-slate-400">Permisos por operador (cajeros vs. dueño) y migración de saldos históricos anotados previamente en cuadernos físicos.</p>
            </div>
          </div>
        </section>

        {/* 3. CONDICIONES COMERCIALES Y SUSCRIPCIÓN */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Scale className="w-4 h-4 text-indigo-400" /> 3. Modelo Comercial, Instalación y Suscripciones
          </h2>
          <div className="space-y-2 text-slate-300">
            <p>
              <b>1. Costo por Servicios de Instalación y Carga:</b> Los trabajos técnicos de instalación, configuración de impresoras POS, capacitación operativa, y carga inicial o retroactiva de datos históricos de clientes y deudas tienen un costo estipulado por los servicios profesionales requeridos.
            </p>
            <p>
              <b>2. Primer Mes de Suscripción Bonificado:</b> El primer mes (30 días) de acceso al software y mantenimiento de la infraestructura en la nube se encuentra bonificado al 100%, sin cobro de tarifa de suscripción periódica.
            </p>
            <p>
              <b>3. Suscripción Recurrente Posterior:</b> Para mantener la continuidad operativa, sincronización multi-dispositivo y almacenamiento seguro en la nube, el Comercio abonará la tarifa periódica pactada según el plan contratado. La falta de pago faculta la suspensión temporal de la sincronización cloud previa notificación.
            </p>
          </div>
        </section>

        {/* 4. LIMITACIÓN DE RESPONSABILIDAD */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Lock className="w-4 h-4 text-rose-400" /> 4. Exoneración y Límite de Responsabilidad
          </h2>
          <div className="space-y-2 text-slate-300">
            <p>
              <b>• Riesgo de Insolvencia:</b> El Proveedor no garantiza el cobro efectivo de las deudas ni responde por morosidad o impago de los clientes del Comercio.
            </p>
            <p>
              <b>• Exactitud de los Datos:</b> El Comercio es el único responsable de la veracidad de los montos, descripciones, teléfonos y documentos cargados en el sistema.
            </p>
            <p>
              <b>• Uso de WhatsApp:</b> El Comercio es el emisor exclusivo de los mensajes de cobranza y se compromete a respetar los horarios legales, la intimidad y las leyes de defensa del consumidor, absteniéndose de conductas vejatorias.
            </p>
            <p>
              <b>• Disponibilidad (SLA):</b> El Proveedor implementa infraestructura con meta del 99.5% de disponibilidad, exonerándose de interrupciones por fallas de operadores locales de telecomunicaciones, hardware del comercio o fuerza mayor.
            </p>
          </div>
        </section>

        {/* 5. LEGISLACIÓN Y JURISDICCIÓN */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 5. Legislación Aplicable y Fuero Judicial
          </h2>
          <p>
            Estos términos se rigen íntegramente por las leyes de la <b>República del Paraguay</b> (Código Civil Paraguayo, Ley N° 4017/10 de Firma Digital y Mensajes de Datos, Ley N° 1334/98 de Defensa del Consumidor). Cualquier controversia será resuelta ante los <b>Juzgados y Tribunales de la ciudad de Asunción, República del Paraguay</b>.
          </p>
        </section>

        {/* ACCIONES INFERIORES */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href={privacyHref}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition text-center flex items-center justify-center gap-2"
          >
            Ver Política de Privacidad de Datos <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={backHref}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition text-center"
          >
            ← {backLabel}
          </Link>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <p>LibretaDigital Pro • FinTech POS & Fiado en Tiempo Real • Términos Oficiales de Servicio SaaS</p>
      </footer>
    </div>
  );
}

export default function TerminosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <TerminosContent />
    </Suspense>
  );
}
