'use client';

import React, { useState } from 'react';
import {
  Lock,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  X,
  KeyRound,
  CheckCircle2,
  Delete,
  Store,
  Users,
  LogOut
} from 'lucide-react';
import { StaffMember, Tenant } from '@/types';
import { setCurrentOperator } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import { safeCompare } from '@/lib/security';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt } from '@/lib/rateLimit';
import { translateText } from '@/lib/i18n/translator';

interface Props {
  tenant: Tenant;
  staff: StaffMember[];
  currentOperator: StaffMember;
  requiredPermission?: keyof StaffMember['permissions'];
  permissionLabel?: string;
  onSuccess: (operator: StaffMember) => void;
  onClose: () => void;
  onOpenManagement?: () => void;
  onLogoutComercio?: () => void;
}

export function StaffSwitchModal({
  tenant,
  staff,
  currentOperator,
  requiredPermission,
  permissionLabel,
  onSuccess,
  onClose,
  onOpenManagement,
}: Props) {
  // Solo colaboradores activos pueden operar la terminal
  const activeStaff = staff.filter((s) => s.is_active);

  // Si se requiere un permiso específico (ej. autorizar nota de crédito o reporte),
  // preseleccionar un ADMIN o OWNER
  const initialSelected = requiredPermission
    ? activeStaff.find((s) => s.role === 'OWNER' || s.permissions[requiredPermission]) || activeStaff[0]
    : currentOperator;

  const [selectedStaff, setSelectedStaff] = useState<StaffMember>(initialSelected || activeStaff[0]);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 6) {
      setErrorMsg('');
      const newPin = pinInput + num;
      setPinInput(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg('');
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg('');
    setPinInput('');
  };

  const verifyPin = (pinToTest: string) => {
    const rateCheck = checkRateLimit(`staff_pin_${selectedStaff.id}`, 5, 3);
    if (!rateCheck.allowed) {
      setErrorMsg(`Demasiados intentos de PIN. Bloqueado temporalmente por ${rateCheck.retryAfterSeconds}s.`);
      setPinInput('');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      if (safeCompare(selectedStaff.pin.trim(), pinToTest.trim())) {
        recordSuccessfulAttempt(`staff_pin_${selectedStaff.id}`);
        // Verificar si cumple con el permiso requerido en caso de elevación de privilegios
        if (requiredPermission && !selectedStaff.permissions[requiredPermission]) {
          setErrorMsg(
            `El colaborador ${selectedStaff.full_name} no tiene permisos para: ${
              permissionLabel || 'esta acción'
            }.`
          );
          setPinInput('');
          setIsVerifying(false);
          return;
        }

        // Éxito: asignar operador actual
        setCurrentOperator(selectedStaff);
        onSuccess(selectedStaff);
        setIsVerifying(false);
      } else {
        recordFailedAttempt(`staff_pin_${selectedStaff.id}`, 5, 3);
        setErrorMsg('PIN de seguridad incorrecto. Intente nuevamente.');
        setPinInput('');
        setIsVerifying(false);
      }
    }, 250);
  };

  const getRoleBadge = (role: StaffMember['role']) => {
    switch (role) {
      case 'OWNER':
        return <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">Dueño</span>;
      case 'ADMIN':
        return <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">Administrador</span>;
      case 'CASHIER':
        return <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">Cajero</span>;
      case 'COLLECTOR':
        return <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">Cobrador</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {requiredPermission ? 'Autorización Requerida' : 'Iniciar Sesión / Turno POS'}
              </h2>
              <p className="text-xs text-slate-400">
                {requiredPermission
                  ? `Se requiere PIN de usuario con permiso: ${permissionLabel || 'Especial'}`
                  : `${tenant.business_name} • Selección de cajero`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Selector de Colaborador */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 block">
              1. Seleccione Colaborador
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeStaff.map((member) => {
                const isSelected = selectedStaff.id === member.id;
                const meetsRequirement = !requiredPermission || member.permissions[requiredPermission];

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaff(member);
                      setPinInput('');
                      setErrorMsg('');
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    } ${!meetsRequirement && requiredPermission ? 'opacity-40' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {member.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{member.full_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ingreso de PIN de 4 dígitos */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              2. Ingrese PIN de {selectedStaff.full_name.split(' ')[0]}
            </span>

            {/* Display de PIN con círculos */}
            <div className="flex items-center gap-3 my-2">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      filled
                        ? 'bg-blue-500 scale-125 shadow-md shadow-blue-500/50'
                        : 'border-2 border-slate-700 bg-slate-800/50'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-semibold mt-2 text-center flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
              </p>
            )}

            {/* Teclado numérico táctil */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] mt-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  disabled={isVerifying}
                  className="h-12 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 active:scale-95 text-white text-lg font-bold transition flex items-center justify-center shadow-xs border border-slate-700/60 disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={isVerifying}
                className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold transition flex items-center justify-center border border-slate-800"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                disabled={isVerifying}
                className="h-12 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 active:scale-95 text-white text-lg font-bold transition flex items-center justify-center shadow-xs border border-slate-700/60 disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isVerifying}
                className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center justify-center border border-slate-800"
                title="Borrar dígito"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 text-center">
              (PIN demostración por defecto: Don Mario: <b>1234</b>, Cajeros: <b>1111</b> / <b>2222</b>)
            </p>
          </div>

          {/* Acceso a Configuración de Personal y Cerrar Sesión */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={async () => {
                if (confirm(translateText('¿Deseas cerrar sesión del comercio y salir a la pantalla de login?'))) {
                  const supabase = createClient();
                  if (supabase) {
                    try {
                      await supabase.auth.signOut();
                    } catch (e) {}
                  }
                  window.location.href = '/registro-comercio';
                }
              }}
              className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 transition py-1.5 px-2.5 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30"
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
            </button>

            {onOpenManagement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenManagement();
                }}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition py-1.5 px-2.5 rounded-xl hover:bg-blue-500/10"
              >
                <Users className="w-3.5 h-3.5" /> Gestionar Personal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffSwitchModal;
