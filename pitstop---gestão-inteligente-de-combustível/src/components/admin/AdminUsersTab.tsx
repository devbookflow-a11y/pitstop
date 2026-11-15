import React, { useMemo, useState } from 'react';
import {
  Search,
  ShieldCheck,
  Ban,
  CheckCircle2,
  KeyRound,
  CreditCard,
  Download,
  Copy,
  Check,
  X,
  UserCog,
  Trash2,
  AlertTriangle,
  Loader2,
  Eye,
  Car,
  Fuel,
  Wrench,
  Receipt,
  Gauge,
} from 'lucide-react';
import {
  AdminUserSummary,
  AuthUser,
  ExtraExpense,
  FuelLog,
  GasStation,
  MaintenanceItem,
  SubscriptionPlan,
  TireCalibrationLog,
  UserRole,
  UserStatus,
  Vehicle,
} from '../../types';
import {
  adapterDeleteUserAccount,
  adapterExportUserBackupJson,
  adapterResetUserPassword,
  adapterUpdateUserAdmin,
  PersistenceMode,
} from '../../lib/storageAdapter';
import { isMasterAdminEmail } from '../../lib/supabase';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

type OwnedRecordLike<T> = T & {
  ownerId?: string;
  userId?: string;
  user_id?: string;
};

interface AdminUsersTabProps {
  users: AdminUserSummary[];
  rawVehicles?: OwnedRecordLike<Vehicle>[];
  rawFuelLogs?: OwnedRecordLike<FuelLog>[];
  rawMaintenance?: OwnedRecordLike<MaintenanceItem>[];
  rawExpenses?: OwnedRecordLike<ExtraExpense>[];
  rawCalibrations?: OwnedRecordLike<TireCalibrationLog>[];
  rawStations?: OwnedRecordLike<GasStation>[];
  currentUser: AuthUser;
  persistenceMode: PersistenceMode;
  onRefresh: () => Promise<void>;
  onRequestConfirm: (opts: {
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  }) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onSchemaMissing?: () => void;
}

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Gratuito',
  pro_monthly: 'Pro Mensal',
  pro_annual: 'Pro Anual',
  lifetime: 'Vitalício',
};

const FUEL_TYPE_LABELS: Record<string, string> = {
  gasolina_comum: 'Gasolina Comum',
  gasolina_aditivada: 'Gasolina Aditivada',
  etanol: 'Etanol',
  diesel_s10: 'Diesel S10',
  gnv: 'GNV',
};

function formatDateBr(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getRecordOwnerId(record: { ownerId?: string; userId?: string; user_id?: string }): string {
  return String(record.ownerId || record.userId || record.user_id || '').trim();
}

function toSafeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  rawVehicles,
  rawFuelLogs,
  rawMaintenance,
  rawExpenses,
  rawCalibrations,
  rawStations,
  currentUser,
  persistenceMode,
  onRefresh,
  onRequestConfirm,
  onShowToast,
  onSchemaMissing,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [planFilter, setPlanFilter] = useState<'all' | SubscriptionPlan>('all');

  // Manage subscription & role modal
  const [editingSubUser, setEditingSubUser] = useState<AdminUserSummary | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('free');
  const [selectedExpiresAt, setSelectedExpiresAt] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [isSavingSub, setIsSavingSub] = useState(false);

  // Temp password generated modal (for local preview mode)
  const [resetResult, setResetResult] = useState<{
    email: string;
    tempPassword?: string;
    resetLink?: string;
    message: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<'pass' | 'link' | null>(null);

  // Critical account deletion modal
  const [deletingUser, setDeletingUser] = useState<AdminUserSummary | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // User records inspector panel/drawer
  const [inspectedUser, setInspectedUser] = useState<AdminUserSummary | null>(null);

  useBodyScrollLock(Boolean(editingSubUser || resetResult || deletingUser || inspectedUser));

  const userStatsById = useMemo(() => {
    const map = new Map<
      string,
      {
        vehicleCount: number;
        fuelLogCount: number;
        maintenanceCount: number;
        expenseCount: number;
        calibrationCount: number;
        stationCount: number;
        totalLiters: number;
        totalSpend: number;
      }
    >();

    const hasGlobalCollections =
      rawVehicles !== undefined ||
      rawFuelLogs !== undefined ||
      rawMaintenance !== undefined ||
      rawExpenses !== undefined ||
      rawCalibrations !== undefined ||
      rawStations !== undefined;

    users.forEach(u => {
      if (!hasGlobalCollections) {
        map.set(u.id, {
          vehicleCount: u.vehicleCount || 0,
          fuelLogCount: u.fuelLogCount || 0,
          maintenanceCount: u.maintenanceCount || 0,
          expenseCount: u.expenseCount || 0,
          calibrationCount: u.calibrationCount || 0,
          stationCount: u.stationCount || 0,
          totalLiters: toSafeNum(u.totalLiters),
          totalSpend: 0,
        });
        return;
      }

      const uVehicles = (rawVehicles || []).filter(v => getRecordOwnerId(v) === u.id);
      const uLogs = (rawFuelLogs || []).filter(l => getRecordOwnerId(l) === u.id);
      const uMaint = (rawMaintenance || []).filter(m => getRecordOwnerId(m) === u.id);
      const uExp = (rawExpenses || []).filter(e => getRecordOwnerId(e) === u.id);
      const uCal = (rawCalibrations || []).filter(c => getRecordOwnerId(c) === u.id);
      const uSta = (rawStations || []).filter(s => getRecordOwnerId(s) === u.id);

      const liters = uLogs.reduce((acc, l) => acc + toSafeNum(l.liters), 0);
      const spend =
        uLogs.reduce((acc, l) => acc + toSafeNum(l.totalCost), 0) +
        uMaint.reduce((acc, m) => acc + toSafeNum(m.cost), 0) +
        uExp.reduce((acc, e) => acc + toSafeNum(e.amount), 0);

      map.set(u.id, {
        vehicleCount: uVehicles.length,
        fuelLogCount: uLogs.length,
        maintenanceCount: uMaint.length,
        expenseCount: uExp.length,
        calibrationCount: uCal.length,
        stationCount: uSta.length,
        totalLiters: Number(liters.toFixed(1)),
        totalSpend: Number(spend.toFixed(2)),
      });
    });

    return map;
  }, [
    users,
    rawVehicles,
    rawFuelLogs,
    rawMaintenance,
    rawExpenses,
    rawCalibrations,
    rawStations,
  ]);

  const inspectedRecords = useMemo(() => {
    if (!inspectedUser) return null;
    const uid = inspectedUser.id;
    const vehicles = (rawVehicles || []).filter(v => getRecordOwnerId(v) === uid);
    const vehicleById = new Map(vehicles.map(v => [v.id, v]));
    const fuelLogs = (rawFuelLogs || [])
      .filter(l => getRecordOwnerId(l) === uid)
      .slice()
      .sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        if (db !== da) return db - da;
        return toSafeNum(b.odometer) - toSafeNum(a.odometer);
      });
    const maintenance = (rawMaintenance || []).filter(m => getRecordOwnerId(m) === uid);
    const expenses = (rawExpenses || []).filter(e => getRecordOwnerId(e) === uid);
    const calibrations = (rawCalibrations || []).filter(c => getRecordOwnerId(c) === uid);
    const stations = (rawStations || []).filter(s => getRecordOwnerId(s) === uid);

    return {
      vehicles,
      vehicleById,
      fuelLogs,
      maintenance,
      expenses,
      calibrations,
      stations,
      stats: userStatsById.get(uid) || {
        vehicleCount: vehicles.length,
        fuelLogCount: fuelLogs.length,
        maintenanceCount: maintenance.length,
        expenseCount: expenses.length,
        calibrationCount: calibrations.length,
        stationCount: stations.length,
        totalLiters: Number(
          fuelLogs.reduce((acc, l) => acc + toSafeNum(l.liters), 0).toFixed(1)
        ),
        totalSpend: 0,
      },
    };
  }, [
    inspectedUser,
    rawVehicles,
    rawFuelLogs,
    rawMaintenance,
    rawExpenses,
    rawCalibrations,
    rawStations,
    userStatsById,
  ]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter(u => {
      if (q && !u.nome.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (planFilter !== 'all' && u.plan !== planFilter) return false;
      return true;
    });
  }, [users, searchTerm, statusFilter, planFilter]);

  const handleToggleUserStatus = (user: AdminUserSummary) => {
    if (user.id === currentUser.id) {
      onShowToast('Você não pode bloquear sua própria conta ativa.', 'warning');
      return;
    }

    if (user.status === 'active' && isMasterAdminEmail(user.email)) {
      onShowToast('Não é possível bloquear o administrador principal.', 'warning');
      return;
    }

    const nextStatus: UserStatus = user.status === 'active' ? 'blocked' : 'active';
    const isBlocking = nextStatus === 'blocked';

    onRequestConfirm({
      title: isBlocking ? 'Bloquear acesso do usuário?' : 'Reativar acesso do usuário?',
      description: isBlocking ? (
        <span>
          O usuário <strong className="text-zinc-900 dark:text-white">{user.nome}</strong> ({user.email}) será impedido de entrar ou continuar usando o aplicativo imediatamente.
        </span>
      ) : (
        <span>
          O usuário <strong className="text-zinc-900 dark:text-white">{user.nome}</strong> ({user.email}) terá o acesso restaurado ao PitStop.
        </span>
      ),
      confirmLabel: isBlocking ? 'Bloquear Usuário' : 'Ativar Usuário',
      cancelLabel: 'Cancelar',
      variant: isBlocking ? 'danger' : 'info',
      onConfirm: async () => {
        try {
          const result = await adapterUpdateUserAdmin(
            user.id,
            { status: nextStatus },
            {
              currentUserId: currentUser.id,
              email: user.email,
              nome: user.nome,
            }
          );
          await onRefresh();
          if (result.schemaMissing) {
            onSchemaMissing?.();
            onShowToast(
              isBlocking
                ? `Acesso de ${user.email} bloqueado localmente. Execute o SQL Admin no Supabase para sincronizar na nuvem.`
                : `Acesso de ${user.email} reativado localmente. Execute o SQL Admin no Supabase para sincronizar na nuvem.`,
              'warning'
            );
          } else if (result.localOnlyUser) {
            onShowToast(
              isBlocking
                ? `Acesso de ${user.email} bloqueado localmente (conta de preview local).`
                : `Acesso de ${user.email} reativado localmente (conta de preview local).`,
              'info'
            );
          } else {
            onShowToast(
              isBlocking
                ? `Acesso de ${user.email} bloqueado com sucesso.`
                : `Acesso de ${user.email} reativado com sucesso.`,
              'success'
            );
          }
        } catch (err) {
          onShowToast(
            err instanceof Error ? err.message : 'Erro ao atualizar status do usuário.',
            'error'
          );
        }
      },
    });
  };

  const handleResetPassword = (user: AdminUserSummary) => {
    onRequestConfirm({
      title: 'Redefinir senha do usuário?',
      description:
        persistenceMode === 'cloud' ? (
          <span>
            Será disparado um e-mail oficial de redefinição de senha via Supabase Auth para{' '}
            <strong className="text-zinc-900 dark:text-white">{user.email}</strong>.
          </span>
        ) : (
          <span>
            No modo Preview Local, será gerada uma senha temporária imediata para{' '}
            <strong className="text-zinc-900 dark:text-white">{user.email}</strong> que você poderá copiar e repassar ao usuário.
          </span>
        ),
      confirmLabel: 'Confirmar Redefinição',
      cancelLabel: 'Cancelar',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const res = await adapterResetUserPassword({ id: user.id, email: user.email });
          if (res.mode === 'local' && res.tempPassword) {
            setResetResult(res);
          } else {
            onShowToast(res.message, 'success');
          }
        } catch (err) {
          onShowToast(
            err instanceof Error ? err.message : 'Erro ao redefinir senha.',
            'error'
          );
        }
      },
    });
  };

  const handleOpenSubModal = (user: AdminUserSummary) => {
    setEditingSubUser(user);
    setSelectedPlan(user.plan || 'free');
    setSelectedExpiresAt(user.planExpiresAt ? user.planExpiresAt.slice(0, 10) : '');
    setSelectedRole(user.role || 'user');
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubUser) return;

    if (editingSubUser.id === currentUser.id && selectedRole !== 'admin') {
      onShowToast('Você não pode remover seu próprio privilégio de administrador.', 'warning');
      return;
    }

    setIsSavingSub(true);
    try {
      const result = await adapterUpdateUserAdmin(
        editingSubUser.id,
        {
          plan: selectedPlan,
          planExpiresAt:
            selectedPlan === 'free' || selectedPlan === 'lifetime' || !selectedExpiresAt
              ? null
              : selectedExpiresAt,
          role: selectedRole,
        },
        {
          currentUserId: currentUser.id,
          email: editingSubUser.email,
          nome: editingSubUser.nome,
        }
      );
      await onRefresh();
      const targetNome = editingSubUser.nome;
      setEditingSubUser(null);
      if (result.schemaMissing) {
        onSchemaMissing?.();
        onShowToast(
          `Assinatura de ${targetNome} salva localmente. Execute o SQL Admin no Supabase para sincronizar na nuvem.`,
          'warning'
        );
      } else {
        onShowToast(`Assinatura de ${targetNome} atualizada.`, 'success');
      }
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'Erro ao salvar assinatura.',
        'error'
      );
    } finally {
      setIsSavingSub(false);
    }
  };

  const handleExportSingleUser = async (user: AdminUserSummary) => {
    try {
      const payload = await adapterExportUserBackupJson(user.id, currentUser);
      const safeEmail = (user.email || user.id).replace(/[^a-zA-Z0-9._@-]/g, '_');
      const today = new Date().toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pitstop-backup-usuario-${safeEmail}-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast(`Backup JSON de ${user.email} exportado.`, 'success');
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'Erro ao exportar dados do usuário.',
        'error'
      );
    }
  };

  const handleCopy = async (text: string, field: 'pass' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      onShowToast('Não foi possível copiar automaticamente.', 'warning');
    }
  };

  const canDeleteUser = (user: AdminUserSummary) =>
    user.id !== currentUser.id && user.role !== 'admin' && !isMasterAdminEmail(user.email);

  const handleOpenDeleteModal = (user: AdminUserSummary) => {
    if (!canDeleteUser(user)) {
      onShowToast('Contas de administrador não podem ser excluídas.', 'warning');
      return;
    }
    setDeletingUser(user);
    setDeleteConfirmText('');
  };

  const handleCloseDeleteModal = () => {
    if (isDeletingUser) return;
    setDeletingUser(null);
    setDeleteConfirmText('');
  };

  const isDeleteConfirmed = Boolean(
    deletingUser &&
      (deleteConfirmText.trim() === 'EXCLUIR' ||
        (deletingUser.email &&
          deleteConfirmText.trim().toLowerCase() === deletingUser.email.trim().toLowerCase()))
  );

  const handleConfirmDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingUser || !canDeleteUser(deletingUser) || !isDeleteConfirmed) return;

    setIsDeletingUser(true);
    try {
      await adapterDeleteUserAccount(
        {
          id: deletingUser.id,
          email: deletingUser.email,
          role: deletingUser.role,
        },
        currentUser
      );
      await onRefresh();
      setDeletingUser(null);
      setDeleteConfirmText('');
      onShowToast('Conta e todos os dados do usuário removidos com sucesso.', 'success');
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'Erro ao excluir conta do usuário.',
        'error'
      );
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar usuário por nome ou e-mail..."
            className="w-full min-h-[44px] pl-10 pr-4 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | UserStatus)}
            aria-label="Filtrar por status"
            className="min-h-[44px] px-3 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="blocked">Bloqueados</option>
          </select>

          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value as 'all' | SubscriptionPlan)}
            aria-label="Filtrar por plano"
            className="min-h-[44px] px-3 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todos os Planos</option>
            <option value="free">Gratuito</option>
            <option value="pro_monthly">Pro Mensal</option>
            <option value="pro_annual">Pro Anual</option>
            <option value="lifetime">Vitalício</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
        <span className="font-mono-numbers tabular-nums">
          Exibindo <strong className="text-zinc-900 dark:text-white">{filteredUsers.length}</strong> de{' '}
          {users.length} usuário(s)
        </span>
      </div>

      {/* Desktop Table (lg+) */}
      <div className="hidden lg:block rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#18181B]/70 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="py-3.5 px-4">Usuário</th>
                <th className="py-3.5 px-4">Cadastro / Último Acesso</th>
                <th className="py-3.5 px-4">Uso da Base</th>
                <th className="py-3.5 px-4">Assinatura</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhum usuário encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isSelf = u.id === currentUser.id;
                  const isMaster = isMasterAdminEmail(u.email);
                  const isProtectedFromBlock = isSelf || isMaster;
                  const isBlocked = u.status === 'blocked';
                  const uStats = userStatsById.get(u.id);
                  const vCount = uStats?.vehicleCount ?? u.vehicleCount;
                  const fCount = uStats?.fuelLogCount ?? u.fuelLogCount;
                  const litersCount = uStats?.totalLiters ?? u.totalLiters;
                  const mCount = uStats?.maintenanceCount ?? u.maintenanceCount;
                  const eCount = uStats?.expenseCount ?? u.expenseCount;
                  const cCount = uStats?.calibrationCount ?? u.calibrationCount;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-[#18181B]/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setInspectedUser(u)}
                          className="text-left group focus:outline-none"
                          title="Ver Registros do Usuário"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                              {u.nome}
                            </span>
                            {u.role === 'admin' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Admin
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[11px] font-medium text-zinc-400">(você)</span>
                            )}
                          </div>
                          <div className="text-zinc-500 dark:text-zinc-400 mt-0.5">{u.email}</div>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-mono-numbers tabular-nums text-zinc-600 dark:text-zinc-300">
                        <div>Cad: {formatDateBr(u.dataCriacao)}</div>
                        <div className="text-zinc-500 dark:text-zinc-400">
                          Acesso: {formatDateBr(u.lastLoginAt || u.dataCriacao)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono-numbers tabular-nums text-zinc-600 dark:text-zinc-300">
                        <div>
                          {vCount} veíc. · {fCount} abast.
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400">
                          {litersCount.toLocaleString('pt-BR')} L · {mCount} manut.
                          {(eCount > 0 || cCount > 0) && ` · ${eCount} desp. · ${cCount} cal.`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">
                          {PLAN_LABELS[u.plan || 'free']}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 font-mono-numbers tabular-nums">
                          {u.plan === 'lifetime'
                            ? 'Sem expiração'
                            : u.planExpiresAt
                            ? `Até ${formatDateBr(u.planExpiresAt)}`
                            : 'Sem validade'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold ${
                            isBlocked
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isBlocked ? (
                            <Ban className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {isBlocked ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectedUser(u)}
                            title="Ver Registros do Usuário"
                            className="px-2.5 min-h-[36px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/50 text-zinc-700 dark:text-zinc-200 font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Registros</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenSubModal(u)}
                            title="Gerenciar Assinatura e Perfil"
                            className="px-2.5 min-h-[36px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/50 text-zinc-700 dark:text-zinc-200 font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Plano</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetPassword(u)}
                            title="Redefinir Senha"
                            className="px-2.5 min-h-[36px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] hover:border-amber-500/50 text-zinc-700 dark:text-zinc-200 font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                            <span>Senha</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={isProtectedFromBlock && !isBlocked}
                            title={
                              isSelf
                                ? 'Não é possível bloquear sua própria conta'
                                : isMaster
                                ? 'Não é possível bloquear o administrador principal'
                                : isBlocked
                                ? 'Ativar Acesso'
                                : 'Bloquear Acesso'
                            }
                            className={`px-2.5 min-h-[36px] rounded-lg border font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              isBlocked
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                            }`}
                          >
                            {isBlocked ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Ativar</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                <span>Bloquear</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportSingleUser(u)}
                            aria-label={`Exportar JSON de ${u.email}`}
                            title="Exportar Backup JSON do Usuário"
                            className="p-2 min-h-[36px] min-w-[36px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] hover:border-zinc-400 text-zinc-600 dark:text-zinc-300 inline-flex items-center justify-center transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {canDeleteUser(u) && (
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(u)}
                              aria-label={`Excluir conta de ${u.email}`}
                              title="Excluir Conta"
                              className="px-2.5 min-h-[36px] rounded-lg border border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/10 font-semibold inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir Conta</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile & Tablet Cards (< lg) */}
      <div className="lg:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum usuário encontrado com os filtros aplicados.
          </div>
        ) : (
          filteredUsers.map(u => {
            const isSelf = u.id === currentUser.id;
            const isMaster = isMasterAdminEmail(u.email);
            const isProtectedFromBlock = isSelf || isMaster;
            const isBlocked = u.status === 'blocked';
            const uStats = userStatsById.get(u.id);
            const vCount = uStats?.vehicleCount ?? u.vehicleCount;
            const fCount = uStats?.fuelLogCount ?? u.fuelLogCount;
            const litersCount = uStats?.totalLiters ?? u.totalLiters;
            return (
              <div
                key={u.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setInspectedUser(u)}
                    className="min-w-0 text-left focus:outline-none"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                        {u.nome}
                      </span>
                      {u.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{u.email}</p>
                  </button>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold shrink-0 ${
                      isBlocked
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isBlocked ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {isBlocked ? 'Bloqueado' : 'Ativo'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300 font-mono-numbers tabular-nums pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Plano</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {PLAN_LABELS[u.plan || 'free']}
                    </span>
                    {u.planExpiresAt && (
                      <span className="block text-[11px] text-zinc-400">
                        Até {formatDateBr(u.planExpiresAt)}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Registros</span>
                    <span>
                      {vCount} veíc. · {fCount} abast. · {litersCount.toLocaleString('pt-BR')} L
                    </span>
                    <span className="block text-[11px] text-zinc-400">
                      Cad: {formatDateBr(u.dataCriacao)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInspectedUser(u)}
                    className="col-span-2 sm:col-span-4 min-h-[42px] px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Registros do Usuário</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSubModal(u)}
                    className="min-h-[44px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Assinatura</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetPassword(u)}
                    className="min-h-[44px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    <span>Redefinir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleUserStatus(u)}
                    disabled={isProtectedFromBlock && !isBlocked}
                    className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 ${
                      isBlocked
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isBlocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                    <span>{isBlocked ? 'Ativar' : 'Bloquear'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportSingleUser(u)}
                    className="min-h-[44px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>

                  {canDeleteUser(u) && (
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal(u)}
                      className="col-span-2 sm:col-span-4 min-h-[44px] px-3 rounded-xl border border-red-500/25 text-red-500 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Conta</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Subscription & Role Edit Modal */}
      {editingSubUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Gerenciar Assinatura & Perfil
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[260px]">
                    {editingSubUser.nome} ({editingSubUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubUser(null)}
                aria-label="Fechar modal"
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Plano de Assinatura
                </label>
                <select
                  value={selectedPlan}
                  onChange={e => setSelectedPlan(e.target.value as SubscriptionPlan)}
                  className="w-full min-h-[44px] px-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="free">Gratuito</option>
                  <option value="pro_monthly">Pro Mensal (R$ 19,90/mês)</option>
                  <option value="pro_annual">Pro Anual (R$ 14,90/mês)</option>
                  <option value="lifetime">Vitalício</option>
                </select>
              </div>

              {(selectedPlan === 'pro_monthly' || selectedPlan === 'pro_annual') && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Data de Validade (opcional)
                  </label>
                  <input
                    type="date"
                    value={selectedExpiresAt}
                    onChange={e => setSelectedExpiresAt(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Papel no Sistema (Role)
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as UserRole)}
                  disabled={editingSubUser.id === currentUser.id}
                  className="w-full min-h-[44px] px-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="user">Usuário Padrão</option>
                  <option value="admin">Administrador SaaS</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubUser(null)}
                  className="min-h-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSub}
                  className="min-h-[44px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-colors disabled:opacity-60"
                >
                  {isSavingSub ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Local Temp Password Output Modal */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Senha Temporária Gerada
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {resetResult.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetResult(null)}
                aria-label="Fechar"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetResult.tempPassword && (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                    Senha Temporária
                  </span>
                  <code className="font-mono-numbers text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {resetResult.tempPassword}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(resetResult.tempPassword!, 'pass')}
                  className="min-h-[38px] px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  {copiedField === 'pass' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'pass' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            )}

            {resetResult.resetLink && (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                    Link de Acesso
                  </span>
                  <span className="block text-xs text-zinc-700 dark:text-zinc-300 truncate">
                    {resetResult.resetLink}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(resetResult.resetLink!, 'link')}
                  className="min-h-[38px] px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                >
                  {copiedField === 'link' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'link' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setResetResult(null)}
                className="min-h-[44px] px-5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Critical Double-Confirmation Delete Account Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-modal-title"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#121215] border border-red-500/35 shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="delete-user-modal-title"
                    className="text-sm font-bold text-zinc-900 dark:text-white"
                  >
                    Excluir Conta Permanentemente
                  </h3>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Ação irreversível · Dupla confirmação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isDeletingUser}
                aria-label="Fechar modal de exclusão"
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteUser} className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="text-sm font-bold text-zinc-900 dark:text-white">
                  {deletingUser.nome}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 break-all">
                  {deletingUser.email}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-700 dark:text-red-200 leading-relaxed">
                Atenção: todos os dados vinculados a esta conta (<strong>veículos, abastecimentos, postos, manutenções, despesas extras e calibragens</strong>) serão removidos permanentemente e não poderão ser recuperados.
              </div>

              <button
                type="button"
                onClick={() => void handleExportSingleUser(deletingUser)}
                disabled={isDeletingUser}
                className="w-full min-h-[42px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/50 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Baixar Backup JSON antes de excluir</span>
              </button>

              <div>
                <label
                  htmlFor="confirm-delete-user-input"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Digite <span className="font-mono text-red-500">EXCLUIR</span> ou o e-mail do usuário para confirmar:
                </label>
                <input
                  id="confirm-delete-user-input"
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  autoComplete="off"
                  disabled={isDeletingUser}
                  className="w-full min-h-[44px] px-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  disabled={isDeletingUser}
                  className="min-h-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isDeleteConfirmed || isDeletingUser}
                  className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeletingUser ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmar Exclusão Definitiva</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Records Inspector Drawer ("Ver Registros do Usuário") */}
      {inspectedUser && inspectedRecords && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs"
          onClick={() => setInspectedUser(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspect-user-records-title"
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl h-full bg-white dark:bg-[#121215] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    id="inspect-user-records-title"
                    className="text-base font-bold text-zinc-900 dark:text-white truncate"
                  >
                    Ver Registros do Usuário
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      inspectedUser.status === 'blocked'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {inspectedUser.status === 'blocked' ? 'Bloqueado' : 'Ativo'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                  <strong className="text-zinc-800 dark:text-zinc-200">{inspectedUser.nome}</strong> ·{' '}
                  {inspectedUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedUser(null)}
                aria-label="Fechar painel de registros"
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Summary Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <Car className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Veículos</span>
                  </div>
                  <div className="mt-1 text-lg font-extrabold font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
                    {inspectedRecords.stats.vehicleCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <Fuel className="w-3.5 h-3.5 text-amber-500" />
                    <span>Abastecimentos</span>
                  </div>
                  <div className="mt-1 text-lg font-extrabold font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
                    {inspectedRecords.stats.fuelLogCount}
                  </div>
                  <div className="text-[11px] font-mono-numbers text-zinc-500 dark:text-zinc-400">
                    {inspectedRecords.stats.totalLiters.toLocaleString('pt-BR')} L
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Manut. / Desp. / Pneus</span>
                  </div>
                  <div className="mt-1 text-lg font-extrabold font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
                    {inspectedRecords.stats.maintenanceCount +
                      inspectedRecords.stats.expenseCount +
                      inspectedRecords.stats.calibrationCount}
                  </div>
                  <div className="text-[11px] font-mono-numbers text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5">
                      <Wrench className="w-3 h-3" /> {inspectedRecords.stats.maintenanceCount}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Receipt className="w-3 h-3" /> {inspectedRecords.stats.expenseCount}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Gauge className="w-3 h-3" /> {inspectedRecords.stats.calibrationCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicles List */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Veículos Cadastrados ({inspectedRecords.vehicles.length})</span>
                  </h4>
                </div>

                {inspectedRecords.vehicles.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                    Nenhum veículo cadastrado por este usuário.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {inspectedRecords.vehicles.map(v => (
                      <div
                        key={v.id}
                        className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                            {v.name}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {v.model || 'Modelo não informado'} · {v.year || '—'}
                          </div>
                          {v.plate && (
                            <div className="mt-1 inline-block text-[11px] font-mono-numbers px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {v.plate}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[11px] text-zinc-400">Hodômetro</div>
                          <div className="text-xs font-bold font-mono-numbers tabular-nums text-emerald-600 dark:text-emerald-400">
                            {toSafeNum(v.currentOdometer).toLocaleString('pt-BR')} km
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Latest Fuel Logs List */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      Últimos Abastecimentos ({inspectedRecords.fuelLogs.length})
                    </span>
                  </h4>
                  {inspectedRecords.fuelLogs.length > 25 && (
                    <span className="text-[11px] text-zinc-400">Exibindo os 25 mais recentes</span>
                  )}
                </div>

                {inspectedRecords.fuelLogs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                    Nenhum abastecimento registrado por este usuário.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inspectedRecords.fuelLogs.slice(0, 25).map(log => {
                      const veh = log.vehicleId ? inspectedRecords.vehicleById.get(log.vehicleId) : undefined;
                      const liters = toSafeNum(log.liters);
                      const cost = toSafeNum(log.totalCost);
                      const odo = toSafeNum(log.odometer);
                      return (
                        <div
                          key={log.id}
                          className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                {veh?.name || 'Veículo'}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                                {FUEL_TYPE_LABELS[log.fuelType] || log.fuelType || 'Combustível'}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
                              <span>{formatDateBr(log.date)}</span>
                              <span>·</span>
                              <span className="truncate">{log.stationName || 'Posto não informado'}</span>
                              {odo > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono-numbers tabular-nums">
                                    {odo.toLocaleString('pt-BR')} km
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0 font-mono-numbers tabular-nums">
                            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                              {cost.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {liters.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-zinc-50/70 dark:bg-[#18181B]/70">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Postos salvos: {inspectedRecords.stations.length}
              </span>
              <button
                type="button"
                onClick={() => setInspectedUser(null)}
                className="min-h-[40px] px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
