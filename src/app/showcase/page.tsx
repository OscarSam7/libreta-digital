'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Store,
  Layers,
  ArrowRight,
  ExternalLink,
  Zap,
  Lock,
  ChevronRight
} from 'lucide-react';

export default function ShowcasePage() {
  const [selectedOption, setSelectedOption] = useState<number>(1);
  const [previewBg, setPreviewBg] = useState<'dark' | 'navy' | 'light'>('dark');

  const options = [
    {
      id: 1,
      title: 'La Libreta Infinita',
      subtitle: 'Flujo Continuo, Confianza & Digitalización',
      tagline: '"El crédito de confianza del almacén, ahora sin límites de papel"',
      concept:
        'Fusión geométrica entre las hojas abiertas del cuaderno tradicional y el símbolo del infinito (∞), entrelazado con una tilde contable y terminales de chip digital. Transmite modernidad, continuidad de caja y el lazo inquebrantable entre el almacenero y sus vecinos.',
      colors: [
        { name: 'FinTech Blue', hex: '#2563EB', bg: 'bg-blue-600' },
        { name: 'Electric Indigo', hex: '#4F46E5', bg: 'bg-indigo-600' },
        { name: 'Growth Emerald', hex: '#10B981', bg: 'bg-emerald-500' },
        { name: 'Cyber Navy', hex: '#0F172A', bg: 'bg-slate-900' },
      ],
      iconGradient: 'from-blue-600 via-indigo-600 to-emerald-500',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      borderColor: 'border-blue-500',
      accentText: 'text-blue-400',
      renderSvg: (
        <svg className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-xl" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="inf-g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <rect x="12" y="16" width="76" height="68" rx="14" fill="#0F172A" stroke="url(#inf-g1)" strokeWidth="4.5" />
          <circle cx="22" cy="30" r="2.5" fill="#60A5FA" />
          <circle cx="22" cy="42" r="2.5" fill="#60A5FA" />
          <circle cx="22" cy="54" r="2.5" fill="#60A5FA" />
          <circle cx="22" cy="66" r="2.5" fill="#60A5FA" />
          <path
            d="M42 50 C42 42, 32 42, 32 50 C32 58, 42 58, 50 50 C58 42, 68 42, 68 50 C68 58, 58 58, 50 50 Z"
            fill="none"
            stroke="url(#inf-g1)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M48 51 L56 60 L75 38"
            fill="none"
            stroke="#34D399"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="75" cy="38" r="3.5" fill="#34D399" />
        </svg>
      ),
      iconSmall: (
        <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
          <path
            d="M42 50 C42 42, 32 42, 32 50 C32 58, 42 58, 50 50 C58 42, 68 42, 68 50 C68 58, 58 58, 50 50 Z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M46 52 L56 62 L78 38"
            fill="none"
            stroke="#34D399"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 2,
      title: 'El Escudo del Almacén',
      subtitle: 'Seguridad Jurídica, Pagarés & Informconf',
      tagline: '"Seguridad jurídica y respaldo legal para cada guaraní fiado"',
      concept:
        'La silueta del toldo tradicional de almacén se eleva para conformar un escudo bancario impenetrable con un cerrojo de seguridad encriptado en el centro. Diseñado para proyectar máxima solidez jurídica, validez ante Informconf y protección del patrimonio.',
      colors: [
        { name: 'Legal Emerald', hex: '#059669', bg: 'bg-emerald-600' },
        { name: 'Mint Shield', hex: '#34D399', bg: 'bg-emerald-400' },
        { name: 'Gold Reserve', hex: '#F59E0B', bg: 'bg-amber-500' },
        { name: 'Vault Slate', hex: '#020617', bg: 'bg-slate-950' },
      ],
      iconGradient: 'from-emerald-700 via-teal-800 to-slate-900',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      borderColor: 'border-emerald-500',
      accentText: 'text-emerald-400',
      renderSvg: (
        <svg className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-xl" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="shield-g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <path
            d="M50 14 L82 26 C82 56 68 76 50 86 C32 76 18 56 18 26 Z"
            fill="#064E3B"
            stroke="url(#shield-g1)"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
          <path
            d="M26 34 Q38 42 50 34 Q62 42 74 34"
            fill="none"
            stroke="#34D399"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <rect x="42" y="48" width="16" height="14" rx="3" fill="#34D399" />
          <path
            d="M45 48 V42 Q45 37 50 37 Q55 37 55 42 V48"
            fill="none"
            stroke="#34D399"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="50" cy="54" r="1.5" fill="#064E3B" />
        </svg>
      ),
      iconSmall: (
        <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
          <path
            d="M50 14 L80 26 C80 54 66 74 50 84 C34 74 20 54 20 26 Z"
            fill="#047857"
            stroke="#34D399"
            strokeWidth="6"
          />
          <rect x="42" y="48" width="16" height="14" rx="3" fill="#FFFFFF" />
          <path d="M45 48 V42 Q45 37 50 37 Q55 37 55 42 V48" stroke="#FFFFFF" strokeWidth="4" />
        </svg>
      ),
    },
    {
      id: 3,
      title: 'El Pulso QR',
      subtitle: 'Neo-FinTech Disruptiva & Agilidad Smartphone',
      tagline: '"Cada compra fiada, un pulso instantáneo en el celular"',
      concept:
        'Las anotaciones manuales a lápiz se convierten en pistas de circuito digital que convergen en una matriz QR viva con un rayo de confirmación en tiempo real. Inspirado en marcas disruptivas como Nubank o MercadoPago: vibrante, dinámico y amigable para jóvenes y adultos.',
      colors: [
        { name: 'Neo Purple', hex: '#7C3AED', bg: 'bg-purple-600' },
        { name: 'Electric Cyan', hex: '#06B6D4', bg: 'bg-cyan-400' },
        { name: 'Flash Pink', hex: '#EC4899', bg: 'bg-pink-500' },
        { name: 'Midnight Dark', hex: '#030712', bg: 'bg-slate-950' },
      ],
      iconGradient: 'from-purple-600 via-indigo-600 to-cyan-500',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      borderColor: 'border-purple-500',
      accentText: 'text-purple-400',
      renderSvg: (
        <svg className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-xl" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="qr-g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <rect x="18" y="16" width="64" height="68" rx="16" fill="#18181B" stroke="url(#qr-g1)" strokeWidth="4.5" />
          <rect x="28" y="26" width="16" height="16" rx="4" fill="none" stroke="#A855F7" strokeWidth="3" />
          <rect x="32" y="30" width="8" height="8" rx="2" fill="#06B6D4" />
          <rect x="56" y="26" width="16" height="16" rx="4" fill="none" stroke="#A855F7" strokeWidth="3" />
          <rect x="60" y="30" width="8" height="8" rx="2" fill="#06B6D4" />
          <rect x="28" y="54" width="16" height="16" rx="4" fill="none" stroke="#A855F7" strokeWidth="3" />
          <rect x="32" y="58" width="8" height="8" rx="2" fill="#06B6D4" />
          <path d="M54 50 L64 50 L58 64 L72 64 L50 82 L54 68 L44 68 Z" fill="#38BDF8" />
        </svg>
      ),
      iconSmall: (
        <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
          <rect x="20" y="20" width="60" height="60" rx="14" fill="#2E1065" stroke="#A855F7" strokeWidth="5" />
          <path d="M54 36 L64 36 L58 50 L72 50 L48 72 L54 56 L42 56 Z" fill="#22D3EE" />
        </svg>
      ),
    },
    {
      id: 4,
      title: 'Monograma L + D',
      subtitle: 'Minimalismo Suizo, Sello & Apretón de Manos',
      tagline: '"La palabra de barrio convertida en firma digital"',
      concept:
        'Las iniciales L (Libreta) y D (Digital) entrelazadas tridimensionalmente para representar a la vez las tapas de un libro y el tradicional apretón de manos entre comerciantes y clientes. Máxima nitidez y facilidad para impresión en tickets térmicos de POS, sellos y pantallas pequeñas.',
      colors: [
        { name: 'Cyan Neon', hex: '#06B6D4', bg: 'bg-cyan-500' },
        { name: 'Royal Blue', hex: '#1D4ED8', bg: 'bg-blue-700' },
        { name: 'Paper White', hex: '#FFFFFF', bg: 'bg-white' },
        { name: 'Dark Carbon', hex: '#0F172A', bg: 'bg-slate-900' },
      ],
      iconGradient: 'from-cyan-600 to-blue-700',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      borderColor: 'border-cyan-500',
      accentText: 'text-cyan-400',
      renderSvg: (
        <svg className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-xl" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="ld-gl" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="ld-gd" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <path
            d="M26 20 V72 Q26 78 32 78 H58"
            fill="none"
            stroke="url(#ld-gl)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M44 24 H56 Q76 24 76 48 Q76 72 56 72 H44"
            fill="none"
            stroke="url(#ld-gd)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="56" cy="48" r="4" fill="#38BDF8" />
        </svg>
      ),
      iconSmall: (
        <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
          <path d="M26 22 V74 H54" stroke="#38BDF8" strokeWidth="9" strokeLinecap="round" />
          <path d="M44 26 H56 Q74 26 74 48 Q74 70 56 70 H44" stroke="#10B981" strokeWidth="9" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const current = options.find((o) => o.id === selectedOption) || options[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* HEADER */}
        <header className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest shadow-inner">
            <Sparkles className="w-3.5 h-3.5" /> Laboratorio de Identidad de Marca
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Showcase de Logotipos & Isotipos
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Diseños creados a medida para <strong className="text-white">LibretaDigital Pro</strong>, equilibrando la cercanía del comercio barrial con la potencia y seguridad de una FinTech bancaria.
          </p>
        </header>

        {/* SELECTOR DE PROPUESTAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className={`p-4 rounded-2xl bg-slate-900/80 border-2 text-left transition transform hover:-translate-y-1 shadow-lg ${
                selectedOption === opt.id
                  ? `${opt.borderColor} shadow-blue-500/10 scale-[1.02]`
                  : 'border-slate-800 opacity-70 hover:opacity-100'
              }`}
            >
              <span className={`text-[10px] font-black uppercase tracking-wider block ${opt.accentText}`}>
                Propuesta 0{opt.id}
              </span>
              <h3 className="font-bold text-sm text-white mt-1 leading-tight">{opt.title}</h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{opt.subtitle}</p>
            </button>
          ))}
        </div>

        {/* VISTA PRINCIPAL DEL LOGO SELECCIONADO */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* ÁREA DE VISUALIZACIÓN */}
            <div
              className={`lg:col-span-7 flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl border shadow-inner min-h-[380px] transition-colors duration-500 ${
                previewBg === 'light'
                  ? 'bg-slate-100 border-slate-300 text-slate-900'
                  : previewBg === 'navy'
                  ? 'bg-blue-950/80 border-blue-800 text-white'
                  : 'bg-slate-950 border-slate-800 text-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-5 transform hover:scale-105 transition duration-300">
                {current.renderSvg}
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <span
                      className={`text-3xl sm:text-4xl font-black tracking-tight ${
                        previewBg === 'light' ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      Libreta
                      <span className={current.accentText}>Digital</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                      PRO
                    </span>
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold tracking-wider uppercase block mt-1 ${
                      previewBg === 'light' ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    FinTech POS & Fiado en Tiempo Real
                  </span>
                </div>
              </div>

              {/* CONTROLES DE FONDO */}
              <div className="flex items-center gap-2.5 mt-8 pt-4 border-t border-slate-800/40">
                <span className="text-[11px] text-slate-400 font-medium">Fondo de Prueba:</span>
                <button
                  onClick={() => setPreviewBg('dark')}
                  className={`w-6 h-6 rounded-full bg-slate-950 border ${
                    previewBg === 'dark' ? 'border-blue-400 scale-110' : 'border-slate-700'
                  }`}
                  title="Fondo Oscuro"
                />
                <button
                  onClick={() => setPreviewBg('navy')}
                  className={`w-6 h-6 rounded-full bg-blue-950 border ${
                    previewBg === 'navy' ? 'border-blue-400 scale-110' : 'border-slate-700'
                  }`}
                  title="Fondo Azul Profundo"
                />
                <button
                  onClick={() => setPreviewBg('light')}
                  className={`w-6 h-6 rounded-full bg-slate-100 border ${
                    previewBg === 'light' ? 'border-blue-500 scale-110' : 'border-slate-400'
                  }`}
                  title="Fondo Claro / Papel"
                />
              </div>
            </div>

            {/* EXPLICACIÓN CONCEPTUAL */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 ${current.badgeColor}`}>
                  Propuesta 0{current.id}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">{current.title}</h2>
                <p className={`text-xs sm:text-sm font-semibold mt-1 ${current.accentText}`}>
                  {current.tagline}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {current.concept}
              </p>

              {/* PALETA DE COLOR */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Paleta de Color Primaria
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {current.colors.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2"
                    >
                      <span className={`w-4 h-4 rounded-full ${c.bg} shadow-sm border border-white/20`} />
                      <div className="text-[10px]">
                        <span className="font-bold text-white block leading-none">{c.name}</span>
                        <span className="text-slate-500 font-mono text-[9px]">{c.hex}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ISOTIPO COMO APP ICON */}
              <div className="pt-3 border-t border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Ícono para App Móvil (PWA / Pantalla de Inicio)
                </span>
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${current.iconGradient} flex items-center justify-center p-2 shadow-xl border border-white/20 transform hover:rotate-6 transition`}
                  >
                    {current.iconSmall}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="font-bold text-white block">App Icon PWA</span>
                    <span className="text-[11px]">Alta visibilidad en iconos de Android y notificaciones.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SIMULADOR EN VIVO EN EL SISTEMA */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Simulador de Aplicación Real
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">¿Cómo se verá en el Sistema?</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* 1. NAVBAR MOCKUP */}
            <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Navbar del Sistema en Producción (POS / Almacén)
              </span>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${current.iconGradient} flex items-center justify-center p-1.5 shadow-md border border-white/20`}
                  >
                    {current.iconSmall}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black text-white tracking-tight">
                        Libreta<span className={current.accentText}>Digital</span>
                      </span>
                      <span className="px-1 py-0.2 rounded bg-blue-600 text-[9px] font-black text-white uppercase">
                        PRO
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold block -mt-0.5">
                      FinTech POS & Fiado
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right pr-2 border-r border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Comercio</span>
                    <span className="text-xs font-bold text-slate-200">Almacén Don Mario</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
                    POS
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CARD MOCKUP */}
            <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Tarjeta Digital en el Celular del Cliente
              </span>

              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${current.iconGradient} flex items-center justify-center p-1 border border-white/20`}
                    >
                      {current.iconSmall}
                    </div>
                    <span className="text-xs font-black text-white">
                      Libreta<span className={current.accentText}>Digital</span>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    INFORMCONF OK
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-end">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Titular de Cuenta</span>
                    <span className="text-xs font-bold text-white">Roberto Gómez (Don Roberto)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Saldo Fiado</span>
                    <span className="text-sm font-black text-white">₲ 145.000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COMPARACIÓN Y RECOMENDACIÓN */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Guía para tu Elección:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-blue-400 block">Opción 1: La Libreta Infinita</span>
              <p className="text-slate-300 text-[11px]">
                La más equilibrada: conserva la esencia del cuaderno de almacén y lo proyecta al futuro digital infinito.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400 block">Opción 2: El Escudo Almacén</span>
              <p className="text-slate-300 text-[11px]">
                Máxima autoridad y confianza legal; ideal para enfatizar la seguridad de cobro y el respaldo de Informconf.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-purple-400 block">Opción 3: El Pulso QR</span>
              <p className="text-slate-300 text-[11px]">
                Estilo Neo-Fintech disruptivo (Nubank / MercadoPago); moderna, ágil y visualmente muy llamativa.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-cyan-400 block">Opción 4: Monograma L + D</span>
              <p className="text-slate-300 text-[11px]">
                Minimalismo puro: inmejorable para tickets térmicos pequeños de 58mm/80mm y sellos del negocio.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-center">
            <a
              href="/"
              className="text-xs text-slate-400 hover:text-white font-medium inline-flex items-center gap-1 transition"
            >
              ← Volver al Panel Principal (POS)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
