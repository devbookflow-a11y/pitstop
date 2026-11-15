import React, { useState, useMemo } from 'react';
import {
  FuelLog,
  Vehicle,
  FuelType,
  DrivingProfile
} from '../types';
import { calculateRefuelProjection } from '../utils/calculations';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import {
  Fuel,
  Navigation2,
  Calendar,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  RotateCcw,
  CheckCircle2,
  ArrowDown,
  Car,
  Gauge,
  DollarSign,
  Clock
} from 'lucide-react';

interface RoadHistoryViewProps {
  logs: FuelLog[];
  vehicle: Vehicle;
  onEditLog: (log: FuelLog) => void;
  onDeleteLog: (id: string) => void;
  onOpenFuelModal: () => void;
}

type PeriodFilter = 'all' | '30d' | '90d' | 'year';

export const RoadHistoryView: React.FC<RoadHistoryViewProps> = ({
  logs,
  vehicle,
  onEditLog,
  onDeleteLog,
  onOpenFuelModal,
}) => {
  const [fuelFilter, setFuelFilter] = useState<string>('all');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile Bottom Sheet filter state
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [draftFuelFilter, setDraftFuelFilter] = useState<string>('all');
  const [draftProfileFilter, setDraftProfileFilter] = useState<string>('all');
  const [draftPeriodFilter, setDraftPeriodFilter] = useState<PeriodFilter>('all');
  const [draftSearchQuery, setDraftSearchQuery] = useState('');

  useBodyScrollLock(isMobileFiltersOpen);

  const openMobileFilters = () => {
    setDraftFuelFilter(fuelFilter);
    setDraftProfileFilter(profileFilter);
    setDraftPeriodFilter(periodFilter);
    setDraftSearchQuery(searchQuery);
    setIsMobileFiltersOpen(true);
  };

  const applyMobileFilters = () => {
    setFuelFilter(draftFuelFilter);
    setProfileFilter(draftProfileFilter);
    setPeriodFilter(draftPeriodFilter);
    setSearchQuery(draftSearchQuery);
    setIsMobileFiltersOpen(false);
  };

  const clearMobileFilters = () => {
    setDraftFuelFilter('all');
    setDraftProfileFilter('all');
    setDraftPeriodFilter('all');
    setDraftSearchQuery('');
    setFuelFilter('all');
    setProfileFilter('all');
    setPeriodFilter('all');
    setSearchQuery('');
    setIsMobileFiltersOpen(false);
  };

  const activeFiltersCount =
    (fuelFilter !== 'all' ? 1 : 0) +
    (profileFilter !== 'all' ? 1 : 0) +
    (periodFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  // Guaranteed deduplication by unique log id before filtering/mapping
  const deduplicatedLogs = useMemo(() => {
    return Array.from(new Map(logs.map(item => [item.id, item])).values());
  }, [logs]);

  // Calculate vehicle baseline average km/L for comparison (above or below avg)
  const validLogs = deduplicatedLogs.filter(l => l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0);
  const baselineAvgKmL = validLogs.length > 0
    ? validLogs.reduce((a, b) => a + (b.calculatedKmPerLiter || 0), 0) / validLogs.length
    : 10.0;

  // Predictive next refuel projection
  const projection = useMemo(() => {
    return calculateRefuelProjection(deduplicatedLogs, vehicle);
  }, [deduplicatedLogs, vehicle]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    return deduplicatedLogs.filter(log => {
      if (fuelFilter !== 'all' && log.fuelType !== fuelFilter) return false;
      if (profileFilter !== 'all' && log.drivingProfile !== profileFilter) return false;

      if (periodFilter !== 'all') {
        const logDate = new Date(log.date + 'T12:00:00');
        if (periodFilter === 'year') {
          if (logDate.getFullYear() !== currentYear) return false;
        } else {
          const daysLimit = periodFilter === '30d' ? 30 : 90;
          const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > daysLimit) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStation = log.stationName.toLowerCase().includes(q);
        const matchBrand = log.stationBrand.toLowerCase().includes(q);
        const matchNotes = (log.notes || '').toLowerCase().includes(q);
        if (!matchStation && !matchBrand && !matchNotes) return false;
      }
      return true;
    });
  }, [deduplicatedLogs, fuelFilter, profileFilter, periodFilter, searchQuery]);

  const getFuelBadgeLabel = (type: FuelType) => {
    switch (type) {
      case 'gasolina_comum':
        return 'Gasolina Comum';
      case 'gasolina_aditivada':
        return 'Gasolina Aditivada';
      case 'etanol':
        return 'Etanol';
      case 'diesel_s10':
        return 'Diesel S10';
      case 'gnv':
        return 'GNV';
      default:
        return type;
    }
  };

  const getProfileBadge = (profile: DrivingProfile) => {
    switch (profile) {
      case 'cidade':
        return '🏙️ Urbana';
      case 'estrada':
        return '🛣️ Rodovia';
      case 'misto':
        return '⚖️ Misto';
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in">
      {/* Header & Road Summary Banner (Hidden on Mobile & Tablet < 1024px for immediate vertical space) */}
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
              <Navigation2 className="w-5 h-5 rotate-45" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
              Linha da Estrada · Histórico Visual
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Cada marco na rodovia representa um abastecimento geolocalizado no odômetro do veículo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenFuelModal}
            className="min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
          >
            <Fuel className="w-4 h-4" />
            <span>+ Novo Abastecimento</span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Compact Filter Trigger Bar (< 1024px) */}
      <div className="lg:hidden flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
          <span>
            {filteredLogs.length} {filteredLogs.length === 1 ? 'parada registrada' : 'paradas registradas'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearMobileFilters}
              className="min-h-[44px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
          <button
            type="button"
            onClick={openMobileFilters}
            aria-label="Abrir filtros da estrada"
            className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
              activeFiltersCount > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-amber-500 text-neutral-950 text-xs font-bold flex items-center justify-center leading-none">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Sheet / Tablet Centered Modal Filter (< 1024px) */}
      {isMobileFiltersOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setIsMobileFiltersOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Filtros do Histórico da Estrada"
        >
          <div className="w-full md:max-w-lg max-h-[88dvh] bg-white dark:bg-[#121215] border-t md:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
            <div className="w-10 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 md:hidden shrink-0" />

            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold">Filtrar Abastecimentos</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                aria-label="Fechar filtros"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Search */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Buscar Posto ou Bandeira
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Ex: Shell, Graal, Ipiranga..."
                    value={draftSearchQuery}
                    onChange={e => setDraftSearchQuery(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-base bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Combustível */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Combustível
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'gasolina_comum', label: 'Gasolina Comum' },
                    { id: 'gasolina_aditivada', label: 'Gasolina Aditivada' },
                    { id: 'etanol', label: 'Etanol' },
                    { id: 'diesel_s10', label: 'Diesel S10' },
                    { id: 'gnv', label: 'GNV' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDraftFuelFilter(item.id)}
                      className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 text-center ${
                        draftFuelFilter === item.id
                          ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold'
                          : 'bg-zinc-50 dark:bg-[#18181B] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Perfil de Uso */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Perfil de Uso
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'Todos Perfis' },
                    { id: 'cidade', label: 'Cidade' },
                    { id: 'estrada', label: 'Estrada' },
                    { id: 'misto', label: 'Misto' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDraftProfileFilter(item.id)}
                      className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 text-center ${
                        draftProfileFilter === item.id
                          ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold'
                          : 'bg-zinc-50 dark:bg-[#18181B] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Período */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Período
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'Todo o período' },
                    { id: '30d', label: 'Últimos 30 dias' },
                    { id: '90d', label: 'Últimos 90 dias' },
                    { id: 'year', label: 'Este ano' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDraftPeriodFilter(item.id as PeriodFilter)}
                      className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 text-center ${
                        draftPeriodFilter === item.id
                          ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold'
                          : 'bg-zinc-50 dark:bg-[#18181B] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090B] flex items-center gap-3">
              <button
                type="button"
                onClick={clearMobileFilters}
                className="flex-1 min-h-[44px] rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-200 text-xs font-bold active:scale-95 transition-all"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={applyMobileFilters}
                className="flex-[2] min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold shadow-md active:scale-95 transition-all"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Road Filters Bar (Desktop >= 1024px — 100% preserved) */}
      <div className="hidden lg:flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-white/90 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 text-xs transition-colors">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 pl-1 shrink-0">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filtros:</span>
        </div>

        {/* Profile Filter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-950 p-1 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-x-auto">
          <button
            onClick={() => setProfileFilter('all')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap ${
              profileFilter === 'all'
                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            Todos Perfis
          </button>
          <button
            onClick={() => setProfileFilter('cidade')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap ${
              profileFilter === 'cidade'
                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            Cidade
          </button>
          <button
            onClick={() => setProfileFilter('estrada')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap ${
              profileFilter === 'estrada'
                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            Estrada
          </button>
        </div>

        {/* Fuel Type Filter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-950 p-1 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-x-auto">
          <button
            onClick={() => setFuelFilter('all')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap ${
              fuelFilter === 'all'
                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            Todos Combustíveis
          </button>
          <button
            onClick={() => setFuelFilter('gasolina_comum')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap ${
              fuelFilter === 'gasolina_comum'
                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            Gasolina
          </button>
          <button
            onClick={() => setFuelFilter('etanol')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 whitespace-nowrap ${
              fuelFilter === 'etanol'
                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            Etanol
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por posto, bandeira..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] pl-9 pr-3 py-2 text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* ROAD TIMELINE CONTAINER */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white/60 dark:bg-neutral-900/50 border border-slate-200 dark:border-neutral-800 rounded-2xl">
          <Navigation2 className="w-10 h-10 text-slate-400 dark:text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-neutral-200 mb-1">
            Nenhuma parada encontrada na rodovia
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto mb-4">
            Tente limpar os filtros ou registre seu próximo abastecimento para traçar a estrada.
          </p>
          <button
            onClick={onOpenFuelModal}
            className="min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl active:scale-95 transition-all"
          >
            Registrar Abastecimento
          </button>
        </div>
      ) : (
        <div className="relative py-8 px-2 sm:px-6 overflow-hidden">
          {/* THE ASPHALT ROAD TRACK (Centered on Desktop, Left-aligned on Mobile) */}
          <div className="absolute top-0 bottom-0 left-7 md:left-1/2 w-14 md:-ml-7 bg-neutral-950 border-x-2 border-neutral-700/80 shadow-2xl flex flex-col items-center justify-between overflow-hidden z-0 rounded-sm">
            {/* White shoulder side lines */}
            <div className="absolute inset-y-0 left-1 w-0.5 bg-neutral-400/50" />
            <div className="absolute inset-y-0 right-1 w-0.5 bg-neutral-400/50" />

            {/* Continuous Yellow Dashed Center Divider Line */}
            <div
              className="w-1.5 h-full"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, #F59E0B 0, #F59E0B 32px, transparent 32px, transparent 56px)',
              }}
            />
          </div>

          {/* Road Entrance / Starting Banner */}
          <div className="relative z-10 flex items-center justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 dark:bg-neutral-800 border border-slate-700 dark:border-neutral-700 text-neutral-100 text-xs font-semibold shadow-md">
              <Car className="w-4 h-4 text-amber-400" />
              <span>Sentido Viagem · {vehicle.name}</span>
            </div>
          </div>

          {/* GHOST MILESTONE: PRÓXIMA PARADA PREVISTA */}
          <div className="relative z-10 mb-8 sm:mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-14 items-center">
              {/* MILESTONE PIN ON THE ROAD (Center in desktop, left in mobile) */}
              <div className="absolute left-7 md:left-1/2 -ml-6 top-6 w-12 h-12 flex items-center justify-center z-20">
                {/* Glowing Pulsing Ring */}
                <div className="absolute -inset-1 rounded-xl bg-amber-500/30 animate-ping opacity-75" />
                {/* Ghost Milestone Post */}
                <div className="relative flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] text-amber-400 select-none">
                  <span className="text-xs font-bold tracking-tight leading-none uppercase text-amber-300">
                    PRÓX
                  </span>
                  <span className="text-xs font-extrabold font-mono-numbers leading-tight text-white">
                    {Math.floor(projection.targetOdometer / 1000)}k
                  </span>
                </div>
              </div>

              {/* Left Column (Desktop: Ghost Card on Left, Spacer on Right) */}
              <div className="ml-16 md:ml-0 md:order-1 md:text-right">
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-neutral-900/90 dark:to-neutral-900/80 border-2 border-dashed border-amber-500/50 shadow-xl backdrop-blur-sm text-left group relative overflow-hidden">
                  {/* Subtle futuristic beacon corner */}
                  <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-amber-500/20 blur-xl pointer-events-none" />

                  {/* Header: Badge & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                      <span>Próxima Parada Prevista</span>
                    </div>

                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      projection.isDue
                        ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {projection.isDue ? '⚠️ Janela Atingida' : `Em ~${projection.daysRemaining} dias`}
                    </span>
                  </div>

                  {/* Target Odometer & Projected Date */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xl sm:text-2xl font-bold font-mono-numbers text-slate-900 dark:text-neutral-100">
                        KM {projection.targetOdometer.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        (Alvo 85% seguro)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-300 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Previsão: <strong>{projection.projectedDateFormatted}</strong></span>
                      <span>·</span>
                      <span className="font-mono-numbers">~{projection.dailyKm} km/dia</span>
                    </div>
                  </div>

                  {/* Metric Chips */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-amber-500/20 text-xs">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-neutral-400 uppercase block">Restam p/ Reserva</span>
                      <span className="font-bold text-slate-800 dark:text-neutral-200 font-mono-numbers">
                        {projection.isDue ? '0 km (reabastecer)' : `~${projection.remainingKm.toLocaleString('pt-BR')} km`}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-neutral-400 uppercase block">Custo Estimado</span>
                      <span className="font-bold text-slate-800 dark:text-neutral-200 font-mono-numbers">
                        ~R$ {projection.estimatedCost.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  {/* Best station advice / action button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500 dark:text-neutral-400">
                      Volume sugerido: <strong>~{projection.estimatedLitersToFill} L</strong> de {getFuelBadgeLabel(projection.fuelTypeUsed)}
                    </div>
                    <button
                      onClick={onOpenFuelModal}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all shadow-md shrink-0"
                    >
                      <Fuel className="w-4 h-4" />
                      <span>+ Abastecer Agora</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column (Desktop spacer) */}
              <div className="hidden md:block md:order-2" />
            </div>

            {/* Projected Asphalt Dotted Connector Strip */}
            <div className="relative flex items-center justify-start md:justify-center my-6 ml-6 md:ml-0 pl-14 md:pl-0">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-950/95 border-2 border-dashed border-amber-500/60 rounded-full text-xs font-mono-numbers font-semibold text-amber-400 shadow-xl backdrop-blur-sm z-20">
                <ArrowDown className="w-3.5 h-3.5 text-amber-400 animate-bounce shrink-0" />
                <span>Trecho em curso: ~{projection.kmDrivenSinceLastLog} km · Meta: ~{projection.safeAutonomyKm} km</span>
              </div>
            </div>
          </div>

          {/* ROAD STOPS LIST */}
          <div className="space-y-12">
            {filteredLogs.map((log, index) => {
              const isEven = index % 2 === 0;
              const hasKmL = log.calculatedKmPerLiter && log.calculatedKmPerLiter > 0;
              const isAboveAvg = hasKmL && (log.calculatedKmPerLiter || 0) >= baselineAvgKmL;
              const hasDistance = log.distanceTraveled && log.distanceTraveled > 0;

              return (
                <div key={log.id} className="relative z-10">
                  {/* Distance Driven Over Asphalt (between stops) */}
                  {hasDistance && (
                    <div className="relative flex items-center justify-start md:justify-center my-4 ml-6 md:ml-0 pl-14 md:pl-0">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-950/90 border border-amber-500/40 rounded-full text-xs font-mono-numbers font-semibold text-amber-400 shadow-lg backdrop-blur-sm z-20">
                        <ArrowDown className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                        <span>+ {log.distanceTraveled} km rodados neste trecho</span>
                      </div>
                    </div>
                  )}

                  {/* STOP ROW */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-14 items-center">
                    {/* MILESTONE PIN ON THE ROAD (Center in desktop, left in mobile) */}
                    <div className="absolute left-7 md:left-1/2 -ml-6 top-6 w-12 h-12 flex items-center justify-center z-20">
                      {/* Highway Kilometer Milestone Post (Placa de Marco Rodoviário) */}
                      <div className="relative flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-emerald-700 border-2 border-white shadow-xl text-white select-none">
                        <span className="text-xs font-bold tracking-tight leading-none opacity-90 uppercase">
                          BR
                        </span>
                        <span className="text-xs font-extrabold font-mono-numbers leading-tight">
                          {Math.floor(log.odometer / 1000)}k
                        </span>
                      </div>
                    </div>

                    {/* Unified Stop Card (Single DOM node per log; alternates left/right on >= md) */}
                    <div
                      className={`ml-16 md:ml-0 ${
                        isEven ? 'md:order-1' : 'md:order-2'
                      }`}
                    >
                      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900/95 border border-slate-200 dark:border-neutral-800 shadow-xl hover:border-slate-300 dark:hover:border-neutral-700 transition-all text-left group">
                        {/* Card Top: Date & Station */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 flex-wrap">
                              <span className="font-medium text-slate-700 dark:text-neutral-300">
                                {new Date(log.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span>·</span>
                              <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono-numbers">
                                KM {log.odometer.toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-neutral-100 mt-0.5">
                              {log.stationName}
                            </h4>
                            <div className="text-xs text-slate-500 dark:text-neutral-400">
                              Bandeira {log.stationBrand} · {getProfileBadge(log.drivingProfile)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => onEditLog(log)}
                              title="Editar parada"
                              aria-label="Editar parada"
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all active:scale-95"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteLog(log.id)}
                              title="Excluir parada"
                              aria-label="Excluir parada"
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Efficiency & Full Tank State Banner */}
                        <div className="mb-3">
                          {log.isFullTank ? (
                            hasKmL ? (
                              <div
                                className={`flex items-center justify-between p-2.5 rounded-xl border ${
                                  log.isAnomaly
                                    ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800/80 text-red-900 dark:text-red-200'
                                    : isAboveAvg
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {log.isAnomaly ? (
                                    <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                                  ) : isAboveAvg ? (
                                    <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                                  )}
                                  <div>
                                    <div className="text-xs font-bold font-mono-numbers">
                                      {log.calculatedKmPerLiter} km/L
                                    </div>
                                    <div className="text-xs opacity-80">
                                      {log.isAnomaly
                                        ? 'Queda > 15% (Alerta Mecânico)'
                                        : isAboveAvg
                                        ? 'Acima da média geral'
                                        : 'Abaixo da média geral'}
                                    </div>
                                  </div>
                                </div>

                                {log.calculatedCostPerKm && (
                                  <div className="text-right">
                                    <div className="text-xs font-semibold font-mono-numbers">
                                      R$ {log.calculatedCostPerKm.toFixed(2)}/km
                                    </div>
                                    <div className="text-xs opacity-80">Custo por km</div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-2.5 bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-600 dark:text-neutral-400 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0" />
                                <span>Primeiro tanque cheio registrado (ponto de partida).</span>
                              </div>
                            )
                          ) : (
                            <div className="p-2.5 bg-amber-50 dark:bg-neutral-950/70 border border-dashed border-amber-300 dark:border-amber-600/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                              <div>
                                <div className="font-semibold">Abastecimento Parcial (Acumulando)</div>
                                <div className="text-xs text-slate-500 dark:text-neutral-400">
                                  Média exata será fechada no próximo tanque cheio.
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Financial Details Grid */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-neutral-800 text-xs font-mono-numbers">
                          <div>
                            <span className="text-xs text-slate-500 dark:text-neutral-500 block">Litros</span>
                            <span className="font-semibold text-slate-800 dark:text-neutral-200">
                              {log.liters.toFixed(2)} L
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 dark:text-neutral-500 block">Preço / L</span>
                            <span className="font-semibold text-slate-800 dark:text-neutral-200">
                              R$ {log.pricePerLiter.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 dark:text-neutral-500 block">Total</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              R$ {log.totalCost.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Fuel pill */}
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
                          <span className="font-medium text-slate-700 dark:text-neutral-300">
                            {getFuelBadgeLabel(log.fuelType)}
                          </span>
                          {log.notes && (
                            <span className="text-slate-400 dark:text-neutral-500 italic truncate max-w-[200px]">
                              "{log.notes}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop-only opposite column spacer */}
                    <div className={`hidden md:block ${isEven ? 'md:order-2' : 'md:order-1'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Road Bottom Terminus */}
          <div className="relative z-10 flex items-center justify-center mt-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 dark:bg-neutral-950 border border-slate-700 dark:border-neutral-800 text-neutral-200 text-xs shadow-md">
              <span>Fim do trecho registrado na rodovia</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
