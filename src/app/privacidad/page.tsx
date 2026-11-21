'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, CheckCircle2, AlertTriangle, Eye, Server, RefreshCw, FileText, ExternalLink } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-600 selection:text-white">
      {/* HEADER NAVEGACIÓN */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <BrandLogo size="sm" theme="dark" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/terminos"
              className="text-xs text-slate-400 hover:text-white font-medium transition hidden sm:inline"
            >
              Términos de Servicio →
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-800 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a la App
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="py-12 px-4 border-b border-slate-900/60 bg-gradient-to-b from-emerald-950/20 via-slate-950 to-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <Lock className="w-3.5 h-3.5" /> Ley N° 6534/20 & Estándares Internacionales (GDPR / CCPA)
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Política de Privacidad y Tratamiento de Datos
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-3xl">
            Transparencia, secreto profesional y estrictos protocolos de ciberseguridad para la protección de la información
            personal y crediticia procesada en la plataforma <b>LibretaDigital Pro</b>.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-500">
            <span>Vigencia: <b>21 de Noviembre de 2026</b></span>
            <span>•</span>
            <span>Contacto: <b className="text-slate-300">privacidad@libretadigital.com</b></span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Compromiso de NO Venta de Datos
            </span>
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10 text-sm text-slate-300 leading-relaxed">
        
        {/* COMPROMISO TAXATIVO DE NO MONETIZACIÓN */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-slate-900 border-2 border-emerald-500/30 text-emerald-200 space-y-2.5">
          <div className="flex items-center gap-2.5 font-black text-emerald-400 text-base">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            COMPROMISO TOTAL: NUNCA VENDEMOS NI COMERCIALIZAMOS TUS DATOS
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            <b>LibretaDigital Pro NO VENDE, NO ALQUILA, NO CEDE NI MONETIZA bajo ningún concepto las bases de datos de clientes, teléfonos, historiales crediticios ni registros contables a agencias de publicidad, brokers de datos, entidades financieras ni terceros.</b>
          </p>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            La información pertenece de forma exclusiva al Comercio y a sus Clientes. Nuestro único rol es proveer la infraestructura tecnológica segura para su procesamiento contable.
          </p>
        </div>

        {/* 1. MARCO LEGAL APLICABLE */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileText className="w-4 h-4 text-emerald-400" /> 1. Marco Jurídico Nacional e Internacional
          </h2>
          <div className="space-y-2 text-slate-300">
            <p>Esta Política se estructura en estricto cumplimiento de:</p>
            <ul className="space-y-2 pl-4 list-disc text-xs sm:text-sm">
              <li>
                <b>Ley N° 6534/2020 de la República del Paraguay:</b> <i>"De Protección de Datos Personales Crediticios"</i>, garantizando los principios de veracidad, finalidad lícita, confidencialidad, exactitud y derecho de acceso del titular.
              </li>
              <li>
                <b>Ley N° 4017/2010 de la República del Paraguay:</b> <i>"De Validez Jurídica de la Firma Electrónica, Firma Digital, los Mensajes de Datos y el Expediente Electrónico"</i>, convalidando probatoriamente los consentimientos digitales, PINs y registros en log.
              </li>
              <li>
                <b>Constitución Nacional de la República del Paraguay:</b> Artículos 33 (Derecho a la Intimidad) y 135 (Garantía Constitucional del Hábeas Data).
              </li>
              <li>
                <b>Reglamento General de Protección de Datos (RGPD / GDPR - UE 2016/679):</b> Estándar global en materia de licitud, consentimiento explícito, minimización de datos, limitación de conservación y seguridad informática.
              </li>
              <li>
                <b>California Consumer Privacy Act (CCPA):</b> Principio internacional de transparencia y no comercialización de información personal.
              </li>
            </ul>
          </div>
        </section>

        {/* 2. ROLES LEGALES: RESPONSABLE VS ENCARGADO */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Server className="w-4 h-4 text-blue-400" /> 2. Roles en el Tratamiento de Datos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">Data Controller</span>
              <h3 className="font-bold text-white text-sm">El Comercio Adherido (Responsable)</h3>
              <p className="text-xs text-slate-400">
                Es quien recaba directamente los datos de sus clientes para habilitarles crédito o registrar sus compras, decidiendo los límites de fiado y plazos de pago. El comercio garantiza que posee autorización legítima para registrar a sus clientes.
              </p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">Data Processor</span>
              <h3 className="font-bold text-white text-sm">LibretaDigital Pro (Encargado)</h3>
              <p className="text-xs text-slate-400">
                Procesa y almacena los datos de forma automatizada por cuenta y orden del Comercio, únicamente para proveer el software, la sincronización en vivo, la generación de comprobantes y el libro mayor inmutable.
              </p>
            </div>
          </div>
        </section>

        {/* 3. DATOS RECOLECTADOS Y FINALIDAD */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Eye className="w-4 h-4 text-purple-400" /> 3. Datos Personales Recabados y Finalidad
          </h2>
          <div className="space-y-2 text-xs sm:text-sm">
            <p><b>Datos procesados de clientes:</b> Nombre y apellido, número de documento de identidad (C.I./DNI), teléfono WhatsApp, apodo o referencia de domicilio, detalle de compras a crédito, abonos, saldo deudor y evidencia digital de aceptación de términos (timestamp, IP, navegador).</p>
            <p><b>Finalidad exclusiva:</b></p>
            <ul className="pl-4 list-disc space-y-1 text-slate-300">
              <li>Llevar el control exacto y matemático de la libreta de cuenta corriente fiada.</li>
              <li>Generar recibos de pago digitales, extractos de cuenta y tickets de impresión térmica.</li>
              <li>Permitir que el cliente consulte su balance y compras en tiempo real mediante su enlace/QR personal.</li>
              <li>Prevenir dobles registros accidentales mediante algoritmos de normalización y deduplicación.</li>
              <li>Facilitar la convalidación segura de compras mediante PIN de 4 dígitos.</li>
            </ul>
          </div>
        </section>

        {/* 4. MEDIDAS DE SEGURIDAD TÉCNICA */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Lock className="w-4 h-4 text-amber-400" /> 4. Medidas de Ciberseguridad y Almacenamiento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <h4 className="font-bold text-white text-amber-400">Cifrado en Tránsito (TLS 1.3)</h4>
              <p className="text-slate-400">Todas las conexiones web operan bajo túneles SSL/TLS con cifrado de 256 bits, impidiendo la interceptación de datos.</p>
            </div>
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <h4 className="font-bold text-white text-emerald-400">Cifrado en Reposo (AES-256)</h4>
              <p className="text-slate-400">Bases de datos alojadas en centros de datos con certificaciones internacionales SOC 2 Type II e ISO 27001.</p>
            </div>
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <h4 className="font-bold text-white text-blue-400">Hashing de PINs y Claves</h4>
              <p className="text-slate-400">Las contraseñas y PINs de seguridad se almacenan procesados con algoritmos de hashing irreversible (bcrypt/PBKDF2).</p>
            </div>
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <h4 className="font-bold text-white text-indigo-400">Aislamiento Multi-Tenant</h4>
              <p className="text-slate-400">Separación estricta a nivel de arquitectura lógica: ningún comercio puede acceder a los clientes o saldos de otro comercio.</p>
            </div>
          </div>
        </section>

        {/* 5. DERECHOS ARCO */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <RefreshCw className="w-4 h-4 text-emerald-400" /> 5. Ejercicio de Derechos ARCO de los Titulares
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>Conforme a la Ley N° 6534/2020 y estándares internacionales, todo titular cuenta con los siguientes derechos:</p>
            <ul className="pl-4 list-disc space-y-1.5">
              <li><b>Acceso:</b> Consultar libremente su saldo, transacciones y datos guardados a través de su portal web con token QR.</li>
              <li><b>Rectificación:</b> Solicitar la corrección de datos incorrectos (nombre, cédula, teléfono) comunicándose con el comercio.</li>
              <li><b>Cancelación / Supresión:</b> Solicitar la baja de sus datos una vez canceladas y liquidadas todas las deudas vigentes, conforme a los plazos legales contables y tributarios.</li>
              <li><b>Oposición:</b> Negarse a recibir avisos automáticos de cobranza si así lo manifiesta fehacientemente al comercio.</li>
            </ul>
            <p className="text-xs text-slate-400 pt-2">
              Para requerimientos formales en materia de privacidad o protección de datos, puedes escribir a: <b className="text-emerald-400">privacidad@libretadigital.com</b>.
            </p>
          </div>
        </section>

        {/* ACCIONES INFERIORES */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/terminos"
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition text-center flex items-center justify-center gap-2"
          >
            Ver Términos y Condiciones de Servicio <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition text-center"
          >
            ← Volver a la Pantalla Principal
          </Link>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <p>LibretaDigital Pro • FinTech POS & Fiado en Tiempo Real • Política de Privacidad Conforme a Ley 6534/20 & GDPR</p>
      </footer>
    </div>
  );
}
