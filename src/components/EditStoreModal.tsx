'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Tenant } from '@/types';
import { updateTenantProfile } from '@/lib/storage';
import { compressImageFile } from '@/lib/imageUtils';
import { sanitizeText } from '@/lib/validation';
import { CustomSelect } from '@/components/ui/CustomSelectModal';
import {
  Store,
  Camera,
  ImagePlus,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Loader2,
  Phone,
  MapPin,
  FileText,
  User,
  Mail,
  Clock,
  Globe2,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  tenant: Tenant;
  onClose: () => void;
  onSuccess: (updated: Tenant) => void;
}

const CURRENCY_OPTIONS = [
  { value: 'PYG', symbol: '₲', label: 'Guaraní (₲ - Paraguay)', icon: '🇵🇾' },
  { value: 'BRL', symbol: 'R$', label: 'Real (R$ - Brasil)', icon: '🇧🇷' },
  { value: 'PEN', symbol: 'S/', label: 'Sol (S/ - Perú)', icon: '🇵🇪' },
  { value: 'USD', symbol: '$', label: 'Dólar ($ - USD)', icon: '🇺🇸' },
];

/**
 * Modal de edición integral del comercio: permite subir y comprimir Logo y Portada
 * con vista previa en vivo, además de actualizar todos los datos generales del local.
 */
export function EditStoreModal({ isOpen, tenant, onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);

  const [businessName, setBusinessName] = useState(tenant.business_name || '');
  const [description, setDescription] = useState(tenant.description || '');
  const [taxId, setTaxId] = useState(tenant.tax_id || '');
  const [phone, setPhone] = useState(tenant.phone || '');
  const [ownerName, setOwnerName] = useState(tenant.owner_name || '');
  const [email, setEmail] = useState(tenant.email || '');
  const [address, setAddress] = useState(tenant.address || '');
  const [city, setCity] = useState(tenant.city || '');
  const [openingHours, setOpeningHours] = useState(tenant.opening_hours || '');
  const [currencyCode, setCurrencyCode] = useState(tenant.currency_code || 'PYG');
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '');
  const [coverUrl, setCoverUrl] = useState(tenant.cover_url || '');

  const [processingLogo, setProcessingLogo] = useState(false);
  const [processingCover, setProcessingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setBusinessName(tenant.business_name || '');
    setDescription(tenant.description || '');
    setTaxId(tenant.tax_id || '');
    setPhone(tenant.phone || '');
    setOwnerName(tenant.owner_name || '');
    setEmail(tenant.email || '');
    setAddress(tenant.address || '');
    setCity(tenant.city || '');
    setOpeningHours(tenant.opening_hours || '');
    setCurrencyCode(tenant.currency_code || 'PYG');
    setLogoUrl(tenant.logo_url || '');
    setCoverUrl(tenant.cover_url || '');
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(false);
    setProcessingLogo(false);
    setProcessingCover(false);
  }, [isOpen, tenant]);

  const handleImageUpload = async (
    target: 'LOGO' | 'COVER',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg('');
    setSuccessMsg('');
    if (target === 'LOGO') setProcessingLogo(true);
    else setProcessingCover(true);

    try {
      const compressed = await compressImageFile(
        file,
        target === 'LOGO'
          ? { maxWidth: 360, maxHeight: 360, quality: 0.85, preferWebp: true }
          : { maxWidth: 1000, maxHeight: 400, quality: 0.82, preferWebp: true }
      );
      if (target === 'LOGO') setLogoUrl(compressed);
      else setCoverUrl(compressed);
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo procesar la imagen seleccionada.');
    } finally {
      if (target === 'LOGO') setProcessingLogo(false);
      else setProcessingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = sanitizeText(businessName, 120);
    if (!cleanName) {
      setErrorMsg('El nombre del local o almacén es obligatorio.');
      return;
    }

    const cleanEmail = sanitizeText(email, 120);
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Ingresá un correo de contacto válido o dejalo vacío.');
      return;
    }

    const selectedCurrency =
      CURRENCY_OPTIONS.find((c) => c.value === currencyCode) || CURRENCY_OPTIONS[0];

    setSaving(true);
    try {
      const nextTenant: Tenant = {
        ...tenant,
        business_name: cleanName,
        description: sanitizeText(description, 220) || undefined,
        tax_id: sanitizeText(taxId, 40) || undefined,
        phone: sanitizeText(phone, 40) || undefined,
        owner_name: sanitizeText(ownerName, 100) || undefined,
        email: cleanEmail || undefined,
        address: sanitizeText(address, 200) || undefined,
        city: sanitizeText(city, 80) || undefined,
        opening_hours: sanitizeText(openingHours, 120) || undefined,
        currency_code: selectedCurrency.value,
        currency_symbol: selectedCurrency.symbol,
        logo_url: logoUrl || undefined,
        cover_url: coverUrl || undefined,
        updated_at: new Date().toISOString(),
      };

      const res = await updateTenantProfile(nextTenant);
      if (!res.success) {
        setErrorMsg(res.error || 'No se pudieron guardar los cambios del local.');
        return;
      }

      setSuccessMsg(
        res.cloudSynced
          ? '¡Datos, logo y portada actualizados en la nube!'
          : '¡Cambios guardados en tu terminal!'
      );
      onSuccess(res.tenant);
      window.setTimeout(() => {
        onClose();
      }, 650);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocurrió un error al actualizar el local.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 font-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Identidad y Perfil del Comercio
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 truncate mt-0.5">
                Editar Local / Almacén
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
            aria-label="Cerrar edición de local"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">
          {/* Inputs ocultos de archivo */}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleImageUpload('COVER', e)}
          />
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleImageUpload('LOGO', e)}
          />

          {/* VISTA PREVIA EN VIVO DE PORTADA + LOGO */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 overflow-hidden shadow-xs">
            {/* Banner Portada */}
            <div className="relative h-32 sm:h-36 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 overflow-hidden">
              {coverUrl ? (
                <>
                  <img
                    src={coverUrl}
                    alt="Portada del local"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/20" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-indigo-200/40 pointer-events-none">
                  <div className="text-center">
                    <ImagePlus className="w-7 h-7 mx-auto mb-1 opacity-70" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Sin imagen de portada
                    </span>
                  </div>
                </div>
              )}

              {processingCover && (
                <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center gap-2 text-white text-xs font-bold z-20">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Optimizando portada...</span>
                </div>
              )}

              {/* Controles Portada */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={processingCover || saving}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/75 hover:bg-slate-900 text-white border border-white/20 backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{coverUrl ? 'Cambiar portada' : 'Subir portada'}</span>
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    disabled={processingCover || saving}
                    className="p-1.5 rounded-xl bg-rose-600/85 hover:bg-rose-600 text-white border border-white/20 backdrop-blur-md transition cursor-pointer disabled:opacity-50"
                    title="Quitar portada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Logo superpuesto + Datos en tiempo real */}
            <div className="px-4 pb-4 pt-0 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="flex items-end gap-3.5 -mt-10 relative z-10 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg bg-slate-900 overflow-hidden flex items-center justify-center">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo del local"
                        className="w-full h-full object-cover bg-white"
                      />
                    ) : (
                      <Store className="w-8 h-8 text-indigo-300" />
                    )}
                    {processingLogo && (
                      <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={processingLogo || saving}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white border-2 border-white shadow-md flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                    title={logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      disabled={processingLogo || saving}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white border-2 border-white shadow-md flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                      title="Quitar logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="pt-11 min-w-0">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    {businessName.trim() || 'Nombre de tu Local'}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {description.trim() ||
                      [city.trim(), address.trim()].filter(Boolean).join(' • ') ||
                      'Subí tu logo y portada para personalizar tu portal y recibos'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={processingLogo || saving}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{logoUrl ? 'Cambiar logo' : 'Subir logo'}</span>
                </button>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* DATOS GENERALES DEL LOCAL */}
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-indigo-600" /> Nombre del Local / Almacén *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ej: Almacén Don Mario"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Eslogan o Descripción Breve
                </label>
                <input
                  type="text"
                  maxLength={220}
                  placeholder="Ej: Despensa de barrio • Carnicería, frutas y bebidas"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" /> RUC / Documento Comercial
                </label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="Ej: 80012345-6"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" /> Teléfono / WhatsApp del Local
                </label>
                <input
                  type="tel"
                  maxLength={40}
                  placeholder="Ej: 595981123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> Propietario / Encargado
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Ej: Mario Gómez"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" /> Correo de Contacto
                </label>
                <input
                  type="email"
                  maxLength={120}
                  placeholder="Ej: contacto@tulocal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Dirección del Local
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Ej: Avda. Principal 1420 casi San Martín"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Ciudad / Barrio
                </label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Ej: Asunción • Villa Morra"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Horario de Atención
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="Ej: Lun a Sáb 07:00 - 21:00"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-indigo-600" /> Moneda de Operación
                </label>
                <CustomSelect
                  value={currencyCode}
                  onChange={(val) => setCurrencyCode(String(val))}
                  title="Moneda de Operación del Local"
                  options={CURRENCY_OPTIONS}
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || processingLogo || processingCover}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios del Local</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
