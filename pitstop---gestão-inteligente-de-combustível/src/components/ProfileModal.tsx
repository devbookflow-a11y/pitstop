import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Calendar,
  LogOut,
  Save,
  Check,
  Car,
  Fuel,
  Gauge,
  Camera,
  Trash2,
  Loader2,
  Sun,
  Moon,
  RefreshCw,
  Sliders,
  Compass,
  Cloud,
  HardDrive,
} from 'lucide-react';
import { AuthUser, Vehicle, FuelLog } from '../types';
import { saveLocalUserAvatar, formatFriendlyNetworkError } from '../lib/supabase';
import { adapterUpdateUser, PersistenceMode } from '../lib/storageAdapter';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { UserAvatar } from './UserAvatar';
import { TermsModal } from './TermsModal';
import { PrivacyModal } from './PrivacyModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  onUpdateUser: (updated: AuthUser) => void;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  isSyncing?: boolean;
  onManualSync?: () => void;
  onOpenSettings?: () => void;
  onRestartTour?: () => void;
  persistenceMode?: PersistenceMode;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=160&q=80',
];

async function compressImageToDataUrl(file: File, maxSize = 256, quality = 0.8): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          throw new Error('Dimensões da imagem inválidas.');
        }

        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Não foi possível processar a imagem neste navegador.');
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Erro ao redimensionar a imagem.'));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível carregar o arquivo selecionado.'));
    };

    img.src = objectUrl;
  });
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  vehicles,
  fuelLogs,
  onUpdateUser,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  isSyncing = false,
  onManualSync,
  onOpenSettings,
  onRestartTour,
  persistenceMode = 'cloud',
}) => {
  const [nome, setNome] = useState(user.nome);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setNome(user.nome);
      setAvatar(user.avatar || '');
      setErrorMessage(null);
      setIsEditing(false);
      setSaveSuccess(false);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, user.nome, user.avatar]);

  if (!isOpen) return null;

  // Aggregate stats
  const totalKmDriven = vehicles.reduce((acc, v) => acc + (v.currentOdometer - v.initialOdometer), 0);
  const totalRefuels = fuelLogs.length;

  const persistAvatarUpdate = async (nextAvatar: string) => {
    setErrorMessage(null);
    setIsUploadingPhoto(true);
    const previousAvatar = avatar;
    const isLargeOrInline = nextAvatar.startsWith('data:image/') || nextAvatar.length > 512;
    const safeRemoteAvatar = isLargeOrInline ? '' : nextAvatar;

    // Immediate preview in Profile & Header + local persistence for inline images
    setAvatar(nextAvatar);
    if (isLargeOrInline) {
      saveLocalUserAvatar(user.id, nextAvatar);
    } else {
      saveLocalUserAvatar(user.id, '');
    }

    const optimisticUser: AuthUser = {
      ...user,
      avatar: nextAvatar,
    };
    onUpdateUser(optimisticUser);

    try {
      await adapterUpdateUser(user.id, {
        nome: nome.trim() || user.nome,
        avatar_url: safeRemoteAvatar,
        avatar: safeRemoteAvatar,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      // Revert optimistic update on remote error
      setAvatar(previousAvatar);
      const prevIsLarge = previousAvatar.startsWith('data:image/') || previousAvatar.length > 512;
      saveLocalUserAvatar(user.id, prevIsLarge ? previousAvatar : '');
      onUpdateUser({
        ...user,
        avatar: previousAvatar,
      });
      setErrorMessage(formatFriendlyNetworkError(err, 'Erro ao atualizar foto de perfil.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMessage(null);
    setIsUploadingPhoto(true);

    try {
      const compressedBase64 = await compressImageToDataUrl(file, 256, 0.8);
      await persistAvatarUpdate(compressedBase64);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar a foto selecionada.';
      setErrorMessage(msg);
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    await persistAvatarUpdate('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNome = nome.trim();
    if (!cleanNome) return;

    setErrorMessage(null);
    setIsSaving(true);

    const cleanAvatar = avatar.trim();
    const isLargeOrInline = cleanAvatar.startsWith('data:image/') || cleanAvatar.length > 512;
    const safeRemoteAvatar = isLargeOrInline ? '' : cleanAvatar;

    try {
      await adapterUpdateUser(user.id, {
        nome: cleanNome,
        avatar_url: safeRemoteAvatar,
        avatar: safeRemoteAvatar,
      });

      if (isLargeOrInline) {
        saveLocalUserAvatar(user.id, cleanAvatar);
      } else {
        saveLocalUserAvatar(user.id, '');
      }

      const updated: AuthUser = {
        ...user,
        nome: cleanNome,
        avatar: cleanAvatar,
      };

      onUpdateUser(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      setErrorMessage(formatFriendlyNetworkError(err, 'Erro ao atualizar perfil.'));
    } finally {
      setIsSaving(false);
    }
  };

  const memberDateFormatted = new Date(user.dataCriacao).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const hasCustomOrPresetAvatar = Boolean(avatar && avatar.trim().length > 0);
  const currentYear = new Date().getFullYear();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[92dvh] text-slate-900 dark:text-neutral-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        {/* Hidden File Input for Computer, Gallery & Mobile Camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Selecionar foto de perfil"
        />

        {/* Cover Banner */}
        <div className="h-28 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 relative p-4 flex flex-col justify-between">
          <div className="w-10 h-1.5 bg-white/40 rounded-full mx-auto sm:hidden" />
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-md transition-all active:scale-95"
              aria-label="Fechar perfil"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Card Body */}
        <div className="px-5 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-0 relative">
          {/* Avatar placement & Quick Photo Actions */}
          <div className="flex flex-wrap items-end justify-between gap-3 -mt-14 mb-4">
            <div className="flex items-end gap-3">
              <div className="relative">
                <UserAvatar
                  src={avatar}
                  name={nome || user.nome}
                  className="w-24 h-24 rounded-2xl border-4 border-white dark:border-neutral-900 shadow-xl"
                  textClassName="text-2xl"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  aria-label="Alterar foto de perfil"
                  title="Alterar Foto"
                  className="absolute -bottom-1.5 -right-1.5 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-neutral-950 border-2 border-white dark:border-neutral-900 shadow-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-60"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex flex-col gap-1 pb-0.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="min-h-[44px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isUploadingPhoto ? 'Processando...' : 'Alterar Foto'}</span>
                </button>
                {hasCustomOrPresetAvatar && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="px-2 py-1 text-left text-xs font-medium text-slate-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 inline-flex items-center gap-1 transition-colors disabled:opacity-60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover foto</span>
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(prev => !prev)}
              className="px-3.5 min-h-[44px] rounded-xl border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-300 transition-all shadow-xs active:scale-95"
            >
              {isEditing ? 'Cancelar Edição' : 'Editar Perfil'}
            </button>
          </div>

          {errorMessage && !isEditing && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
              {errorMessage}
            </div>
          )}

          {/* User Info / Edit form */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full px-3.5 min-h-[44px] text-base sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-400 mb-1.5">
                  Avatares Rápidos ou URL
                </label>
                <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(p)}
                      className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 transition-all active:scale-95 ${
                        avatar === p
                          ? 'border-amber-500 scale-105 shadow-md'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={p} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={avatar.startsWith('data:image/') ? '' : avatar}
                  onChange={e => setAvatar(e.target.value)}
                  placeholder={
                    avatar.startsWith('data:image/')
                      ? 'Foto carregada do dispositivo (redimensionada 256px)'
                      : 'Ou insira a URL da sua foto'
                  }
                  className="w-full px-3.5 min-h-[44px] text-base sm:text-sm rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-4 min-h-[44px] rounded-xl text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-50 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950 shadow-md transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="profile-title" className="text-xl font-extrabold text-slate-900 dark:text-neutral-100">
                  {user.nome}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <img
                    src="/icon-192x192.png"
                    alt="PitStop"
                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                  />
                  Piloto PitStop
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
              <p className="text-xs text-slate-400 dark:text-neutral-500 flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                Membro desde {memberDateFormatted}
              </p>

              {saveSuccess && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  Perfil atualizado com sucesso!
                </div>
              )}
            </div>
          )}

          {/* Consolidated Telemetry Stats */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-3">
              Estatísticas Acumuladas
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800 text-center">
                <Car className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                <span className="block text-base sm:text-lg font-black font-mono-numbers text-slate-900 dark:text-neutral-100">
                  {vehicles.length}
                </span>
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  Veículo{vehicles.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800 text-center">
                <Gauge className="w-4 h-4 mx-auto text-sky-500 mb-1" />
                <span className="block text-base sm:text-lg font-black font-mono-numbers text-slate-900 dark:text-neutral-100">
                  {totalKmDriven > 0 ? `${totalKmDriven.toLocaleString('pt-BR')}` : '0'}
                </span>
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  Km Rodados
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800 text-center">
                <Fuel className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                <span className="block text-base sm:text-lg font-black font-mono-numbers text-slate-900 dark:text-neutral-100">
                  {totalRefuels}
                </span>
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  Abastecimentos
                </span>
              </div>
            </div>
          </div>

          {/* Quick Preferences & Cloud Sync (Accessible on Mobile) */}
          {(onToggleTheme || onManualSync || onOpenSettings || onRestartTour) && (
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-2.5">
                Preferências & Nuvem
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {onToggleTheme && (
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-700/70 text-xs font-semibold text-slate-800 dark:text-neutral-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Mudar para Modo Claro</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-slate-700 shrink-0" />
                        <span>Mudar para Modo Escuro</span>
                      </>
                    )}
                  </button>
                )}

                {onManualSync && (
                  <button
                    type="button"
                    onClick={onManualSync}
                    disabled={isSyncing}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                  >
                    <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                  </button>
                )}

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className={`${onRestartTour ? '' : 'sm:col-span-2 '}min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950/70 dark:hover:bg-neutral-800/80 border border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center justify-center gap-2 transition-all active:scale-95`}
                  >
                    <Sliders className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Abrir Configurações & Backup</span>
                  </button>
                )}

                {onRestartTour && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRestartTour();
                    }}
                    className={`${onOpenSettings ? '' : 'sm:col-span-2 '}min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-2 transition-all active:scale-95`}
                  >
                    <Compass className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Refazer Tour Guiado</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Logout Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
              {persistenceMode === 'local' ? (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    Modo Preview Local
                  </span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Nuvem Sincronizada
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>
          </div>

          {/* Discreet Profile Modal Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-neutral-400 print:hidden">
            <div className="flex items-center gap-2">
              <img
                src="/icon-192x192.png"
                alt="Logo PitStop"
                className="w-4 h-4 rounded object-cover ring-1 ring-slate-200 dark:ring-neutral-700 shrink-0"
              />
              <span>PitStop v1.5.0 • © {currentYear}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTermsOpen(true)}
                className="min-h-[44px] px-2 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                Termos de Uso
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(true)}
                className="min-h-[44px] px-2 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                Política de Privacidade
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Privacy Modals */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
};
