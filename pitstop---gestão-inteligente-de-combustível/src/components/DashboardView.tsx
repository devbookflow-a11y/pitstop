import React, { useState } from 'react';
import {
  FuelLog,
  Vehicle,
  MaintenanceItem,
  ExtraExpense,
  GlobalAnnouncement,
} from '../types';
import {
  calculateDashboardKPIs,
  checkRecentAnomaly,
} from '../utils/calculations';
import {
  Fuel,
  Gauge,
  DollarSign,
  Compass,
  AlertTriangle,
  TrendingUp,
  Wrench,
  ArrowRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  PieChart,
  Receipt,
  X,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import { FuelBreakdownModal } from './FuelBreakdownModal';
import { RefuelRadarCard } from './RefuelRadarCard';
import { TripSimulatorModal } from './TripSimulatorModal';
import { TireCalibrationLog } from '../types';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface DashboardViewProps {
  logs: FuelLog[];
  vehicle: Vehicle;
  maintenanceItems: MaintenanceItem[];
  extraExpenses?: ExtraExpense[];
  tireCalibrations?: TireCalibrationLog[];
  theme?: 'dark' | 'light';
  onOpenFuelModal: () => void;
  onNavigateToRoad: () => void;
  onNavigateToGarage: () => void;
  onUpdateVehicleOdometer?: (newOdometer: number) => void;
  onQuickCalibrateTires?: (notes?: string) => void;
  onNavigateToTireHistory?: () => void;
  announcement?: GlobalAnnouncement | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  logs,
  vehicle,
  maintenanceItems,
  extraExpenses = [],
  tireCalibrations = [],
  theme = 'dark',
  onOpenFuelModal,
  onNavigateToRoad,
  onNavigateToGarage,
  onUpdateVehicleOdometer,
  onQuickCalibrateTires,
  onNavigateToTireHistory,
  announcement = null,
}) => {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isTcoModalOpen, setIsTcoModalOpen] = useState(false);
  const [isTripSimulatorOpen, setIsTripSimulatorOpen] = useState(false);
  const [dismissedAnnouncementKey, setDismissedAnnouncementKey] = useState<string>(() => {
    try {
      return localStorage.getItem('pitstop_dismissed_announcement_key') || '';
    } catch {
      return '';
    }
  });
  useBodyScrollLock(isTcoModalOpen);
  const kpis = calculateDashboardKPIs(logs, vehicle);
  const anomaly = checkRecentAnomaly(logs);

  const announcementKey = announcement
    ? `${announcement.id}_${announcement.updatedAt}`
    : '';
  const showAnnouncement =
    Boolean(announcement?.active) &&
    Boolean(announcement?.title?.trim() || announcement?.message?.trim()) &&
    dismissedAnnouncementKey !== announcementKey;

  const handleDismissAnnouncement = () => {
    if (!announcementKey) return;
    setDismissedAnnouncementKey(announcementKey);
    try {
      localStorage.setItem('pitstop_dismissed_announcement_key', announcementKey);
    } catch {
      // ignore storage error
    }
  };

  // Financial Pillars of Ownership (TCO) for this vehicle
  const totalFuelSpentAllTime = logs.reduce((acc, l) => acc + l.totalCost, 0);
  const totalMaintenanceSpentAllTime = maintenanceItems
    .filter(m => m.vehicleId === vehicle.id)
    .reduce((acc, m) => acc + (m.cost || 0), 0);
  const totalExtraExpensesAllTime = extraExpenses
    .filter(e => e.vehicleId === vehicle.id)
    .reduce((acc, e) => acc + e.amount, 0);

  const totalSpentAllTimeTCO = totalFuelSpentAllTime + totalMaintenanceSpentAllTime + totalExtraExpensesAllTime;

  // Total distance driven based on logs
  const totalDistanceDriven = logs.reduce((acc, l) => acc + (l.distanceTraveled || 0), 0);

  // TCO cost per km breakdown
  const fuelCostPerKm = totalDistanceDriven > 0 ? totalFuelSpentAllTime / totalDistanceDriven : kpis.avgCostPerKm;
  const maintenanceCostPerKm = totalDistanceDriven > 0 ? totalMaintenanceSpentAllTime / totalDistanceDriven : 0;
  const extraExpensesCostPerKm = totalDistanceDriven > 0 ? totalExtraExpensesAllTime / totalDistanceDriven : 0;
  const totalTcoCostPerKm = totalDistanceDriven > 0
    ? totalSpentAllTimeTCO / totalDistanceDriven
    : fuelCostPerKm + maintenanceCostPerKm + extraExpensesCostPerKm;

  // Prepare chart data for consumption evolution (chronological order)
  const chartDataLogs = [...logs]
    .filter(l => l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0)
    .sort((a, b) => a.odometer - b.odometer)
    .map(l => ({
      date: new Date(l.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      odometer: l.odometer,
      kmL: l.calculatedKmPerLiter,
      station: l.stationName,
      fuel: l.fuelType.includes('etanol') ? 'Etanol' : 'Gasolina',
      costPerKm: l.calculatedCostPerKm,
    }));

  // Prepare monthly spending data
  const monthlySpendingMap: Record<string, number> = {};
  logs.forEach(l => {
    const ym = l.date.slice(0, 7); // YYYY-MM
    monthlySpendingMap[ym] = (monthlySpendingMap[ym] || 0) + l.totalCost;
  });

  const monthlyChartData = Object.entries(monthlySpendingMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([ym, total]) => {
      const [year, month] = ym.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('pt-BR', {
        month: 'short',
      });
      return {
        month: `${monthName.toUpperCase()}/${year.slice(2)}`,
        gasto: Number(total.toFixed(2)),
      };
    });

  // Calculate most urgent maintenance item
  const vehicleMaintenance = maintenanceItems
    .filter(m => m.vehicleId === vehicle.id)
    .map(m => {
      const kmUsed = Math.max(0, vehicle.currentOdometer - m.lastDoneOdometer);
      const remainingKm = m.intervalKm - kmUsed;
      const progressPct = Math.min(100, Math.round((kmUsed / m.intervalKm) * 100));
      return {
        ...m,
        kmUsed,
        remainingKm,
        progressPct,
      };
    })
    .sort((a, b) => a.remainingKm - b.remainingKm);

  const urgentMaintenance = vehicleMaintenance[0] || null;

  const isDark = theme === 'dark';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* GLOBAL SAAS ANNOUNCEMENT BANNER */}
      {showAnnouncement && announcement && (
        <div
          role="region"
          aria-label="Comunicado da plataforma"
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 transition-colors ${
            announcement.type === 'news'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
              : announcement.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-100'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                announcement.type === 'news'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : announcement.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
              }`}
            >
              {announcement.type === 'news' ? (
                <Sparkles className="w-4 h-4" />
              ) : announcement.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              {announcement.title && (
                <h3 className="text-sm font-bold leading-snug">{announcement.title}</h3>
              )}
              {announcement.message && (
                <p className="text-xs opacity-90 leading-relaxed">{announcement.message}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismissAnnouncement}
            aria-label="Dispensar comunicado"
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MOBILE COMPACT ODOMETER CARD (< 768px) */}
      <section
        aria-label="Hodômetro Atual"
        className="md:hidden p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-3 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 text-amber-500 flex items-center justify-center shrink-0">
            <Gauge className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">
            Hodômetro Atual
          </span>
        </div>
        <span className="text-lg font-bold font-mono-numbers tabular-nums text-zinc-900 dark:text-white shrink-0">
          {vehicle.currentOdometer.toLocaleString('pt-BR')} km
        </span>
      </section>

      {/* CLEAN MODERN TELEMETRY HEADER CARD (PAINEL AUTOMOTIVO - TABLET/DESKTOP >= 768px) */}
      <section
        aria-label="Painel Automotivo"
        className="hidden md:block p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/70 font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
                Painel Automotivo
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-800 dark:text-zinc-200">
                {vehicle.name}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 font-mono-numbers font-semibold text-amber-600 dark:text-amber-400">
                {vehicle.plate}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Telemetria de Consumo & Custos
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-full sm:w-auto sm:text-right bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 px-4 py-3 rounded-xl">
              <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 block font-medium">
                Hodômetro Atual
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
                {vehicle.currentOdometer.toLocaleString('pt-BR')} km
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ANOMALY ALERT CARD (Alerta Mecânico de Queda de Rendimento) */}
      {anomaly && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-50 dark:from-red-950/70 via-red-100/50 dark:via-red-900/30 to-white dark:to-neutral-900 border-2 border-red-400 dark:border-red-600/70 shadow-lg space-y-3 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <div className="p-2 bg-red-500/10 dark:bg-red-600/20 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-red-500 dark:text-red-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                  Alerta Mecânico: Queda Anormal de Consumo ({anomaly.dropPercentage}%)
                </h3>
                <p className="text-xs text-red-700 dark:text-red-300/80">
                  O último abastecimento rendeu <strong>{anomaly.recentConsumption} km/L</strong> versus a média histórica de <strong>{anomaly.historicalAverage} km/L</strong> no perfil {anomaly.drivingProfile}.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-red-200 dark:border-red-900/50 text-xs text-slate-700 dark:text-neutral-300">
            {anomaly.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 bg-white/80 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-800/40">
                <span className="text-red-500 font-bold shrink-0">#{i + 1}</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRIMARY KPIS STRIP (2 COLS ON MOBILE, 3 ON TABLET, 5 ON DESKTOP) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Média Geral */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group transition-colors">
          <div className="flex items-center justify-between gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs sm:text-sm font-semibold">Média Geral</span>
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg text-amber-500 dark:text-amber-400 shrink-0">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
              {kpis.avgKmL > 0 ? kpis.avgKmL : '--'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">km/L</span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center justify-between gap-1">
            <span>Tanque cheio</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono-numbers tabular-nums shrink-0">
              {kpis.bestKmL > 0 ? `Max: ${kpis.bestKmL}` : ''}
            </span>
          </div>
        </div>

        {/* KPI 2: Custo Real / km (TCO) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsTcoModalOpen(true)}
          onKeyDown={e => e.key === 'Enter' && setIsTcoModalOpen(true)}
          aria-label="Ver detalhamento do Custo Real por Km (TCO)"
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/50 dark:hover:border-purple-500/50 shadow-sm hover:shadow-md relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs sm:text-sm font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Custo / km
            </span>
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg text-purple-500 group-hover:scale-110 transition-transform shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
              {totalTcoCostPerKm > 0 ? `R$ ${totalTcoCostPerKm.toFixed(2)}` : '--'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">/km</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center justify-between gap-1">
            <span className="truncate">
              Comb.: R$ {fuelCostPerKm > 0 ? fuelCostPerKm.toFixed(2) : '--'}
            </span>
            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </div>

        {/* KPI 3: Gasto no Mês Atual */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group transition-colors">
          <div className="flex items-center justify-between gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs sm:text-sm font-semibold">Gasto no Mês</span>
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg text-amber-500 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight font-mono-numbers tabular-nums text-zinc-900 dark:text-white truncate">
              R$ {kpis.currentMonthSpent.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 capitalize truncate">
            {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
          </div>
        </div>

        {/* KPI 4: TOTAL GASTO EM COMBUSTÍVEL */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsBreakdownOpen(true)}
          onKeyDown={e => e.key === 'Enter' && setIsBreakdownOpen(true)}
          aria-label="Ver detalhamento por tipo de combustível"
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border-2 border-amber-500/40 hover:border-amber-500 dark:border-amber-500/30 dark:hover:border-amber-500 shadow-md hover:shadow-lg hover:shadow-amber-500/10 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
              Combustível
            </span>
            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg group-hover:scale-110 transition-transform shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight font-mono-numbers tabular-nums text-zinc-900 dark:text-white truncate">
              R$ {totalFuelSpentAllTime.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between gap-1">
            <span className="truncate">Ver detalhes</span>
            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </div>

        {/* KPI 5: Autonomia Estimada */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group transition-colors col-span-2 md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs sm:text-sm font-semibold">Autonomia Restante</span>
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg text-amber-500 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight font-mono-numbers tabular-nums text-amber-600 dark:text-amber-400">
              ~{kpis.estimatedRemainingKm}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">km</span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Estimativa residual do tanque
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Evolução do Consumo (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                Evolução do Rendimento Real (km/L)
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Cálculo fechado em tanques cheios consecutivos
              </p>
            </div>
            <div className="text-xs font-mono-numbers text-slate-500 dark:text-neutral-400 flex items-center gap-2">
              <span className="inline-block w-3 h-0.5 bg-amber-500" />
              <span>Consumo</span>
              <span className="inline-block w-3 h-0.5 border-t border-dashed border-slate-400 dark:border-neutral-500" />
              <span>Média ({kpis.avgKmL})</span>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartDataLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-neutral-500">
                Registre pelo menos 2 abastecimentos com tanque cheio para gerar a curva.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e2e8f0'} />
                  <XAxis
                    dataKey="date"
                    stroke={isDark ? '#737373' : '#64748b'}
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isDark ? '#737373' : '#64748b'}
                    fontSize={12}
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#171717' : '#ffffff',
                      borderColor: isDark ? '#404040' : '#e2e8f0',
                      borderRadius: '0.75rem',
                      color: isDark ? '#fafafa' : '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(val: any) => [`${val} km/L`, 'Consumo']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return `${label} · ${payload[0].payload.station} (${payload[0].payload.fuel})`;
                      }
                      return label;
                    }}
                  />
                  {kpis.avgKmL > 0 && (
                    <ReferenceLine
                      y={kpis.avgKmL}
                      stroke={isDark ? '#737373' : '#94a3b8'}
                      strokeDasharray="4 4"
                      label={{
                        value: `Média ${kpis.avgKmL}`,
                        fill: isDark ? '#a3a3a3' : '#64748b',
                        fontSize: 12,
                        position: 'insideTopRight',
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="kmL"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#F59E0B' }}
                    activeDot={{ r: 6, fill: '#FBBF24' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Gastos Mensais (1 Col) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              Gastos Mensais com Combustível
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Últimos meses registrados (R$)
            </p>
          </div>

          <div className="h-64 w-full">
            {monthlyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-neutral-500">
                Nenhum dado mensal disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e2e8f0'} />
                  <XAxis
                    dataKey="month"
                    stroke={isDark ? '#737373' : '#64748b'}
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis stroke={isDark ? '#737373' : '#64748b'} fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#171717' : '#ffffff',
                      borderColor: isDark ? '#404040' : '#e2e8f0',
                      borderRadius: '0.75rem',
                      color: isDark ? '#fafafa' : '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Gasto']}
                  />
                  <Bar
                    dataKey="gasto"
                    fill="#3B82F6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* QUICK STATUS STRIP: MAINTENANCE ALERT + HIGHWAY SHORTCUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Maintenance Box */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">
                  Manutenção Preventiva Mais Próxima
                </h4>
              </div>
              <button
                onClick={onNavigateToGarage}
                className="min-h-[44px] px-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {urgentMaintenance ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-neutral-100">
                    {urgentMaintenance.title}
                  </span>
                  <span
                    className={`font-mono-numbers font-semibold ${
                      urgentMaintenance.remainingKm <= 500
                        ? 'text-red-500'
                        : 'text-slate-500 dark:text-neutral-400'
                    }`}
                  >
                    {urgentMaintenance.remainingKm <= 0
                      ? 'Vencida!'
                      : `Restam ${urgentMaintenance.remainingKm.toLocaleString('pt-BR')} km`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-100 dark:bg-neutral-950 rounded-full overflow-hidden border border-slate-200 dark:border-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      urgentMaintenance.remainingKm <= 500
                        ? 'bg-red-500'
                        : urgentMaintenance.progressPct > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${urgentMaintenance.progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
                  <span>Feito com {urgentMaintenance.lastDoneOdometer.toLocaleString('pt-BR')} km</span>
                  <span>Intervalo: {urgentMaintenance.intervalKm.toLocaleString('pt-BR')} km</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-neutral-500">
                Nenhum lembrete de manutenção cadastrado para este veículo.
              </p>
            )}
          </div>
        </div>

        {/* Highway Journey Quick Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-neutral-900 dark:to-neutral-950 border border-slate-200 dark:border-neutral-800 shadow-sm flex items-center justify-between gap-4 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Linha da Estrada
            </span>
            <h4 className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {logs.length} paradas registradas
            </h4>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Explore o histórico de consumo em formato visual de rodovia e marcos quilométricos.
            </p>
          </div>

          <button
            onClick={onNavigateToRoad}
            className="min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-neutral-100 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-300 dark:border-neutral-700 rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
          >
            <span>Ver Estrada</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PENÚLTIMO CARD: SIMULADOR DE VIAGEM E CUSTO DE ROTA */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-neutral-900 to-slate-950 dark:from-neutral-900 dark:via-neutral-900/90 dark:to-neutral-950 border border-slate-800 dark:border-neutral-800 shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Simulador de Viagem & Custo de Rota
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-neutral-950">
                Novo
              </span>
            </div>
            <p className="text-xs text-slate-300 dark:text-neutral-400 leading-relaxed max-w-xl">
              Calcule consumo na estrada, paradas recomendadas com reserva de 15%, comparativo <strong>Gasolina vs. Etanol</strong> e orçamento total incluindo pedágios.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsTripSimulatorOpen(true)}
          className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 shrink-0"
        >
          <Compass className="w-4 h-4" />
          <span>Simular Viagem</span>
        </button>
      </div>

      {/* ÚLTIMO CARD: RADAR DE PRÓXIMO ABASTECIMENTO (PREDICTIVE REFUEL TELEMETRY CARD) */}
      <RefuelRadarCard
        logs={logs}
        vehicle={vehicle}
        tireCalibrations={tireCalibrations}
        onOpenFuelModal={onOpenFuelModal}
        onUpdateVehicleOdometer={onUpdateVehicleOdometer}
        onQuickCalibrateTires={onQuickCalibrateTires}
        onViewTireHistory={onNavigateToTireHistory}
      />

      {/* Fuel Breakdown Modal */}
      <FuelBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        logs={logs}
        vehicle={vehicle}
      />

      {/* TCO Cost Breakdown Modal (Responsive Bottom Sheet on Mobile) */}
      {isTcoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] overflow-y-auto shadow-2xl space-y-4 p-5 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mb-1 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                    Custo Real por Km (TCO)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Custo Total de Propriedade de {vehicle.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTcoModalOpen(false)}
                aria-label="Fechar"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formula banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Fórmula de Propriedade Real
              </span>
              <p className="text-xs font-mono-numbers text-slate-800 dark:text-neutral-200 font-medium">
                (Combustível + Manutenção + Despesas Extras) / Km Rodados
              </p>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Considera a distância total monitorada de{' '}
                <strong className="text-slate-700 dark:text-neutral-300">
                  {totalDistanceDriven > 0 ? `${totalDistanceDriven.toLocaleString('pt-BR')} km` : 'hodômetro'}
                </strong>.
              </p>
            </div>

            {/* The 3 Pillars */}
            <div className="space-y-2.5">
              {/* Pillar 1: Combustível */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 block">
                      1. Combustível
                    </span>
                    <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                      R$ {totalFuelSpentAllTime.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono-numbers block">
                    R$ {fuelCostPerKm.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">/km</span>
                </div>
              </div>

              {/* Pillar 2: Manutenções */}
              <div className="p-3.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 block">
                      2. Manutenções Preventivas
                    </span>
                    <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                      R$ {totalMaintenanceSpentAllTime.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono-numbers block">
                    R$ {maintenanceCostPerKm.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">/km</span>
                </div>
              </div>

              {/* Pillar 3: Despesas Extras */}
              <div className="p-3.5 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 block">
                      3. Despesas Extras (Não-Combustível)
                    </span>
                    <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                      R$ {totalExtraExpensesAllTime.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (IPVA, seguro, taxas, etc.)
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-extrabold text-purple-600 dark:text-purple-400 font-mono-numbers block">
                    R$ {extraExpensesCostPerKm.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">/km</span>
                </div>
              </div>
            </div>

            {/* Total TCO Summary */}
            <div className="p-4 rounded-2xl bg-slate-900 dark:bg-neutral-800 text-white flex items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                  Custo Total de Propriedade
                </span>
                <span className="text-xs text-slate-300 font-mono-numbers">
                  Investimento total: R$ {totalSpentAllTimeTCO.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-black font-mono-numbers text-amber-400">
                  R$ {totalTcoCostPerKm.toFixed(2)}
                </span>
                <span className="text-xs text-slate-300 ml-1">/km</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTcoModalOpen(false)}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-bold text-xs sm:text-sm transition-all active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRIP SIMULATOR MODAL */}
      <TripSimulatorModal
        isOpen={isTripSimulatorOpen}
        onClose={() => setIsTripSimulatorOpen(false)}
        vehicle={vehicle}
        logs={logs}
      />
    </div>
  );
};
