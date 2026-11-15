import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  ChevronDown,
  Bell,
  Settings,
  User as UserIcon,
  LogOut,
  Sliders,
  RefreshCw,
  Cloud,
  HardDrive,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Vehicle, AuthUser } from '../types';
import { PersistenceMode } from '../lib/storageAdapter';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  vehicles: Vehicle[];
  activeVehicleId: string;
  onSelectVehicle: (id: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  user: AuthUser;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isSyncing?: boolean;
  onManualSync?: () => void;
  showVehicleSelector?: boolean;
  persistenceMode?: PersistenceMode;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  isMaintenanceMode?: boolean;
  onOpenAdminMaintenance?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  vehicles,
  activeVehicleId,
  onSelectVehicle,
  theme,
  onToggleTheme,
  user,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  isSyncing = false,
  onManualSync,
  showVehicleSelector = true,
  persistenceMode = 'cloud',
  isAdmin = false,
  onOpenAdmin,
  isMaintenanceMode = false,
  onOpenAdminMaintenance,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="sticky top-0 md:fixed md:top-0 md:left-0 md:right-0 z-40 w-full bg-white dark:bg-[#09090B] md:bg-white/95 md:dark:bg-neutral-900/95 backdrop-blur-none md:backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 md:border-slate-200 md:dark:border-neutral-800 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1 transition-colors print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand wordmark (Compact SVG + PitStop) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-emerald-500/10 ring-1 ring-slate-200 dark:ring-neutral-800 bg-neutral-950 flex items-center justify-center shrink-0">
            <img
              src="/icon-192x192.png"
              alt="Logo PitStop"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-neutral-100 whitespace-nowrap">
              PITSTOP
            </span>
            <svg
              width="18"
              height="12"
              viewBox="0 0 22 14"
              fill="none"
              aria-hidden="true"
              className="text-emerald-500 shrink-0"
            >
              <path
                d="M1 10H5L7.5 3L11.5 12L15 5.5L17 8.5H21"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Zone 2: Vehicle Switcher (Desktop always; Tablet >= 768px only on Painel; Mobile in <main>) */}
        <div
          className={`hidden ${
            showVehicleSelector ? 'md:flex' : 'lg:flex'
          } items-center gap-2 sm:gap-3 min-w-0 md:flex-initial justify-start`}
        >
          <div className="relative inline-block w-full max-w-[220px]">
            <select
              value={activeVehicleId}
              onChange={e => onSelectVehicle(e.target.value)}
              disabled={vehicles.length === 0}
              aria-label="Selecionar veículo ativo"
              className="w-full appearance-none pl-3 pr-8 min-h-[44px] text-sm font-semibold bg-slate-100 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-200 cursor-pointer focus:outline-none focus:border-amber-500 shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed truncate"
            >
              {vehicles.length > 0 ? (
                vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.plate})
                  </option>
                ))
              ) : (
                <option value="">Nenhum veículo</option>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Zone 3: Actions (Mobile < 768px: strictly Bell + User Avatar with gap-3) */}
        <div className="flex items-center gap-3 md:gap-1.5 shrink-0">
          {/* Discreet Persistence Status Badge (Desktop >= 1024px) */}
          <span
            title={
              persistenceMode === 'local'
                ? 'Armazenamento local ativo neste preview'
                : 'Conectado e sincronizado com o Supabase'
            }
            className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${
              persistenceMode === 'local'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
            }`}
          >
            {persistenceMode === 'local' ? (
              <>
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span>Modo Preview Local</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span>Nuvem Sincronizada</span>
              </>
            )}
          </span>
          {/* Cloud Sync Indicator & Manual Refresh (Desktop/Tablet >= 768px) */}
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              aria-label="Sincronizar Agora com a nuvem"
              title={isSyncing ? 'Sincronizando com a nuvem...' : 'Sincronizar Agora'}
              className="hidden md:flex min-w-[44px] min-h-[44px] px-3 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-xs font-semibold transition-all active:scale-95 disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline whitespace-nowrap">
                {isSyncing ? 'Sincronizando com a nuvem...' : 'Sincronizar'}
              </span>
            </button>
          )}

          {/* Theme Switcher Button (Desktop/Tablet >= 768px) */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Alternar tema claro e escuro"
            className="hidden md:flex min-w-[44px] min-h-[44px] items-center justify-center text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-all active:scale-95"
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Notification Bell with Badge */}
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Abrir central de alertas e notificações"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-all active:scale-95 relative"
            title="Alertas e Notificações"
          >
            <Bell className="w-5 h-5 md:w-4 md:h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-xs leading-none">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Settings Button (Desktop/Tablet >= 768px) */}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Configurações da aplicação"
            className="hidden md:flex min-w-[44px] min-h-[44px] items-center justify-center text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-all active:scale-95"
            title="Configurações & Preferências"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile Avatar with Dropdown */}
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              aria-label="Menu do Usuário"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 px-1 md:px-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800/80 transition-all active:scale-95 border border-transparent hover:border-slate-200 dark:hover:border-neutral-800"
            >
              <UserAvatar
                src={user.avatar}
                name={user.nome}
                className="w-8 h-8 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-700"
                textClassName="text-xs"
              />
              <span className="hidden md:inline text-xs font-semibold text-slate-800 dark:text-neutral-200 max-w-[100px] truncate">
                {user.nome.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800/80 mb-1 space-y-1">
                  <span className="block font-bold text-sm text-slate-900 dark:text-neutral-100 truncate">
                    {user.nome}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-neutral-400 truncate">
                    {user.email}
                  </span>
                  <div
                    className={`inline-flex items-center gap-1.5 pt-0.5 text-[11px] font-semibold ${
                      persistenceMode === 'local'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {persistenceMode === 'local' ? (
                      <>
                        <HardDrive className="w-3 h-3 shrink-0" />
                        <span>Modo Preview Local</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3 h-3 shrink-0" />
                        <span>Nuvem Sincronizada</span>
                      </>
                    )}
                  </div>
                </div>

                {onManualSync && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onManualSync();
                    }}
                    className="md:hidden w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors text-left font-semibold"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sincronizar Agora</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onToggleTheme();
                  }}
                  className="md:hidden w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-700" />
                  )}
                  <span>{theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-left"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Ver Meu Perfil</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Preferências & Backup</span>
                </button>

                {isAdmin && onOpenAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAdmin();
                    }}
                    className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors text-left font-semibold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin / Gestão SaaS</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-neutral-800/80" />

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors text-left font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discreet Maintenance Mode Active Top Indicator for Admins */}
      {isAdmin && isMaintenanceMode && (
        <div className="bg-amber-500/15 border-t border-amber-500/30 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Wrench className="w-3.5 h-3.5 shrink-0" />
          <span>Modo Manutenção Ativo (Acesso Admin)</span>
          {onOpenAdminMaintenance && (
            <button
              type="button"
              onClick={onOpenAdminMaintenance}
              className="underline underline-offset-2 font-bold hover:text-amber-900 dark:hover:text-amber-100 ml-1"
            >
              Gerenciar
            </button>
          )}
        </div>
      )}

      {/* Subtle Cloud Sync Status Bar on Mobile/Tablet */}
      {isSyncing && (
        <div className="lg:hidden bg-emerald-500/10 border-t border-emerald-500/20 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Sincronizando com a nuvem...</span>
        </div>
      )}
    </header>
  );
};
