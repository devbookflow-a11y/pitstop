import React, { useState, useMemo } from 'react';
import {
  FileBarChart,
  Download,
  Printer,
  Calendar,
  Filter,
  TrendingUp,
  Fuel,
  Wrench,
  DollarSign,
  Gauge,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Car,
  ChevronRight,
  Info,
  Check,
  Receipt,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Vehicle, FuelLog, MaintenanceItem, ExtraExpense, ExpenseCategory } from '../types';
import { calculateFuelLogsMetrics } from '../utils/calculations';

interface ReportsViewProps {
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  fuelLogs: FuelLog[];
  maintenanceItems: MaintenanceItem[];
  extraExpenses: ExtraExpense[];
  theme: 'dark' | 'light';
}

const EXPENSE_CATEGORY_NAMES: Record<ExpenseCategory, string> = {
  ipva_impostos: 'IPVA / Impostos',
  seguro: 'Seguro Auto',
  licenciamento_taxas: 'Licenciamento / Taxas',
  estacionamento_pedagio: 'Estacionamento / Pedágio',
  lavagem_estetica: 'Lavagem / Estética',
  multas: 'Multas de Trânsito',
  outros: 'Outros',
};

type PeriodPreset = 'month' | 'last_month' | '3_months' | 'year' | 'all' | 'custom';

const FUEL_LABELS: Record<string, string> = {
  gasolina_comum: 'Gasolina Comum',
  gasolina_aditivada: 'Gasolina Aditivada',
  etanol: 'Etanol',
  diesel_s10: 'Diesel S10',
  gnv: 'GNV',
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  vehicles,
  activeVehicle,
  fuelLogs,
  maintenanceItems,
  extraExpenses = [],
  theme,
}) => {
  // Filters State - Period A (Current)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedFuelType, setSelectedFuelType] = useState<string>('all');
  const [selectedDrivingProfile, setSelectedDrivingProfile] = useState<string>('all');

  // Comparison State - Period B (Reference)
  const [isComparing, setIsComparing] = useState(false);
  const [compareMode, setCompareMode] = useState<'previous' | 'custom'>('previous');
  const [customStartDateB, setCustomStartDateB] = useState<string>('');
  const [customEndDateB, setCustomEndDateB] = useState<string>('');

  // Safeguard: Active vehicle logs
  const activeVehicleCalculatedLogs = useMemo(() => {
    if (!activeVehicle) return [];
    const rawLogs = fuelLogs.filter(l => l.vehicleId === activeVehicle.id);
    return calculateFuelLogsMetrics(rawLogs);
  }, [fuelLogs, activeVehicle]);

  // Compute available fuel types registered for the active vehicle
  const availableFuels = useMemo(() => {
    const fuels = new Set<string>();
    activeVehicleCalculatedLogs.forEach(l => {
      if (l.fuelType) fuels.add(l.fuelType);
    });
    return Array.from(fuels);
  }, [activeVehicleCalculatedLogs]);

  // Compute date boundary for Period A
  const dateRangeA = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (periodPreset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodPreset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (periodPreset === '3_months') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodPreset === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (periodPreset === 'custom') {
      if (customStartDate) start = new Date(customStartDate + 'T00:00:00');
      if (customEndDate) end = new Date(customEndDate + 'T23:59:59');
    }

    return { start, end };
  }, [periodPreset, customStartDate, customEndDate]);

  // Compute date boundary for Period B (Reference)
  const dateRangeB = useMemo(() => {
    if (!isComparing) return { start: null, end: null };

    if (compareMode === 'custom') {
      const start = customStartDateB ? new Date(customStartDateB + 'T00:00:00') : null;
      const end = customEndDateB ? new Date(customEndDateB + 'T23:59:59') : null;
      return { start, end };
    }

    // Default: 'Período imediatamente anterior de mesma duração'
    const now = new Date();
    if (periodPreset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end };
    }
    if (periodPreset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
      return { start, end };
    }
    if (periodPreset === '3_months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59);
      return { start, end };
    }
    if (periodPreset === 'year') {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      return { start, end };
    }
    if (periodPreset === 'custom' && dateRangeA.start && dateRangeA.end) {
      const durationMs = dateRangeA.end.getTime() - dateRangeA.start.getTime();
      const end = new Date(dateRangeA.start.getTime() - 1000);
      const start = new Date(end.getTime() - durationMs);
      return { start, end };
    }

    // If 'all': take the earlier chronological half of vehicle logs as reference
    const sorted = [...activeVehicleCalculatedLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sorted.length >= 2) {
      const mid = Math.floor(sorted.length / 2);
      const start = new Date(sorted[0].date + 'T00:00:00');
      const end = new Date(sorted[mid].date + 'T23:59:59');
      return { start, end };
    }

    return { start: null, end: null };
  }, [isComparing, compareMode, periodPreset, dateRangeA, customStartDateB, customEndDateB, activeVehicleCalculatedLogs]);

  // Filtered Fuel Logs for Period A
  const filteredLogs = useMemo(() => {
    return activeVehicleCalculatedLogs.filter(log => {
      if (dateRangeA.start || dateRangeA.end) {
        const logDate = new Date(log.date + 'T12:00:00');
        if (dateRangeA.start && logDate < dateRangeA.start) return false;
        if (dateRangeA.end && logDate > dateRangeA.end) return false;
      }
      if (selectedFuelType !== 'all' && log.fuelType !== selectedFuelType) return false;
      if (selectedDrivingProfile !== 'all' && log.drivingProfile !== selectedDrivingProfile) return false;
      return true;
    });
  }, [activeVehicleCalculatedLogs, dateRangeA, selectedFuelType, selectedDrivingProfile]);

  // Filtered Maintenance Items for Period A
  const filteredMaintenance = useMemo(() => {
    if (!activeVehicle) return [];
    return maintenanceItems.filter(item => {
      if (item.vehicleId !== activeVehicle.id || !item.lastDoneDate) return false;
      if (dateRangeA.start || dateRangeA.end) {
        const mDate = new Date(item.lastDoneDate + 'T12:00:00');
        if (dateRangeA.start && mDate < dateRangeA.start) return false;
        if (dateRangeA.end && mDate > dateRangeA.end) return false;
      }
      return true;
    });
  }, [maintenanceItems, activeVehicle, dateRangeA]);

  // Filtered Extra Expenses for Period A
  const filteredExpenses = useMemo(() => {
    if (!activeVehicle) return [];
    return extraExpenses.filter(item => {
      if (item.vehicleId !== activeVehicle.id) return false;
      if (dateRangeA.start || dateRangeA.end) {
        const eDate = new Date(item.date + 'T12:00:00');
        if (dateRangeA.start && eDate < dateRangeA.start) return false;
        if (dateRangeA.end && eDate > dateRangeA.end) return false;
      }
      return true;
    });
  }, [extraExpenses, activeVehicle, dateRangeA]);

  // Filtered Fuel Logs for Period B
  const filteredLogsB = useMemo(() => {
    if (!isComparing) return [];
    return activeVehicleCalculatedLogs.filter(log => {
      if (dateRangeB.start || dateRangeB.end) {
        const logDate = new Date(log.date + 'T12:00:00');
        if (dateRangeB.start && logDate < dateRangeB.start) return false;
        if (dateRangeB.end && logDate > dateRangeB.end) return false;
      }
      if (selectedFuelType !== 'all' && log.fuelType !== selectedFuelType) return false;
      if (selectedDrivingProfile !== 'all' && log.drivingProfile !== selectedDrivingProfile) return false;
      return true;
    });
  }, [isComparing, activeVehicleCalculatedLogs, dateRangeB, selectedFuelType, selectedDrivingProfile]);

  // Filtered Maintenance Items for Period B
  const filteredMaintenanceB = useMemo(() => {
    if (!isComparing || !activeVehicle) return [];
    return maintenanceItems.filter(item => {
      if (item.vehicleId !== activeVehicle.id || !item.lastDoneDate) return false;
      if (dateRangeB.start || dateRangeB.end) {
        const mDate = new Date(item.lastDoneDate + 'T12:00:00');
        if (dateRangeB.start && mDate < dateRangeB.start) return false;
        if (dateRangeB.end && mDate > dateRangeB.end) return false;
      }
      return true;
    });
  }, [isComparing, maintenanceItems, activeVehicle, dateRangeB]);

  // Filtered Extra Expenses for Period B
  const filteredExpensesB = useMemo(() => {
    if (!isComparing || !activeVehicle) return [];
    return extraExpenses.filter(item => {
      if (item.vehicleId !== activeVehicle.id) return false;
      if (dateRangeB.start || dateRangeB.end) {
        const eDate = new Date(item.date + 'T12:00:00');
        if (dateRangeB.start && eDate < dateRangeB.start) return false;
        if (dateRangeB.end && eDate > dateRangeB.end) return false;
      }
      return true;
    });
  }, [isComparing, extraExpenses, activeVehicle, dateRangeB]);

  // Executive Summary KPIs - Period A
  const kpis = useMemo(() => {
    const totalDistance = filteredLogs.reduce((acc, log) => acc + (log.distanceTraveled || 0), 0);
    const totalLiters = filteredLogs.reduce((acc, log) => acc + log.liters, 0);
    const fuelCost = filteredLogs.reduce((acc, log) => acc + log.totalCost, 0);
    const maintenanceCost = filteredMaintenance.reduce((acc, m) => acc + (m.cost || 0), 0);
    const extraExpensesCost = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const totalInvestment = fuelCost + maintenanceCost + extraExpensesCost;
    const costPerKm = totalDistance > 0 ? totalInvestment / totalDistance : 0;
    const avgKmL = totalLiters > 0 && totalDistance > 0 ? totalDistance / totalLiters : 0;

    return {
      totalDistance,
      totalLiters,
      fuelCost,
      maintenanceCost,
      extraExpensesCost,
      totalInvestment,
      costPerKm,
      avgKmL,
    };
  }, [filteredLogs, filteredMaintenance, filteredExpenses]);

  // Executive Summary KPIs - Period B
  const kpisB = useMemo(() => {
    if (!isComparing) return null;
    const totalDistance = filteredLogsB.reduce((acc, log) => acc + (log.distanceTraveled || 0), 0);
    const totalLiters = filteredLogsB.reduce((acc, log) => acc + log.liters, 0);
    const fuelCost = filteredLogsB.reduce((acc, log) => acc + log.totalCost, 0);
    const maintenanceCost = filteredMaintenanceB.reduce((acc, m) => acc + (m.cost || 0), 0);
    const extraExpensesCost = filteredExpensesB.reduce((acc, e) => acc + e.amount, 0);
    const totalInvestment = fuelCost + maintenanceCost + extraExpensesCost;
    const costPerKm = totalDistance > 0 ? totalInvestment / totalDistance : 0;
    const avgKmL = totalLiters > 0 && totalDistance > 0 ? totalDistance / totalLiters : 0;

    return {
      totalDistance,
      totalLiters,
      fuelCost,
      maintenanceCost,
      extraExpensesCost,
      totalInvestment,
      costPerKm,
      avgKmL,
    };
  }, [isComparing, filteredLogsB, filteredMaintenanceB, filteredExpensesB]);

  // Variation Badge Renderer
  const renderVariationBadge = (
    valA: number,
    valB: number | undefined,
    type: 'lowerIsBetter' | 'higherIsBetter' | 'neutral'
  ) => {
    if (!isComparing || valB === undefined || valB === null) return null;
    if (valB === 0 && valA === 0) {
      return (
        <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-slate-100 dark:bg-neutral-800 text-slate-500">
          0.0%
        </span>
      );
    }
    if (valB === 0) {
      return (
        <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-blue-500/10 text-blue-500">
          novo
        </span>
      );
    }

    const diff = ((valA - valB) / valB) * 100;
    const isZero = Math.abs(diff) < 0.05;
    const isPositive = diff > 0;
    const formatted = `${isPositive ? '+' : ''}${diff.toFixed(1)}%`;

    let colorClasses = 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400';
    if (!isZero) {
      if (type === 'lowerIsBetter') {
        colorClasses =
          diff < 0
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      } else if (type === 'higherIsBetter') {
        colorClasses =
          diff > 0
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      } else {
        colorClasses = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      }
    }

    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold px-1.5 py-0.5 rounded-md ${colorClasses}`}>
        {diff < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
        <span>{formatted}</span>
      </span>
    );
  };

  // Grouped BarChart Data for Period Comparison (A vs B)
  const periodComparisonChartData = useMemo(() => {
    if (!isComparing || !kpisB) return [];
    return [
      {
        categoria: 'Gasto Total',
        'Período A (Atual)': Number(kpis.totalInvestment.toFixed(2)),
        'Período B (Referência)': Number(kpisB.totalInvestment.toFixed(2)),
      },
      {
        categoria: 'Combustível',
        'Período A (Atual)': Number(kpis.fuelCost.toFixed(2)),
        'Período B (Referência)': Number(kpisB.fuelCost.toFixed(2)),
      },
      {
        categoria: 'Manutenção',
        'Período A (Atual)': Number(kpis.maintenanceCost.toFixed(2)),
        'Período B (Referência)': Number(kpisB.maintenanceCost.toFixed(2)),
      },
      {
        categoria: 'Despesas Extras',
        'Período A (Atual)': Number(kpis.extraExpensesCost.toFixed(2)),
        'Período B (Referência)': Number(kpisB.extraExpensesCost.toFixed(2)),
      },
    ];
  }, [isComparing, kpis, kpisB]);

  // Unit performance comparison
  const unitComparisonData = useMemo(() => {
    if (!isComparing || !kpisB) return [];
    return [
      {
        metric: 'Consumo Médio (km/L)',
        'Período A': Number(kpis.avgKmL.toFixed(2)),
        'Período B': Number(kpisB.avgKmL.toFixed(2)),
      },
      {
        metric: 'Custo por Km (R$/km)',
        'Período A': Number(kpis.costPerKm.toFixed(3)),
        'Período B': Number(kpisB.costPerKm.toFixed(3)),
      },
    ];
  }, [isComparing, kpis, kpisB]);

  // TCO Composition Pie Data
  const tcoBreakdownPieData = useMemo(() => {
    const total = kpis.totalInvestment;
    if (total === 0) return [];
    return [
      { name: 'Combustível', value: Number(kpis.fuelCost.toFixed(2)), color: '#f59e0b' },
      { name: 'Manutenção', value: Number(kpis.maintenanceCost.toFixed(2)), color: '#3b82f6' },
      { name: 'Despesas Extras', value: Number(kpis.extraExpensesCost.toFixed(2)), color: '#a855f7' },
    ].filter(item => item.value > 0);
  }, [kpis]);

  // Chart 1: Price evolution over time (sorted chronologically)
  const priceEvolutionData = useMemo(() => {
    const sorted = [...filteredLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sorted.map(log => {
      const formattedDate = new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      return {
        date: formattedDate,
        fullDate: log.date,
        price: log.pricePerLiter,
        fuel: FUEL_LABELS[log.fuelType] || log.fuelType,
        station: log.stationName,
      };
    });
  }, [filteredLogs]);

  // Chart 2: Monthly Costs (Fuel vs Maintenance vs Extra Expenses)
  const monthlyCostData = useMemo(() => {
    const monthsMap: Record<
      string,
      { month: string; sortKey: string; fuelCost: number; maintCost: number; extraCost: number }
    > = {};

    filteredLogs.forEach(log => {
      const d = new Date(log.date + 'T12:00:00');
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      if (!monthsMap[sortKey]) {
        monthsMap[sortKey] = { month: monthLabel, sortKey, fuelCost: 0, maintCost: 0, extraCost: 0 };
      }
      monthsMap[sortKey].fuelCost += log.totalCost;
    });

    filteredMaintenance.forEach(m => {
      if (!m.lastDoneDate) return;
      const d = new Date(m.lastDoneDate + 'T12:00:00');
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      if (!monthsMap[sortKey]) {
        monthsMap[sortKey] = { month: monthLabel, sortKey, fuelCost: 0, maintCost: 0, extraCost: 0 };
      }
      monthsMap[sortKey].maintCost += m.cost || 0;
    });

    filteredExpenses.forEach(exp => {
      const d = new Date(exp.date + 'T12:00:00');
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      if (!monthsMap[sortKey]) {
        monthsMap[sortKey] = { month: monthLabel, sortKey, fuelCost: 0, maintCost: 0, extraCost: 0 };
      }
      monthsMap[sortKey].extraCost += exp.amount;
    });

    return Object.values(monthsMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(item => ({
        month: item.month,
        Combustível: Number(item.fuelCost.toFixed(2)),
        Manutenção: Number(item.maintCost.toFixed(2)),
        'Despesas Extras': Number(item.extraCost.toFixed(2)),
        Total: Number((item.fuelCost + item.maintCost + item.extraCost).toFixed(2)),
      }));
  }, [filteredLogs, filteredMaintenance, filteredExpenses]);

  // Chart 3: Performance by Driving Profile (km/L)
  const profilePerformanceData = useMemo(() => {
    const profiles = [
      { key: 'cidade', label: 'Cidade' },
      { key: 'estrada', label: 'Estrada' },
      { key: 'misto', label: 'Misto' },
    ];

    return profiles.map(p => {
      const logsOfProfile = filteredLogs.filter(
        l => l.drivingProfile === p.key && (l.calculatedKmPerLiter || 0) > 0
      );
      const totalKm = logsOfProfile.reduce((acc, l) => acc + (l.distanceTraveled || 0), 0);
      const totalL = logsOfProfile.reduce((acc, l) => acc + l.liters, 0);
      const avgKmPerL = totalL > 0 && totalKm > 0 ? totalKm / totalL : 0;

      return {
        perfil: p.label,
        'Média km/L': Number(avgKmPerL.toFixed(2)),
        abastecimentos: logsOfProfile.length,
      };
    });
  }, [filteredLogs]);

  // Multi-vehicle Garage Comparison (for period)
  const garageComparison = useMemo(() => {
    if (!activeVehicle) return [];
    return vehicles.map(veh => {
      const rawLogs = fuelLogs.filter(l => l.vehicleId === veh.id);
      const calculatedLogs = calculateFuelLogsMetrics(rawLogs);

      const logsInPeriod = calculatedLogs.filter(log => {
        if (dateRangeA.start || dateRangeA.end) {
          const logDate = new Date(log.date + 'T12:00:00');
          if (dateRangeA.start && logDate < dateRangeA.start) return false;
          if (dateRangeA.end && logDate > dateRangeA.end) return false;
        }
        return true;
      });

      const totalDist = logsInPeriod.reduce((acc, l) => acc + (l.distanceTraveled || 0), 0);
      const totalL = logsInPeriod.reduce((acc, l) => acc + l.liters, 0);
      const totalFuelSpent = logsInPeriod.reduce((acc, l) => acc + l.totalCost, 0);

      const maintsInPeriod = maintenanceItems.filter(m => {
        if (m.vehicleId !== veh.id || !m.lastDoneDate) return false;
        if (dateRangeA.start || dateRangeA.end) {
          const mDate = new Date(m.lastDoneDate + 'T12:00:00');
          if (dateRangeA.start && mDate < dateRangeA.start) return false;
          if (dateRangeA.end && mDate > dateRangeA.end) return false;
        }
        return true;
      });
      const totalMaintSpent = maintsInPeriod.reduce((acc, m) => acc + (m.cost || 0), 0);

      const extrasInPeriod = extraExpenses.filter(e => {
        if (e.vehicleId !== veh.id) return false;
        if (dateRangeA.start || dateRangeA.end) {
          const eDate = new Date(e.date + 'T12:00:00');
          if (dateRangeA.start && eDate < dateRangeA.start) return false;
          if (dateRangeA.end && eDate > dateRangeA.end) return false;
        }
        return true;
      });
      const totalExtraSpent = extrasInPeriod.reduce((acc, e) => acc + e.amount, 0);

      const totalInvestment = totalFuelSpent + totalMaintSpent + totalExtraSpent;

      const avgKmL = totalL > 0 && totalDist > 0 ? totalDist / totalL : 0;
      const costPerKm = totalDist > 0 ? totalInvestment / totalDist : 0;

      return {
        id: veh.id,
        name: veh.name,
        plate: veh.plate,
        totalDist,
        totalL,
        totalSpent: totalInvestment,
        fuelSpent: totalFuelSpent,
        maintSpent: totalMaintSpent,
        extraSpent: totalExtraSpent,
        avgKmL,
        costPerKm,
        isCurrent: veh.id === activeVehicle.id,
      };
    });
  }, [vehicles, fuelLogs, maintenanceItems, extraExpenses, dateRangeA, activeVehicle]);

  // Table Totals & Averages
  const tableSummary = useMemo(() => {
    const totalDist = filteredLogs.reduce((acc, l) => acc + (l.distanceTraveled || 0), 0);
    const totalL = filteredLogs.reduce((acc, l) => acc + l.liters, 0);
    const totalCost = filteredLogs.reduce((acc, l) => acc + l.totalCost, 0);
    const avgPrice = totalL > 0 ? totalCost / totalL : 0;
    const avgKmL = totalL > 0 && totalDist > 0 ? totalDist / totalL : 0;

    return {
      totalDist,
      totalL,
      totalCost,
      avgPrice,
      avgKmL,
    };
  }, [filteredLogs]);

  // Export filtered logs to CSV
  const handleExportFilteredCSV = () => {
    if (!activeVehicle) return;
    const header = [
      'Data',
      'Veículo',
      'Placa',
      'Posto',
      'Bandeira',
      'Combustível',
      'Perfil',
      'Tanque Cheio',
      'Hodômetro (km)',
      'Distância (+km)',
      'Litros (L)',
      'Preço por Litro (R$)',
      'Valor Total (R$)',
      'Consumo (km/L)',
      'Custo por Km (R$/km)',
    ];

    const rows = filteredLogs.map(log => [
      log.date,
      `"${activeVehicle.name}"`,
      `"${activeVehicle.plate}"`,
      `"${log.stationName || 'Posto'}"`,
      `"${log.stationBrand || '-'}"`,
      `"${FUEL_LABELS[log.fuelType] || log.fuelType}"`,
      `"${log.drivingProfile}"`,
      log.isFullTank ? 'Sim' : 'Não',
      log.odometer,
      log.distanceTraveled || 0,
      log.liters.toFixed(2),
      log.pricePerLiter.toFixed(3),
      log.totalCost.toFixed(2),
      log.calculatedKmPerLiter ? log.calculatedKmPerLiter.toFixed(2) : '-',
      log.calculatedCostPerKm ? log.calculatedCostPerKm.toFixed(3) : '-',
    ]);

    // Summary row
    rows.push([]);
    rows.push([
      'RESUMO DO PERÍODO',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      tableSummary.totalDist,
      tableSummary.totalL.toFixed(2),
      tableSummary.avgPrice.toFixed(3),
      tableSummary.totalCost.toFixed(2),
      tableSummary.avgKmL.toFixed(2),
      kpis.costPerKm.toFixed(3),
    ]);

    // Section for Extra Expenses and Maintenance
    if (filteredExpenses.length > 0 || filteredMaintenance.length > 0) {
      rows.push([]);
      rows.push(['--- DESPESAS EXTRAS E MANUTENÇÕES DO PERÍODO ---']);
      rows.push(['Data', 'Tipo', 'Categoria', 'Descrição', '', '', '', '', 'Hodômetro (km)', '', '', '', 'Valor (R$)']);
      filteredMaintenance.forEach(m => {
        rows.push([
          m.lastDoneDate || '',
          'Manutenção Preventiva',
          m.category,
          `"${m.title}"`,
          '',
          '',
          '',
          '',
          m.lastDoneOdometer,
          '',
          '',
          '',
          (m.cost || 0).toFixed(2),
        ]);
      });
      filteredExpenses.forEach(e => {
        rows.push([
          e.date,
          'Despesa Extra',
          EXPENSE_CATEGORY_NAMES[e.category] || e.category,
          `"${e.description}"`,
          '',
          '',
          '',
          '',
          e.odometer || '-',
          '',
          '',
          '',
          e.amount.toFixed(2),
        ]);
      });
    }

    const csvContent =
      '\uFEFF' +
      [header.join(';'), ...rows.map(r => (Array.isArray(r) ? r.join(';') : r))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const periodLabel = periodPreset === 'custom' ? 'personalizado' : periodPreset;
    link.setAttribute(
      'download',
      `pitstop_relatorio_${activeVehicle.plate.replace(/[^a-zA-Z0-9]/g, '')}_${periodLabel}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#262626' : '#e2e8f0';
  const textColor = isDark ? '#a3a3a3' : '#64748b';

  // Period label for print and header
  const periodReadableName = useMemo(() => {
    switch (periodPreset) {
      case 'month':
        return 'Este Mês';
      case 'last_month':
        return 'Último Mês';
      case '3_months':
        return 'Últimos 3 Meses';
      case 'year':
        return 'Este Ano';
      case 'all':
        return 'Todo o Período';
      case 'custom':
        return `Personalizado (${customStartDate || 'Início'} até ${customEndDate || 'Hoje'})`;
      default:
        return 'Geral';
    }
  }, [periodPreset, customStartDate, customEndDate]);

  // Safeguard: no vehicle
  if (!activeVehicle) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl shadow-sm">
        <Car className="w-12 h-12 mx-auto mb-3 text-slate-400" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-neutral-200">
          Nenhum veículo selecionado
        </h2>
        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
          Cadastre ou selecione um veículo para visualizar seus relatórios e telemetria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Official Print-Only Header */}
      <div className="hidden print:block mb-8 border-b border-slate-300 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icon-192x192.png"
              alt="Logo PitStop"
              className="w-11 h-11 rounded-xl object-cover border border-slate-200"
            />
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">PITSTOP</h1>
              <p className="text-sm font-semibold text-slate-600">
                Relatório Executivo de Telemetria e Prestação de Contas
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              Data de Emissão: {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR')}
            </p>
            <p>
              Veículo:{' '}
              <strong className="text-slate-800">
                {activeVehicle.name} ({activeVehicle.plate})
              </strong>
            </p>
            <p>
              Período: <strong className="text-slate-800">{periodReadableName}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Screen Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <FileBarChart className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-neutral-100 tracking-tight">
              Relatórios e Telemetria
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Análise consolidada de desempenho, investimentos e prestação de contas de{' '}
            <strong className="text-slate-700 dark:text-neutral-200">
              {activeVehicle.name} ({activeVehicle.plate})
            </strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportFilteredCSV}
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 rounded-xl transition-all shadow-sm active:scale-95"
            title="Baixar planilha CSV com os dados filtrados"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl transition-all shadow-md active:scale-95"
            title="Imprimir ou Salvar em PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* 1. Global Filter Bar (Dynamic + Period Comparison) */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm print:hidden transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              Filtros do Relatório
            </h2>
          </div>

          {/* Toggle "Comparar Períodos" */}
          <button
            type="button"
            onClick={() => setIsComparing(prev => !prev)}
            className={`min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
              isComparing
                ? 'bg-amber-500 text-neutral-950 shadow-amber-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>{isComparing ? 'Comparando Períodos' : 'Comparar Períodos'}</span>
          </button>
        </div>

        {/* Primary Filter Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Period Selector (Period A) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1.5">
              {isComparing ? 'Período A (Atual)' : 'Período'}
            </label>
            <select
              value={periodPreset}
              onChange={e => setPeriodPreset(e.target.value as PeriodPreset)}
              className="w-full min-h-[44px] text-base sm:text-sm font-medium bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Todo o período</option>
              <option value="month">Este mês</option>
              <option value="last_month">Último mês</option>
              <option value="3_months">Últimos 3 meses</option>
              <option value="year">Este ano</option>
              <option value="custom">Personalizado (definir datas)</option>
            </select>
          </div>

          {/* Fuel Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1.5">
              Tipo de Combustível
            </label>
            <select
              value={selectedFuelType}
              onChange={e => setSelectedFuelType(e.target.value)}
              className="w-full min-h-[44px] text-base sm:text-sm font-medium bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Todos os combustíveis</option>
              {availableFuels.map(f => (
                <option key={f} value={f}>
                  {FUEL_LABELS[f] || f}
                </option>
              ))}
            </select>
          </div>

          {/* Driving Profile Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1.5">
              Perfil de Uso
            </label>
            <select
              value={selectedDrivingProfile}
              onChange={e => setSelectedDrivingProfile(e.target.value)}
              className="w-full min-h-[44px] text-base sm:text-sm font-medium bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Todos os perfis</option>
              <option value="cidade">Cidade</option>
              <option value="estrada">Estrada</option>
              <option value="misto">Misto</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs for Period A if 'custom' is selected */}
        {periodPreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3.5 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
                Data Inicial (Período A)
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="w-full min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
                Data Final (Período A)
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="w-full min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Period B Comparison Strip (when isComparing is true) */}
        {isComparing && (
          <div className="mt-4 pt-4 border-t border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-3.5 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                <span>Referência: Período B (Comparativo)</span>
              </div>

              {/* Mode switch for Period B */}
              <div className="inline-flex items-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCompareMode('previous')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95 ${
                    compareMode === 'previous'
                      ? 'bg-amber-500 text-neutral-950 shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Imediatamente anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('custom')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95 ${
                    compareMode === 'custom'
                      ? 'bg-amber-500 text-neutral-950 shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Datas personalizadas B
                </button>
              </div>
            </div>

            {/* Custom Dates for Period B */}
            {compareMode === 'custom' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
                    Data Inicial (Período B)
                  </label>
                  <input
                    type="date"
                    value={customStartDateB}
                    onChange={e => setCustomStartDateB(e.target.value)}
                    className="w-full min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
                    Data Final (Período B)
                  </label>
                  <input
                    type="date"
                    value={customEndDateB}
                    onChange={e => setCustomEndDateB(e.target.value)}
                    className="w-full min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-neutral-300">
                Comparando com o período de mesma duração que antecede imediatamente o intervalo ativo.
                {dateRangeB.start && dateRangeB.end && (
                  <span className="font-semibold block sm:inline sm:ml-1 text-slate-700 dark:text-neutral-200">
                    ({dateRangeB.start.toLocaleDateString('pt-BR')} a{' '}
                    {dateRangeB.end.toLocaleDateString('pt-BR')})
                  </span>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. Resumo Executivo (KPIs Consolidados do Recorte + Variação) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Distância */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Distância Percorrida</span>
            <div className="flex items-center gap-1.5">
              {renderVariationBadge(kpis.totalDistance, kpisB?.totalDistance, 'neutral')}
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100 font-mono-numbers">
            {kpis.totalDistance.toLocaleString('pt-BR')}{' '}
            <span className="text-xs font-semibold text-slate-500">km</span>
          </div>
          {isComparing && kpisB ? (
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 font-mono-numbers">
              Período B: <strong className="text-slate-700 dark:text-neutral-300">{kpisB.totalDistance.toLocaleString('pt-BR')} km</strong>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              {filteredLogs.length} parada{filteredLogs.length !== 1 ? 's' : ''} no recorte
            </p>
          )}
        </div>

        {/* Card 2: Volume */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Volume Abastecido</span>
            <div className="flex items-center gap-1.5">
              {renderVariationBadge(kpis.totalLiters, kpisB?.totalLiters, 'neutral')}
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100 font-mono-numbers">
            {kpis.totalLiters.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
            <span className="text-xs font-semibold text-slate-500">L</span>
          </div>
          {isComparing && kpisB ? (
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 font-mono-numbers">
              Período B: <strong className="text-slate-700 dark:text-neutral-300">{kpisB.totalLiters.toFixed(1)} L</strong>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Média de {(kpis.totalLiters / (filteredLogs.length || 1)).toFixed(1)} L por abastecimento
            </p>
          )}
        </div>

        {/* Card 3: Investimento Total */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Investimento Total</span>
            <div className="flex items-center gap-1.5">
              {renderVariationBadge(kpis.totalInvestment, kpisB?.totalInvestment, 'lowerIsBetter')}
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100 font-mono-numbers">
            R$ {kpis.totalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {isComparing && kpisB ? (
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 font-mono-numbers truncate">
              Período B: <strong className="text-slate-700 dark:text-neutral-300">R$ {kpisB.totalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </p>
          ) : (
            <p
              className="text-xs text-slate-500 dark:text-neutral-400 mt-1 truncate"
              title={`Combustível: R$ ${kpis.fuelCost.toFixed(2)} · Manutenção: R$ ${kpis.maintenanceCost.toFixed(2)} · Despesas Extras: R$ ${kpis.extraExpensesCost.toFixed(2)}`}
            >
              Comb.: R$ {kpis.fuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} · Manut.: R$ {kpis.maintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} · Extras: R$ {kpis.extraExpensesCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          )}
        </div>

        {/* Card 4: Custo Real por Km (TCO) */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Custo Real / km (TCO)</span>
            <div className="flex items-center gap-1.5">
              {renderVariationBadge(kpis.costPerKm, kpisB?.costPerKm, 'lowerIsBetter')}
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100 font-mono-numbers">
            R$ {kpis.costPerKm.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </div>
          {isComparing && kpisB ? (
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 font-mono-numbers">
              Período B: <strong className="text-slate-700 dark:text-neutral-300">R$ {kpisB.costPerKm.toFixed(3)}/km</strong>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              (Combustível + Manutenção + Despesas Extras) / km
            </p>
          )}
        </div>
      </div>

      {/* Gráfico Comparativo Lado a Lado (Exibido quando a comparação está ativa) */}
      {isComparing && kpisB && (
        <div className="bg-white dark:bg-neutral-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <ArrowLeftRight className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                  Comparativo Direto: Período A vs. Período B
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Análise lado a lado de gastos financeiros e métricas unitárias de rendimento
              </p>
            </div>

            {/* Quick efficiency summary pills */}
            <div className="flex items-center gap-2 text-xs">
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-mono-numbers">
                Consumo: <strong>{kpis.avgKmL.toFixed(1)}</strong> vs{' '}
                <strong className="text-slate-500">{kpisB.avgKmL.toFixed(1)} km/L</strong>{' '}
                {renderVariationBadge(kpis.avgKmL, kpisB.avgKmL, 'higherIsBetter')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Financial Grouped BarChart */}
            <div className="lg:col-span-2 h-72 w-full">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-2">
                Comparativo Financeiro (R$)
              </h4>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={periodComparisonChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.6} />
                  <XAxis dataKey="categoria" stroke={textColor} fontSize={12} tickLine={false} />
                  <YAxis
                    stroke={textColor}
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={v => `R$ ${Number(v)}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-neutral-100 p-2.5 rounded-xl text-xs shadow-lg border border-neutral-800 font-mono-numbers">
                            <p className="font-bold text-slate-300 font-sans mb-1">{label}</p>
                            {payload.map((entry, idx) => (
                              <p key={idx} style={{ color: entry.color }}>
                                {entry.name}: R$ {Number(entry.value).toFixed(2)}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                  <Bar dataKey="Período A (Atual)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Período B (Referência)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Efficiency & Unit Cost Comparison Cards */}
            <div className="flex flex-col justify-between gap-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Média de Consumo (km/L)
                </span>
                <div className="flex items-baseline justify-between mt-2 font-mono-numbers">
                  <div>
                    <span className="text-xl font-black text-slate-900 dark:text-neutral-100">
                      {kpis.avgKmL.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">km/L (A)</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-500 dark:text-neutral-400">
                      {kpisB.avgKmL.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">km/L (B)</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Variação de Eficiência:</span>
                  {renderVariationBadge(kpis.avgKmL, kpisB.avgKmL, 'higherIsBetter')}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Custo por Km (R$/km)
                </span>
                <div className="flex items-baseline justify-between mt-2 font-mono-numbers">
                  <div>
                    <span className="text-xl font-black text-slate-900 dark:text-neutral-100">
                      R$ {kpis.costPerKm.toFixed(3)}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">(A)</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-500 dark:text-neutral-400">
                      R$ {kpisB.costPerKm.toFixed(3)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">(B)</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Variação de Custo/Km:</span>
                  {renderVariationBadge(kpis.costPerKm, kpisB.costPerKm, 'lowerIsBetter')}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 block mb-1">
                  Resumo Comparativo
                </span>
                <p className="text-slate-600 dark:text-neutral-300 leading-relaxed">
                  {kpis.totalInvestment < kpisB.totalInvestment ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Economia de R$ {(kpisB.totalInvestment - kpis.totalInvestment).toFixed(2)} no Período A.
                    </span>
                  ) : kpis.totalInvestment > kpisB.totalInvestment ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Gasto superior em R$ {(kpis.totalInvestment - kpisB.totalInvestment).toFixed(2)} no Período A.
                    </span>
                  ) : (
                    <span>Investimento idêntico em ambos os períodos.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Gráficos Analíticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Evolução do Preço por Litro (R$/L) */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                Evolução do Preço por Litro (R$/L)
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Variação histórica do valor pago na bomba
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full">
            {priceEvolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceEvolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.6} />
                  <XAxis dataKey="date" stroke={textColor} fontSize={12} tickLine={false} />
                  <YAxis
                    stroke={textColor}
                    fontSize={12}
                    tickLine={false}
                    domain={['dataMin - 0.2', 'dataMax + 0.2']}
                    tickFormatter={v => `R$ ${Number(v).toFixed(2)}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-neutral-100 p-2.5 rounded-xl text-xs shadow-lg border border-neutral-800">
                            <p className="font-bold text-amber-400">{data.fuel}</p>
                            <p className="font-mono-numbers">Preço: R$ {Number(data.price).toFixed(3)}/L</p>
                            <p className="text-slate-400">{data.station || 'Posto'}</p>
                            <p className="text-xs text-slate-500">{data.fullDate}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    name="Preço (R$/L)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f59e0b' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem registros para o período filtrado
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Custos Mensais (Combustível vs Manutenção vs Despesas Extras) */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                Custos Mensais (Combustível vs. Manutenção vs. Extras)
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Distribuição de gastos mensais empilhados no período
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full">
            {monthlyCostData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCostData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.6} />
                  <XAxis dataKey="month" stroke={textColor} fontSize={12} tickLine={false} />
                  <YAxis
                    stroke={textColor}
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={v => `R$ ${Number(v)}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-neutral-100 p-2.5 rounded-xl text-xs shadow-lg border border-neutral-800">
                            <p className="font-bold text-slate-300 mb-1">{label}</p>
                            {payload.map((entry, idx) => (
                              <p key={idx} style={{ color: entry.color }} className="font-mono-numbers">
                                {entry.name}: R$ {Number(entry.value).toFixed(2)}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                  <Bar dataKey="Combustível" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Manutenção" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Despesas Extras" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem registros para o período filtrado
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 3 (NOVO): Composição do TCO (Donut Chart) */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                Composição do Custo de Propriedade (TCO)
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Participação de cada pilar de custo no período
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            {tcoBreakdownPieData.length > 0 ? (
              <>
                <div className="h-full w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tcoBreakdownPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {tcoBreakdownPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            const pct = kpis.totalInvestment > 0
                              ? ((Number(data.value) / kpis.totalInvestment) * 100).toFixed(1)
                              : '0.0';
                            return (
                              <div className="bg-slate-900 text-neutral-100 p-2.5 rounded-xl text-xs shadow-lg border border-neutral-800 font-mono-numbers">
                                <p className="font-bold" style={{ color: data.payload.color }}>
                                  {data.name}
                                </p>
                                <p>R$ {Number(data.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pct}%)</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full sm:w-1/2 flex flex-col justify-center space-y-2.5 pr-2">
                  {tcoBreakdownPieData.map(item => {
                    const pct = kpis.totalInvestment > 0
                      ? ((item.value / kpis.totalInvestment) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <div
                        key={item.name}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-slate-800 dark:text-neutral-200">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right font-mono-numbers">
                          <span className="font-bold text-slate-900 dark:text-neutral-100">
                            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-xs text-slate-400 ml-1.5 font-bold">
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                Sem despesas no período filtrado
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 3: Rendimento por Perfil de Uso (km/L) */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                Rendimento por Perfil de Uso (km/L)
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Eficiência comparativa entre Cidade, Estrada e Misto
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profilePerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.6} />
                <XAxis dataKey="perfil" stroke={textColor} fontSize={12} tickLine={false} />
                <YAxis
                  stroke={textColor}
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={v => `${Number(v).toFixed(1)}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-neutral-100 p-2.5 rounded-xl text-xs shadow-lg border border-neutral-800">
                          <p className="font-bold text-blue-400">{data.perfil}</p>
                          <p className="font-mono-numbers">Média: {Number(data['Média km/L']).toFixed(2)} km/L</p>
                          <p className="text-xs text-slate-400">{data.abastecimentos} abastecimento(s)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Média km/L" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4 / Card: Comparativo entre Veículos da Garagem */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                Comparativo da Garagem
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Desempenho e custos de todos os veículos no período
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                  <th className="py-2">Veículo</th>
                  <th className="py-2 text-right">Média</th>
                  <th className="py-2 text-right">Custo/km</th>
                  <th className="py-2 text-right">Gasto Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 font-mono-numbers">
                {garageComparison.map(veh => (
                  <tr
                    key={veh.id}
                    className={`hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-colors ${
                      veh.isCurrent ? 'bg-amber-500/5 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-neutral-100">
                          {veh.name}
                        </span>
                        {veh.isCurrent && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold uppercase">
                            Atual
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{veh.plate}</span>
                    </td>
                    <td className="py-2.5 text-right text-slate-700 dark:text-neutral-300">
                      {veh.avgKmL > 0 ? `${veh.avgKmL.toFixed(1)} km/L` : '-'}
                    </td>
                    <td className="py-2.5 text-right text-slate-700 dark:text-neutral-300">
                      {veh.costPerKm > 0 ? `R$ ${veh.costPerKm.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900 dark:text-neutral-100">
                      R$ {veh.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Tabela Detalhada (Prestação de Contas) */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              Prestação de Contas Detalhada
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Histórico auditável de todos os abastecimentos do período
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
            {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Posto / Bandeira</th>
                <th className="py-2.5 px-3">Combustível</th>
                <th className="py-2.5 px-3">Perfil</th>
                <th className="py-2.5 px-3 text-right">Hodômetro</th>
                <th className="py-2.5 px-3 text-right">Distância</th>
                <th className="py-2.5 px-3 text-right">Litros</th>
                <th className="py-2.5 px-3 text-right">Preço/L</th>
                <th className="py-2.5 px-3 text-right">Consumo</th>
                <th className="py-2.5 px-3 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 font-mono-numbers">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 text-slate-600 dark:text-neutral-400 whitespace-nowrap">
                      {new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 font-sans whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-neutral-200">
                        {log.stationName || 'Posto de Combustível'}
                      </div>
                      <div className="text-xs text-slate-400">{log.stationBrand || '-'}</div>
                    </td>
                    <td className="py-3 px-3 font-sans whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {FUEL_LABELS[log.fuelType] || log.fuelType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans capitalize text-slate-600 dark:text-neutral-400 whitespace-nowrap">
                      {log.drivingProfile}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                      {log.odometer.toLocaleString('pt-BR')} km
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                      {log.distanceTraveled ? `+${log.distanceTraveled} km` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                      {log.liters.toFixed(2)} L
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                      R$ {log.pricePerLiter.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                      {log.calculatedKmPerLiter ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {log.calculatedKmPerLiter.toFixed(2)} km/L
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-neutral-100 whitespace-nowrap">
                      R$ {log.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-400 font-sans">
                    Nenhum abastecimento encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Footer Summary Row */}
            {filteredLogs.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-neutral-700 font-bold bg-slate-50/80 dark:bg-neutral-800/40 text-slate-900 dark:text-neutral-100 font-mono-numbers">
                  <td
                    colSpan={5}
                    className="py-3 px-3 font-sans text-xs uppercase tracking-wider text-slate-600 dark:text-neutral-400"
                  >
                    Totais / Médias do Recorte
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    +{tableSummary.totalDist.toLocaleString('pt-BR')} km
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {tableSummary.totalL.toFixed(2)} L
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    R$ {tableSummary.avgPrice.toFixed(3)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {tableSummary.avgKmL > 0 ? `${tableSummary.avgKmL.toFixed(2)} km/L` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    R$ {tableSummary.totalCost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 5. Tabela de Despesas Extras e Manutenções do Período */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-500" />
              <span>Despesas Extras e Manutenções do Período</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Detalhamento de gastos com impostos, seguro, revisões e custos complementares
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 font-mono-numbers">
            {filteredMaintenance.length + filteredExpenses.length} registro{filteredMaintenance.length + filteredExpenses.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Descrição / Item</th>
                <th className="py-2.5 px-3 text-right">Hodômetro</th>
                <th className="py-2.5 px-3 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 font-mono-numbers">
              {filteredMaintenance.length > 0 || filteredExpenses.length > 0 ? (
                <>
                  {filteredMaintenance.map(m => (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-600 dark:text-neutral-400 whitespace-nowrap">
                        {m.lastDoneDate
                          ? new Date(m.lastDoneDate + 'T12:00:00').toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="py-3 px-3 font-sans whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Manutenção Preventiva
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans capitalize text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                        {m.category}
                      </td>
                      <td className="py-3 px-3 font-sans font-semibold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                        {m.title}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                        {m.lastDoneOdometer.toLocaleString('pt-BR')} km
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-neutral-100 whitespace-nowrap">
                        R$ {(m.cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.map(e => (
                    <tr
                      key={e.id}
                      className="hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-600 dark:text-neutral-400 whitespace-nowrap">
                        {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 font-sans whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          Despesa Extra
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                        {EXPENSE_CATEGORY_NAMES[e.category] || e.category}
                      </td>
                      <td className="py-3 px-3 font-sans font-semibold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                        {e.description}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                        {e.odometer ? `${e.odometer.toLocaleString('pt-BR')} km` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-neutral-100 whitespace-nowrap">
                        R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-sans">
                    Nenhuma manutenção ou despesa extra registrada no período filtrado.
                  </td>
                </tr>
              )}
            </tbody>
            {(filteredMaintenance.length > 0 || filteredExpenses.length > 0) && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-neutral-700 font-bold bg-slate-50/80 dark:bg-neutral-800/40 text-slate-900 dark:text-neutral-100 font-mono-numbers">
                  <td
                    colSpan={5}
                    className="py-3 px-3 font-sans text-xs uppercase tracking-wider text-slate-600 dark:text-neutral-400"
                  >
                    Total Despesas Extras & Manutenção no Recorte
                  </td>
                  <td className="py-3 px-3 text-right text-purple-600 dark:text-purple-400 whitespace-nowrap">
                    R$ {(kpis.maintenanceCost + kpis.extraExpensesCost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
