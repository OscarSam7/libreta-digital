'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  title?: string;
  searchable?: boolean;
  className?: string;
  buttonClassName?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  title = 'Seleccionar Opción',
  searchable = false,
  className = '',
  buttonClassName = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedOption = options.find((o) => String(o.value) === String(value));

  const filteredOptions = searchable && searchTerm.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options;

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* TRIGGER BUTTON (Sustituye al <select> nativo) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left shadow-xs ${
          buttonClassName || 'bg-white border border-slate-200 hover:border-indigo-500 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[9px] rounded-md shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* MODAL / SHEET FINTECH (Evita el popup beige de Android) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
              setSearchTerm('');
            }
          }}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-900">{title}</h3>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador opcional */}
            {searchable && (
              <div className="p-3 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar opción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Lista de Opciones */}
            <div className="overflow-y-auto p-2 divide-y divide-slate-50 space-y-1">
              {filteredOptions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);

                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-50/80 border border-indigo-200 text-indigo-950 shadow-xs'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {opt.icon && <span className="text-base shrink-0">{opt.icon}</span>}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">{opt.label}</span>
                            {opt.badge && (
                              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded-md shrink-0">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.sublabel && (
                            <p className="text-[11px] text-slate-400 truncate">{opt.sublabel}</p>
                          )}
                        </div>
                      </div>

                      {/* Checkmark FinTech */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
