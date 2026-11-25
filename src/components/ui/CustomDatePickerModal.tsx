'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/components/I18nProvider';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Sparkles
} from 'lucide-react';

interface CustomDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  title?: string;
  minDate?: string;
  maxDate?: string;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DAY_NAMES_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const DAY_NAMES_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CustomDatePickerModal({
  isOpen,
  onClose,
  value,
  onChange,
  title = 'Seleccionar Fecha',
  minDate,
  maxDate,
}: CustomDatePickerModalProps) {
  const { isPt, t } = useI18n();
  const MONTH_NAMES = isPt ? MONTH_NAMES_PT : MONTH_NAMES_ES;
  const DAY_NAMES = isPt ? DAY_NAMES_PT : DAY_NAMES_ES;
  // Parse initial date
  const parseDate = (dStr: string) => {
    if (!dStr) return new Date();
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  };

  const initialDate = parseDate(value);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(value || '');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelectedDate(value);
    }
  }, [value, isOpen]);

  if (!isOpen || !mounted) return null;

  // Calendar calculations
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const formatYMD = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handleSelectDay = (day: number) => {
    const formatted = formatYMD(viewYear, viewMonth, day);
    setSelectedDate(formatted);
  };

  const handleApply = () => {
    if (selectedDate) {
      onChange(selectedDate);
    }
    onClose();
  };

  // Quick Presets
  const applyPreset = (preset: 'today' | 'yesterday' | '7days' | '15days' | '30days' | 'monthStart') => {
    const now = new Date();
    let target = new Date();

    if (preset === 'today') {
      target = now;
    } else if (preset === 'yesterday') {
      target = new Date(now.getTime() - 86400000);
    } else if (preset === '7days') {
      target = new Date(now.getTime() - 7 * 86400000);
    } else if (preset === '15days') {
      target = new Date(now.getTime() - 15 * 86400000);
    } else if (preset === '30days') {
      target = new Date(now.getTime() - 30 * 86400000);
    } else if (preset === 'monthStart') {
      target = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const formatted = formatYMD(target.getFullYear(), target.getMonth(), target.getDate());
    setSelectedDate(formatted);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  // Formatted date header
  const getFormattedSelected = () => {
    if (!selectedDate) return t('Ninguna', 'Nenhuma');
    const d = parseDate(selectedDate);
    return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`;
  };

  const todayYMD = formatYMD(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col font-sans">
        {/* Cabecera FinTech */}
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center absolute top-4 right-4 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block mb-1">
            {title}
          </span>
          <div className="text-xl font-black text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="truncate">{getFormattedSelected()}</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Accesos Rápidos de Fecha */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg font-bold text-[11px] whitespace-nowrap transition border border-slate-200 shrink-0 cursor-pointer"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => applyPreset('7days')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg font-bold text-[11px] whitespace-nowrap transition border border-slate-200 shrink-0 cursor-pointer"
            >
              -7 días
            </button>
            <button
              type="button"
              onClick={() => applyPreset('15days')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg font-bold text-[11px] whitespace-nowrap transition border border-slate-200 shrink-0 cursor-pointer"
            >
              -15 días
            </button>
            <button
              type="button"
              onClick={() => applyPreset('30days')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg font-bold text-[11px] whitespace-nowrap transition border border-slate-200 shrink-0 cursor-pointer"
            >
              -30 días
            </button>
            <button
              type="button"
              onClick={() => applyPreset('monthStart')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg font-bold text-[11px] whitespace-nowrap transition border border-slate-200 shrink-0 cursor-pointer"
            >
              1° de Mes
            </button>
          </div>

          {/* Selector de Mes y Año con Flechas */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-sm font-black text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Rejilla de Días de la Semana */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-[10px] font-black uppercase text-slate-400 py-1">
                {d}
              </div>
            ))}

            {/* Días del mes anterior (vacíos o deshabilitados) */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`prev-${i}`}
                className="h-9 flex items-center justify-center text-xs font-medium text-slate-300"
              >
                {daysInPrevMonth - firstDayOfMonth + i + 1}
              </div>
            ))}

            {/* Días del mes actual */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ymd = formatYMD(viewYear, viewMonth, day);
              const isSelected = selectedDate === ymd;
              const isToday = todayYMD === ymd;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-9 rounded-xl flex items-center justify-center text-xs font-bold transition cursor-pointer relative ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-400 hover:bg-indigo-100'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  {day}
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-indigo-600 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar Fecha</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// COMPONENTE TRIGGER: Reemplazo drop-in de <input type="date">
export function CustomDateInput({
  value,
  onChange,
  label,
  className = '',
  maxDate,
  minDate,
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  className?: string;
  maxDate?: string;
  minDate?: string;
}) {
  const { isPt, t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);

  // Formato visual legible (ej. 21/10/2026)
  const formatDisplay = (ymd: string) => {
    if (!ymd) return t('Elegir fecha', 'Escolher data');
    const parts = ymd.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return ymd;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`flex items-center justify-between gap-2 p-2 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 shadow-xs transition cursor-pointer text-left ${className}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">{formatDisplay(value)}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-normal">▼</span>
      </button>

      <CustomDatePickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        value={value}
        onChange={onChange}
        title={label ? `${isPt ? 'Selecionar' : 'Seleccionar'} ${t(label)}` : t('Seleccionar Fecha', 'Selecionar Data')}
        maxDate={maxDate}
        minDate={minDate}
      />
    </>
  );
}
