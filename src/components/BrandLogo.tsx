'use client';

import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon-only';
  theme?: 'dark' | 'light';
  showTagline?: boolean;
  className?: string;
}

export function BrandLogo({
  size = 'md',
  theme = 'dark',
  showTagline = false,
  className = '',
}: Props) {
  // Dimensiones del isotipo según el tamaño
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-16 h-16',
    'icon-only': 'w-full h-full',
  }[size];

  // Tamaños tipográficos
  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
    'icon-only': 'text-base',
  }[size];

  const badgeSizes = {
    sm: 'text-[9px] px-1 py-0.2',
    md: 'text-[10px] px-1.5 py-0.5',
    lg: 'text-xs px-2 py-0.5',
    xl: 'text-sm px-2.5 py-1',
    'icon-only': 'text-xs',
  }[size];

  // Isotipo Monograma L + D Oficial (Propuesta 4 Refinada sin neón)
  const renderIsotype = () => (
    <svg
      className={`${iconDimensions} shrink-0`}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 
        LETRA 'L' EN AZUL REAL CORPORATIVO SÓLIDO (#1D4ED8)
        Trazo vertical que desciende por la izquierda y curva en la base hacia la derecha
      */}
      <path
        d="M 26 20 V 72 Q 26 78 32 78 H 58"
        stroke="#1D4ED8"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 
        LETRA 'D' EN VERDE ESMERALDA NATURAL SÓLIDO (#16A34A)
        Trazo que nace en la parte superior central, curva hacia la derecha y cierra en la base
      */}
      <path
        d="M 44 24 H 56 Q 76 24 76 48 Q 76 72 56 72 H 44"
        stroke="#16A34A"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (size === 'icon-only') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{renderIsotype()}</div>;
  }

  const isLight = theme === 'light';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Contenedor del Isotipo con fondo suave mate */}
      <div
        className={`rounded-xl p-1 flex items-center justify-center shadow-xs border ${
          isLight
            ? 'bg-slate-50 border-slate-200'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        {renderIsotype()}
      </div>

      {/* Bloque Tipográfico Oficial */}
      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-black tracking-tight ${textSizes} ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            Libreta<span className="text-blue-600">Digital</span>
          </span>
          <span
            className={`font-black uppercase tracking-wider rounded bg-emerald-600 text-white shadow-xs ${badgeSizes}`}
          >
            PRO
          </span>
        </div>

        {showTagline && (
          <span
            className={`block text-[10px] uppercase font-bold tracking-wider mt-1 ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            FinTech POS & Fiado en Tiempo Real
          </span>
        )}
      </div>
    </div>
  );
}

export default BrandLogo;
