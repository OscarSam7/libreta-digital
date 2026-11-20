'use client';

import React, { useState } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  KeyRound,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
  Phone,
  Check,
  AlertCircle,
  X,
  BadgeCheck,
  Building,
  Store,
  DollarSign,
  FileText
} from 'lucide-react';
import { StaffMember, StaffRole, StaffPermissions, Tenant } from '@/types';
import { saveStaff } from '@/lib/storage';
import { CustomSelect } from '@/components/ui/CustomSelectModal';
import { sanitizeText } from '@/lib/validation';

interface Props {
  tenant: Tenant;
  staff: StaffMember[];
  currentOperator: StaffMember;
  onClose: () => void;
  onUpdate: () => void;
}

const DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  OWNER: {
    can_register_sales: true,
    can_register_payments: true,
    can_edit_credit_limits: true,
    can_adjust_credit_notes: true,
    can_view_financial_reports: true,
    can_manage_staff: true,
  },
  ADMIN: {
    can_register_sales: true,
    can_register_payments: true,
    can_edit_credit_limits: true,
    can_adjust_credit_notes: true,
    can_view_financial_reports: true,
    can_manage_staff: false,
  },
  CASHIER: {
    can_register_sales: true,
    can_register_payments: true,
    can_edit_credit_limits: false,
    can_adjust_credit_notes: false,
    can_view_financial_reports: false,
    can_manage_staff: false,
  },
  COLLECTOR: {
    can_register_sales: false,
    can_register_payments: true,
    can_edit_credit_limits: false,
    can_adjust_credit_notes: false,
    can_view_financial_reports: false,
    can_manage_staff: false,
  },
};

export function StaffManagementModal({
  tenant,
  staff,
  currentOperator,
  onClose,
  onUpdate,
}: Props) {
  const [activeTab, setActiveTab] = useState<'LIST' | 'FORM'>('LIST');
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Campos del formulario
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<StaffRole>('CASHIER');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [permissions, setPermissions] = useState<StaffPermissions>(DEFAULT_PERMISSIONS.CASHIER);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isOwner = currentOperator.role === 'OWNER';

  const handleStartCreate = () => {
    setEditingStaff(null);
    setFullName('');
    setRole('CASHIER');
    setPhone('');
    setPin('1234');
    setPermissions(DEFAULT_PERMISSIONS.CASHIER);
    setErrorMsg('');
    setActiveTab('FORM');
  };

  const handleStartEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFullName(member.full_name);
    setRole(member.role);
    setPhone(member.phone || '');
    setPin(member.pin);
    setPermissions({ ...member.permissions });
    setErrorMsg('');
    setActiveTab('FORM');
  };

  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    // Asignar permisos por defecto de ese rol
    setPermissions({ ...DEFAULT_PERMISSIONS[newRole] });
  };

  const handleTogglePermission = (key: keyof StaffPermissions) => {
    setPermissions({
      ...permissions,
      [key]: !permissions[key],
    });
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Por favor ingresa el nombre del colaborador.');
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMsg('El PIN de acceso debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    let updatedStaff: StaffMember[];

    if (editingStaff) {
      updatedStaff = staff.map((s) =>
        s.id === editingStaff.id
          ? {
              ...s,
              full_name: fullName.trim(),
              role,
              phone: phone.trim(),
              pin,
              permissions,
              updated_at: new Date().toISOString(),
            }
          : s
      );
      setSuccessMsg('Colaborador y permisos actualizados correctamente.');
    } else {
      const newMember: StaffMember = {
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        full_name: sanitizeText(fullName, 100),
        role,
        phone: sanitizeText(phone, 30),
        pin: pin.trim(),
        is_active: true,
        permissions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updatedStaff = [newMember, ...staff];
      setSuccessMsg('¡Nuevo colaborador registrado con éxito!');
    }

    saveStaff(updatedStaff);
    onUpdate();
    setTimeout(() => {
      setActiveTab('LIST');
      setSuccessMsg('');
    }, 900);
  };

  const handleToggleActive = (member: StaffMember) => {
    if (member.id === currentOperator.id) {
      alert('No puedes desactivar tu propio usuario en sesión activa.');
      return;
    }
    const updatedStaff = staff.map((s) =>
      s.id === member.id ? { ...s, is_active: !s.is_active } : s
    );
    saveStaff(updatedStaff);
    onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 animate-in zoom-in-95">
        {/* CABECERA DEL MODAL */}
        <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  Gestión de Colaboradores & Permisos
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">
                  Control de Caja
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Otorga roles a cajeros y cobradores con trazabilidad por cada venta o cobro
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PESTAÑAS */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50 gap-4 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('LIST');
              setErrorMsg('');
            }}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'LIST'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" /> Equipo ({staff.length})
          </button>

          <button
            onClick={handleStartCreate}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'FORM'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />{' '}
            {editingStaff ? 'Editar Colaborador' : '+ Nuevo Colaborador'}
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'LIST' ? (
            /* LISTA DE COLABORADORES */
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500 font-medium">
                  Cada movimiento de fiado o cobranza quedará registrado con el nombre del cajero.
                </span>
                <button
                  onClick={handleStartCreate}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                {staff.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          member.role === 'OWNER'
                            ? 'bg-amber-100 text-amber-800'
                            : member.role === 'ADMIN'
                            ? 'bg-indigo-100 text-indigo-800'
                            : member.role === 'CASHIER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {member.full_name.charAt(0)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 leading-tight">
                            {member.full_name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              member.role === 'OWNER'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : member.role === 'ADMIN'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : member.role === 'CASHIER'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {member.role === 'OWNER'
                              ? 'Dueño'
                              : member.role === 'ADMIN'
                              ? 'Administrador'
                              : member.role === 'CASHIER'
                              ? 'Cajero'
                              : 'Cobrador'}
                          </span>

                          {!member.is_active && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase">
                              Inactivo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-mono">
                            <KeyRound className="w-3 h-3 text-slate-400" /> PIN: •••• ({member.pin})
                          </span>
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> +{member.phone}
                            </span>
                          )}
                        </div>

                        {/* Etiquetas de Permisos Activos */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {member.permissions.can_register_sales && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold">
                              ✓ Cargar Fiado
                            </span>
                          )}
                          {member.permissions.can_register_payments && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold">
                              ✓ Cobranzas
                            </span>
                          )}
                          {member.permissions.can_edit_credit_limits && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-semibold">
                              ✓ Cambiar Límites
                            </span>
                          )}
                          {member.permissions.can_view_financial_reports && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-semibold">
                              ✓ Ver Informes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => handleStartEdit(member)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                        title="Editar permisos o PIN"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>

                      {member.role !== 'OWNER' && (
                        <button
                          onClick={() => handleToggleActive(member)}
                          className={`p-2 rounded-xl text-xs font-semibold transition ${
                            member.is_active
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                          title={member.is_active ? 'Suspender acceso' : 'Habilitar acceso'}
                        >
                          {member.is_active ? 'Suspender' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* FORMULARIO DE CREAR / EDITAR COLABORADOR */
            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Nombre del Colaborador *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Rol en el Negocio
                  </label>
                  <CustomSelect
                    value={role}
                    onChange={(val) => handleRoleChange(val as StaffRole)}
                    title="Seleccionar Rol de Colaborador"
                    options={[
                      { value: 'CASHIER', label: 'Cajero', sublabel: 'Ventas y Cobranzas' },
                      { value: 'COLLECTOR', label: 'Cobrador', sublabel: 'Solo registrar pagos' },
                      { value: 'ADMIN', label: 'Administrador', sublabel: 'Límites y Reportes' },
                      ...(isOwner ? [{ value: 'OWNER', label: 'Dueño', sublabel: 'Acceso Total al Sistema' }] : []),
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Teléfono / WhatsApp (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: 0981 123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    PIN de Acceso a Terminal (4 dígitos) *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    required
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-center text-base font-mono tracking-widest text-blue-700 font-bold focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* MATRIZ DE PERMISOS EDITABLE */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" /> Permisos Específicos del Colaborador
                </span>
                <p className="text-[11px] text-slate-500">
                  Activa o desactiva qué acciones puede realizar este empleado en el mostrador:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      checked={permissions.can_register_sales}
                      onChange={() => handleTogglePermission('can_register_sales')}
                      className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Cargar Compras Fiadas</span>
                      <span className="text-[10px] text-slate-500">Aumentar deuda del cliente</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      checked={permissions.can_register_payments}
                      onChange={() => handleTogglePermission('can_register_payments')}
                      className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Cargar Cobranzas y Pagos</span>
                      <span className="text-[10px] text-slate-500">Registrar abonos recibidos</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      checked={permissions.can_edit_credit_limits}
                      onChange={() => handleTogglePermission('can_edit_credit_limits')}
                      className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Modificar Límites de Crédito</span>
                      <span className="text-[10px] text-slate-500">Subir o bajar tope de fiado</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      checked={permissions.can_adjust_credit_notes}
                      onChange={() => handleTogglePermission('can_adjust_credit_notes')}
                      className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Notas de Crédito y Anulaciones</span>
                      <span className="text-[10px] text-slate-500">Ajustar asientos erróneos</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      checked={permissions.can_view_financial_reports}
                      onChange={() => handleTogglePermission('can_view_financial_reports')}
                      className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Ver Reportes Financieros</span>
                      <span className="text-[10px] text-slate-500">Capital en la calle y mora</span>
                    </div>
                  </label>

                  {isOwner && (
                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition">
                      <input
                        type="checkbox"
                        checked={permissions.can_manage_staff}
                        onChange={() => handleTogglePermission('can_manage_staff')}
                        className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Gestionar Colaboradores</span>
                        <span className="text-[10px] text-slate-500">Crear o editar otros cajeros</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Guardar Colaborador
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
