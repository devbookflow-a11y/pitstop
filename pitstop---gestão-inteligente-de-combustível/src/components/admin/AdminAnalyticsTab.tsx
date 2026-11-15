import React, { useMemo } from 'react';
import {
  Users,
  Activity,
  CreditCard,
  Database,
  TrendingUp,
  Layers,
  Car,
  Fuel,
  Wrench,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts';
import { AdminDashboardSnapshot } from '../../lib/storageAdapter';
import { SubscriptionPlan } from '../../types';

interface AdminAnalyticsTabProps {
  snapshot: AdminDashboardSnapshot;
  theme: 'dark' | 'light';
}

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Gratuito',
  pro_monthly: 'Pro Mensal',
  pro_annual: 'Pro Anual',
  lifetime: 'Vitalício',
};

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  free: '#71717a',
  pro_monthly: '#10b981',
  pro_annual: '#f59e0b',
  lifetime: '#38bdf8',
};

const PLAN_MRR_BRL: Record<SubscriptionPlan, number> = {
  free: 0,
  pro_monthly: 19.9,
  pro_annual: 14.9,
  lifetime: 0,
};

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({ snapshot, theme }) => {
  const isDark = theme === 'dark';

  const metrics = useMemo(() => {
    const now = Date.now();
    const ms7d = 7 * 24 * 60 * 60 * 1000;
    const ms30d = 30 * 24 * 60 * 60 * 1000;

    const totalUsers = snapshot.users.length;
    const activeUsers = snapshot.users.filter(u => u.status === 'active').length;
    const blockedUsers = snapshot.users.filter(u => u.status === 'blocked').length;

    const active7d = snapshot.users.filter(u => {
      const ref = Date.parse(u.lastLoginAt || u.dataCriacao || '');
      return !Number.isNaN(ref) && now - ref <= ms7d;
    }).length;

    const active30d = snapshot.users.filter(u => {
      const ref = Date.parse(u.lastLoginAt || u.dataCriacao || '');
      return !Number.isNaN(ref) && now - ref <= ms30d;
    }).length;

    const planCounts: Record<SubscriptionPlan, number> = {
      free: 0,
      pro_monthly: 0,
      pro_annual: 0,
      lifetime: 0,
    };

    let estimatedMrr = 0;
    snapshot.users.forEach(u => {
      const plan = u.plan || 'free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      if (u.status === 'active') {
        estimatedMrr += PLAN_MRR_BRL[plan] || 0;
      }
    });

    const paidUsers =
      planCounts.pro_monthly + planCounts.pro_annual + planCounts.lifetime;

    const totalVehicles = snapshot.rawVehicles.length;
    const totalFuelLogs = snapshot.rawFuelLogs.length;
    const totalMaintenance = snapshot.rawMaintenance.length;
    const totalExpenses = snapshot.rawExpenses.length;
    const totalCalibrations = snapshot.rawCalibrations.length;
    const totalStations = snapshot.rawStations.length;
    const totalLiters = snapshot.rawFuelLogs.reduce(
      (sum, l) => sum + (Number(l.liters) || 0),
      0
    );

    // Crescimento de novos usuários por mês (últimos 6 meses)
    const growthMap = new Map<string, number>();
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      growthMap.set(key, 0);
    }

    snapshot.users.forEach(u => {
      const created = new Date(u.dataCriacao || Date.now());
      if (Number.isNaN(created.getTime())) return;
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      if (growthMap.has(key)) {
        growthMap.set(key, (growthMap.get(key) || 0) + 1);
      }
    });

    const userGrowthChart = Array.from(growthMap.entries()).map(([ym, count]) => {
      const [y, m] = ym.split('-');
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', {
        month: 'short',
      });
      return {
        periodo: `${label.replace('.', '').toUpperCase()}/${y.slice(2)}`,
        cadastros: count,
      };
    });

    const planDistributionChart = (Object.keys(planCounts) as SubscriptionPlan[])
      .map(plan => ({
        key: plan,
        name: PLAN_LABELS[plan],
        value: planCounts[plan],
        color: PLAN_COLORS[plan],
      }))
      .filter(item => item.value > 0);

    const totalRecords =
      totalVehicles +
      totalFuelLogs +
      totalMaintenance +
      totalExpenses +
      totalCalibrations +
      totalStations;

    const moduleEngagementChart = [
      { modulo: 'Veículos', registros: totalVehicles },
      { modulo: 'Abastecimentos', registros: totalFuelLogs },
      { modulo: 'Manutenções', registros: totalMaintenance },
      { modulo: 'Despesas', registros: totalExpenses },
      { modulo: 'Calibragens', registros: totalCalibrations },
      { modulo: 'Postos', registros: totalStations },
    ];

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      active7d,
      active30d,
      planCounts,
      paidUsers,
      estimatedMrr,
      totalVehicles,
      totalFuelLogs,
      totalMaintenance,
      totalExpenses,
      totalCalibrations,
      totalStations,
      totalRecords,
      totalLiters,
      userGrowthChart,
      planDistributionChart,
      moduleEngagementChart,
    };
  }, [snapshot]);

  const axisColor = isDark ? '#a1a1aa' : '#52525b';
  const gridColor = isDark ? '#27272a' : '#e4e4e7';
  const tooltipStyle = {
    backgroundColor: isDark ? '#121215' : '#ffffff',
    borderColor: isDark ? '#27272a' : '#e4e4e7',
    borderRadius: '12px',
    color: isDark ? '#f4f4f5' : '#18181b',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Usuários Cadastrados
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
            {metrics.totalUsers}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-numbers tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {metrics.activeUsers} ativos
            </span>{' '}
            ·{' '}
            <span className="text-red-600 dark:text-red-400 font-semibold">
              {metrics.blockedUsers} bloqueados
            </span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Retenção & Ativos
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
            {metrics.active7d}{' '}
            <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">/ 7d</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-numbers tabular-nums">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {metrics.active30d} usuários
            </span>{' '}
            nos últimos 30 dias
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              MRR Estimado & Planos
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono-numbers tabular-nums text-emerald-600 dark:text-emerald-400">
            R$ {metrics.estimatedMrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-numbers tabular-nums">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {metrics.paidUsers} Pro/Vitalício
            </span>{' '}
            · {metrics.planCounts.free} Gratuito
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Volume na Plataforma
            </span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="text-3xl font-extrabold font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
              {metrics.totalRecords.toLocaleString('pt-BR')}{' '}
              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">reg.</span>
            </div>
            <span className="text-xs font-bold font-mono-numbers tabular-nums text-emerald-600 dark:text-emerald-400">
              {metrics.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono-numbers tabular-nums">
            <span className="inline-flex items-center gap-1">
              <Car className="w-3 h-3 text-amber-500" />
              {metrics.totalVehicles} veíc.
            </span>
            <span className="inline-flex items-center gap-1">
              <Fuel className="w-3 h-3 text-emerald-500" />
              {metrics.totalFuelLogs} abast.
            </span>
            <span className="inline-flex items-center gap-1">
              <Wrench className="w-3 h-3 text-zinc-400" />
              {metrics.totalMaintenance} manut.
            </span>
            <span>· {metrics.totalExpenses} desp.</span>
            <span>· {metrics.totalCalibrations} pneus</span>
            <span>· {metrics.totalStations} postos</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Growth Chart */}
        <section className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Crescimento de Novos Usuários
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Novas contas registradas nos últimos 6 meses
              </p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.userGrowthChart} margin={{ top: 14, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="periodo"
                  interval={0}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="cadastros"
                  name="Novos usuários"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Plan Distribution */}
        <section className="lg:col-span-3 p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Proporção de Planos
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Distribuição atual das assinaturas
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    metrics.planDistributionChart.length > 0
                      ? metrics.planDistributionChart
                      : [{ name: 'Gratuito', value: 1, color: '#71717a' }]
                  }
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={3}
                >
                  {(metrics.planDistributionChart.length > 0
                    ? metrics.planDistributionChart
                    : [{ name: 'Gratuito', value: 1, color: '#71717a' }]
                  ).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {(Object.keys(PLAN_LABELS) as SubscriptionPlan[]).map(plan => (
              <div key={plan} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PLAN_COLORS[plan] }}
                  />
                  {PLAN_LABELS[plan]}
                </span>
                <span className="font-mono-numbers tabular-nums font-bold text-zinc-900 dark:text-white">
                  {metrics.planCounts[plan]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Module Engagement */}
        <section className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Engajamento por Módulo
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Volume total de registros gravados na plataforma
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.moduleEngagementChart}
                layout="vertical"
                margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                  hide
                />
                <YAxis
                  type="category"
                  dataKey="modulo"
                  width={104}
                  interval={0}
                  tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                />
                <Bar
                  dataKey="registros"
                  name="Registros"
                  fill="#f59e0b"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="registros"
                    position="right"
                    fill={isDark ? '#e4e4e7' : '#27272a'}
                    fontSize={11}
                    fontWeight={700}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};
