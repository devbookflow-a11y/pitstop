import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  BarChart3,
  Users,
  Database,
  Megaphone,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import { AuthUser, SystemConfig } from '../types';
import {
  adapterGetAdminDashboardData,
  AdminDashboardSnapshot,
  PersistenceMode,
} from '../lib/storageAdapter';
import { SUPABASE_ADMIN_SCHEMA_SQL } from '../services/supabase';
import { AdminAnalyticsTab } from './admin/AdminAnalyticsTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminBackupsTab } from './admin/AdminBackupsTab';
import { AdminSystemTab } from './admin/AdminSystemTab';

export type AdminSubTab = 'analytics' | 'users' | 'backups' | 'system';

interface AdminDashboardViewProps {
  currentUser: AuthUser;
  theme: 'dark' | 'light';
  persistenceMode: PersistenceMode;
  systemConfig: SystemConfig;
  onSystemConfigUpdated: (nextConfig: SystemConfig) => void;
  onDataMutatedForCurrentUser: () => Promise<void>;
  onRequestConfirm: (opts: {
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  }) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  initialSubTab?: AdminSubTab;
  subTabTrigger?: number;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  theme,
  persistenceMode,
  systemConfig,
  onSystemConfigUpdated,
  onDataMutatedForCurrentUser,
  onRequestConfirm,
  onShowToast,
  initialSubTab = 'analytics',
  subTabTrigger = 0,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(initialSubTab);
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [schemaMissingBanner, setSchemaMissingBanner] = useState<boolean>(false);
  const [showAdminSql, setShowAdminSql] = useState<boolean>(false);
  const [copiedAdminSql, setCopiedAdminSql] = useState<boolean>(false);

  useEffect(() => {
    if (subTabTrigger > 0) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, subTabTrigger]);

  const loadAdminData = useCallback(
    async (showSpin = false) => {
      if (showSpin) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const snap = await adapterGetAdminDashboardData(currentUser);
        setSnapshot(snap);
        setSchemaMissingBanner(Boolean(snap.missingAdminTables));
      } catch (err) {
        onShowToast(
          err instanceof Error ? err.message : 'Erro ao carregar dados administrativos.',
          'error'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentUser, onShowToast]
  );

  useEffect(() => {
    void loadAdminData(false);
  }, [loadAdminData]);

  const subTabs: Array<{ id: AdminSubTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'analytics', label: 'Analytics & Visão Geral', icon: BarChart3 },
    { id: 'users', label: 'Usuários & Assinaturas', icon: Users },
    { id: 'backups', label: 'Backups & Restauração JSON', icon: Database },
    { id: 'system', label: 'Comunicação & Manutenção', icon: Megaphone },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Backoffice SaaS · Acesso Administrador</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Administração & Gestão da Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Métricas globais, controle de contas e assinaturas, backups JSON e comunicados do sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAdminData(true)}
          disabled={isRefreshing || isLoading}
          className="min-h-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/50 text-xs font-bold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-2 transition-colors self-start sm:self-auto shrink-0 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}</span>
        </button>
      </section>

      {/* Internal Sub-Tabs */}
      <div
        role="tablist"
        aria-label="Seções da Área do Administrador"
        className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
      >
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveSubTab(tab.id);
                void loadAdminData(true);
              }}
              className={`min-h-[44px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap border transition-all shrink-0 ${
                active
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Missing Supabase Admin Tables Banner (PGRST205 recovery) */}
      {persistenceMode === 'cloud' && schemaMissingBanner && (
        <section className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-amber-200">
                  Tabela <code className="font-mono">public.user_profiles</code> ainda não criada no Supabase
                </h2>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  As alterações de ativação/bloqueio e assinaturas estão sendo aplicadas localmente neste navegador. Para sincronizar na nuvem entre dispositivos, execute o script SQL Admin no <strong>SQL Editor</strong> do seu Supabase.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_ADMIN_SCHEMA_SQL);
                  setCopiedAdminSql(true);
                  onShowToast('SQL Admin copiado! Cole no SQL Editor do Supabase e clique em Run.', 'success');
                  setTimeout(() => setCopiedAdminSql(false), 2500);
                }}
                className="min-h-[40px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors"
              >
                {copiedAdminSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAdminSql ? 'SQL Copiado!' : 'Copiar SQL Admin'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAdminSql(prev => !prev)}
                className="min-h-[40px] px-3 rounded-xl border border-amber-500/40 bg-white/60 dark:bg-[#121215] text-zinc-800 dark:text-zinc-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showAdminSql ? 'Ocultar SQL' : 'Ver SQL'}</span>
              </button>
              <button
                type="button"
                onClick={() => void loadAdminData(true)}
                className="min-h-[40px] px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181B] text-zinc-800 dark:text-zinc-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Verificar Novamente</span>
              </button>
            </div>
          </div>

          {showAdminSql && (
            <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
              {SUPABASE_ADMIN_SCHEMA_SQL}
            </pre>
          )}
        </section>
      )}

      {/* Sub-Tab Content */}
      {isLoading || !snapshot ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
          <span className="text-xs font-semibold">Carregando console administrativo...</span>
        </div>
      ) : (
        <>
          {activeSubTab === 'analytics' && (
            <AdminAnalyticsTab snapshot={snapshot} theme={theme} />
          )}

          {activeSubTab === 'users' && (
            <AdminUsersTab
              users={snapshot.users}
              rawVehicles={snapshot.rawVehicles}
              rawFuelLogs={snapshot.rawFuelLogs}
              rawMaintenance={snapshot.rawMaintenance}
              rawExpenses={snapshot.rawExpenses}
              rawCalibrations={snapshot.rawCalibrations}
              rawStations={snapshot.rawStations}
              currentUser={currentUser}
              persistenceMode={persistenceMode}
              onRefresh={() => loadAdminData(true)}
              onRequestConfirm={onRequestConfirm}
              onShowToast={onShowToast}
              onSchemaMissing={() => setSchemaMissingBanner(true)}
            />
          )}

          {activeSubTab === 'backups' && (
            <AdminBackupsTab
              users={snapshot.users}
              currentUser={currentUser}
              onRefresh={() => loadAdminData(true)}
              onDataMutatedForCurrentUser={onDataMutatedForCurrentUser}
              onRequestConfirm={onRequestConfirm}
              onShowToast={onShowToast}
            />
          )}

          {activeSubTab === 'system' && (
            <AdminSystemTab
              systemConfig={systemConfig}
              currentUser={currentUser}
              onSystemConfigUpdated={onSystemConfigUpdated}
              onRequestConfirm={onRequestConfirm}
              onShowToast={onShowToast}
            />
          )}
        </>
      )}
    </div>
  );
};
