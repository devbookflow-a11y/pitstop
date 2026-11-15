import React, { useState, useMemo } from 'react';
import { FuelLog, Vehicle, FuelType, ProjectionMode, TireCalibrationLog } from '../types';
import { calculateRefuelProjection, calculateTireCalibrationStatus } from '../utils/calculations';
import {
  Compass,
  Calendar,
  Gauge,
  DollarSign,
  Fuel,
  Sparkles,
  Sliders,
  Check,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
  Clock,
  Navigation,
  History,
  ShieldCheck,
  Disc,
  AlertCircle,
  CheckCircle2,
  CheckCheck
} from 'lucide-react';

interface RefuelRadarCardProps {
  logs: FuelLog[];
  vehicle: Vehicle;
  tireCalibrations?: TireCalibrationLog[];
  onOpenFuelModal?: () => void;
  onUpdateVehicleOdometer?: (newOdometer: number) => void;
  onQuickCalibrateTires?: (notes?: string) => void;
  onViewTireHistory?: () => void;
}

export const RefuelRadarCard: React.FC<RefuelRadarCardProps> = ({
  logs,
  vehicle,
  tireCalibrations = [],
  onOpenFuelModal,
  onUpdateVehicleOdometer,
  onQuickCalibrateTires,
  onViewTireHistory,
}) => {
  // Mode: 'habito_real' (driver's empirical frequency) or 'limite_tanque' (technical 15% reserve)
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('habito_real');

  // Simulator states
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simOdometer, setSimOdometer] = useState<number>(vehicle.currentOdometer);
  const [simFuelType, setSimFuelType] = useState<FuelType | undefined>(undefined);
  const [justSavedOdometer, setJustSavedOdometer] = useState(false);
  const [calibratedFeedback, setCalibratedFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calculate tire calibration status
  const tireStatus = useMemo(() => {
    return calculateTireCalibrationStatus(tireCalibrations, logs, vehicle);
  }, [tireCalibrations, logs, vehicle]);

  // Keep simOdometer synced when vehicle changes if not actively editing
  React.useEffect(() => {
    setSimOdometer(vehicle.currentOdometer);
    setSimFuelType(undefined);
  }, [vehicle.id, vehicle.currentOdometer]);

  // Calculate projection with simulator overrides and chosen mode
  const projection = useMemo(() => {
    return calculateRefuelProjection(logs, vehicle, simOdometer, simFuelType, projectionMode);
  }, [logs, vehicle, simOdometer, simFuelType, projectionMode]);

  const hasSimulationOverrides =
    simOdometer !== vehicle.currentOdometer || simFuelType !== undefined || projectionMode !== 'habito_real';

  const handleResetSimulator = () => {
    setSimOdometer(vehicle.currentOdometer);
    setSimFuelType(undefined);
    setProjectionMode('habito_real');
  };

  const handleQuickCalibrate = () => {
    if (onQuickCalibrateTires) {
      onQuickCalibrateTires('Calibragem rápida confirmada no Radar');
      setCalibratedFeedback(true);
      setToastMessage(`Pneus calibrados com sucesso (${tireStatus.frontPsi} / ${tireStatus.rearPsi} PSI)!`);
      setTimeout(() => {
        setCalibratedFeedback(false);
      }, 2500);
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    }
  };

  const handleSaveOdometerToVehicle = () => {
    if (onUpdateVehicleOdometer && simOdometer >= vehicle.initialOdometer) {
      onUpdateVehicleOdometer(simOdometer);
      setJustSavedOdometer(true);
      setTimeout(() => setJustSavedOdometer(false), 2500);
    }
  };

  const fuelLabels: Record<FuelType, string> = {
    gasolina_comum: 'Gasolina Comum',
    gasolina_aditivada: 'Gasolina Aditivada',
    etanol: 'Etanol',
    diesel_s10: 'Diesel S10',
    gnv: 'GNV',
  };

  // Color scheme based on urgency
  const statusStyles = {
    normal: {
      badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      barColor: 'from-emerald-500 to-teal-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'Tanque Seguro',
      icon: Navigation,
    },
    warning: {
      badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
      barColor: 'from-amber-500 to-orange-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      label: 'Planejar Parada',
      icon: Clock,
    },
    urgent: {
      badgeBg: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse',
      barColor: 'from-orange-500 to-red-600',
      textColor: 'text-red-600 dark:text-red-400',
      label: 'Reserva Iminente',
      icon: AlertTriangle,
    },
  }[projection.progressLevel];

  const StatusIcon = statusStyles.icon;

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm relative overflow-hidden transition-all">
      {/* Background ambient cockpit glow */}
      <div
        className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors ${
          projection.progressLevel === 'urgent'
            ? 'bg-red-500'
            : projection.progressLevel === 'warning'
            ? 'bg-amber-500'
            : 'bg-emerald-500'
        }`}
      />

      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-neutral-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-500 dark:text-amber-400">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                  Radar de Próximo Abastecimento
                </h3>
                {hasSimulationOverrides && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                    Simulação Ativa
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {projection.projectionMode === 'habito_real' && projection.historicalAvgDaysBetweenFills
                  ? `Baseado no seu ritmo real de abastecer a cada ~${projection.historicalAvgDaysBetweenFills} dias (~${projection.historicalAvgKmBetweenFills} km)`
                  : `Calculado sobre a autonomia segura de 15% de reserva a ~${projection.dailyKm} km/dia`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Mode Selector Toggle: Hábito Real vs Limite Tanque */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => setProjectionMode('habito_real')}
                title="Calcula a previsão baseado na média de dias e quilômetros que você realmente costuma demorar entre cada ida ao posto"
                className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95 ${
                  projectionMode === 'habito_real'
                    ? 'bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Hábito Real</span>
              </button>
              <button
                type="button"
                onClick={() => setProjectionMode('limite_tanque')}
                title="Calcula a previsão baseado na capacidade total do tanque até a reserva técnica preventiva de 15%"
                className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95 ${
                  projectionMode === 'limite_tanque'
                    ? 'bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Limite Tanque</span>
              </button>
            </div>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusStyles.badgeBg}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusStyles.label}</span>
            </span>

            {/* Simulator Toggle Button */}
            <button
              onClick={() => setIsSimulatorOpen(prev => !prev)}
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                isSimulatorOpen || hasSimulationOverrides
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
                  : 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simular</span>
              {isSimulatorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

      {/* Historical Telemetry Breakdown Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-3 p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/40 border border-slate-200/80 dark:border-neutral-800 text-xs text-slate-600 dark:text-neutral-300 relative z-10">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>
            Último abastecimento:{' '}
            <strong>
              {projection.lastLogDate
                ? `há ${projection.daysSinceLastLog} dias (${new Date(projection.lastLogDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`
                : 'Nenhum'}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            Seu ciclo habitual:{' '}
            <strong>
              {projection.historicalAvgDaysBetweenFills
                ? `a cada ~${projection.historicalAvgDaysBetweenFills} dias (~${projection.historicalAvgKmBetweenFills} km)`
                : `~${projection.dailyKm} km/dia`}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            Ritmo de rodagem:{' '}
            <strong className="font-mono-numbers">~{projection.dailyKm} km/dia</strong>
          </span>
        </div>
      </div>

      {/* Simulator Drawer / Controls (collapsible) */}
      {isSimulatorOpen && (
        <div className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700/80 animate-fade-in relative z-10">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-neutral-200">
              <Sliders className="w-4 h-4 text-purple-500" />
              <span>Simulador em Tempo Real de Hodômetro e Combustível</span>
            </div>
            {hasSimulationOverrides && (
              <button
                onClick={handleResetSimulator}
                className="min-h-[40px] px-2 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Valores Reais</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Input Hodômetro Atual */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-neutral-300 flex items-center justify-between gap-2">
                <span>Hodômetro Atual (km)</span>
                <span className="text-xs text-slate-400 font-mono-numbers">
                  Último: {projection.lastLogOdometer.toLocaleString('pt-BR')}
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={projection.lastLogOdometer}
                  value={simOdometer}
                  onChange={e => setSimOdometer(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm font-mono-numbers rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {onUpdateVehicleOdometer && (
                  <button
                    onClick={handleSaveOdometerToVehicle}
                    title="Salvar este hodômetro no cadastro do veículo"
                    disabled={justSavedOdometer}
                    className={`min-h-[44px] flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl shrink-0 transition-all active:scale-95 ${
                      justSavedOdometer
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-white dark:bg-neutral-700 dark:text-neutral-100 hover:bg-slate-800'
                    }`}
                  >
                    {justSavedOdometer ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Salvo</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Select Combustível */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-neutral-300">
                Combustível Pretendido
              </label>
              <select
                value={projection.fuelTypeUsed}
                onChange={e => setSimFuelType(e.target.value as FuelType)}
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {vehicle.acceptedFuels.map(f => (
                  <option key={f} value={f}>
                    {fuelLabels[f]}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Mileage Presets */}
            <div className="space-y-1 col-span-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-slate-600 dark:text-neutral-300">
                Simular Quilometragem Percorrida
              </label>
              <div className="flex items-center gap-1.5">
                {[50, 150, 300].map(addKm => (
                  <button
                    key={addKm}
                    type="button"
                    onClick={() => setSimOdometer(projection.lastLogOdometer + addKm)}
                    className="flex-1 min-h-[44px] px-2.5 py-2 text-xs font-semibold font-mono-numbers rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:border-amber-500 active:scale-95 transition-all"
                  >
                    +{addKm} km
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Fuel Range Gauge / Progress Bar */}
      <div className="my-5 relative z-10">
        <div className="flex items-center justify-between gap-2 text-xs mb-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-neutral-200">
            <span>Consumo da Autonomia Segura</span>
            <span className={`font-mono-numbers font-bold ${statusStyles.textColor}`}>
              ({projection.progressPct}%)
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-neutral-400">
            {projection.isDue ? (
              <span className="font-bold text-red-600 dark:text-red-400">
                ⚠️ Janela de reabastecimento atingida
              </span>
            ) : (
              <span>
                Restam <strong className="text-slate-800 dark:text-neutral-200">{projection.remainingKm} km</strong> até o ponto ideal
              </span>
            )}
          </div>
        </div>

        {/* The Track with safe zone marker */}
        <div className="h-4 w-full bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5 relative border border-slate-200/80 dark:border-neutral-700/80">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${statusStyles.barColor} transition-all duration-500 relative`}
            style={{ width: `${Math.min(100, Math.max(4, projection.progressPct))}%` }}
          >
            {/* Glossy highlight line */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-full" />
          </div>
        </div>

        {/* Milestone Tick Marks below gauge */}
        <div className="flex items-center justify-between mt-2 text-xs font-mono-numbers text-slate-500 dark:text-neutral-400 gap-2">
          <div className="flex flex-col items-start">
            <span className="text-xs text-slate-400 uppercase">Último</span>
            <span className="font-bold text-slate-700 dark:text-neutral-300">
              {projection.lastLogOdometer.toLocaleString('pt-BR')} km
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-xs text-slate-400 uppercase">Trecho</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              +{projection.kmDrivenSinceLastLog.toLocaleString('pt-BR')} km
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 uppercase">Alvo (85%)</span>
            <span className="font-bold text-slate-700 dark:text-neutral-300">
              {projection.targetOdometer.toLocaleString('pt-BR')} km
            </span>
          </div>
        </div>
      </div>

      {/* 3 Core Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 relative z-10">
        {/* Metric 1: Data Estimada */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700/70 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 mb-1.5">
            <span className="text-xs font-semibold">Data Prevista</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-neutral-100 font-mono-numbers truncate">
            {projection.projectedDateFormatted}
          </div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1 flex items-center justify-between gap-2">
            <span>
              {projection.isDue
                ? 'Hoje / Imediato'
                : `Em ~${projection.daysRemaining} ${projection.daysRemaining === 1 ? 'dia' : 'dias'}`}
            </span>
            <span className="font-medium shrink-0">
              ~{projection.dailyKm} km/dia
            </span>
          </div>
        </div>

        {/* Metric 2: Hodômetro Alvo */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700/70 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 mb-1.5">
            <span className="text-xs font-semibold">Hodômetro Alvo</span>
            <Gauge className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-neutral-100 font-mono-numbers">
            {projection.targetOdometer.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">km</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1 flex items-center justify-between gap-2">
            <span>
              {projection.isDue ? 'Reserva alcançada' : `Restam ~${projection.remainingKm} km`}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
              {projection.avgKmL} km/L
            </span>
          </div>
        </div>

        {/* Metric 3: Custo Estimado */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700/70 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 mb-1.5">
            <span className="text-xs font-semibold">Custo Estimado</span>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-neutral-100 font-mono-numbers">
            R$ {projection.estimatedCost.toFixed(2).replace('.', ',')}
          </div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1 flex items-center justify-between gap-2">
            <span className="truncate">~{projection.estimatedLitersToFill} L {fuelLabels[projection.fuelTypeUsed]}</span>
            <span className="font-mono-numbers shrink-0">R$ {projection.estimatedPricePerLiter.toFixed(2)}/L</span>
          </div>
        </div>
      </div>

      {/* TOAST CONFIRMATION BANNER */}
      {toastMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in relative z-10">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-xs text-emerald-600/80 font-mono-numbers shrink-0">Resetado</span>
        </div>
      )}

      {/* TIRE CALIBRATION TELEMETRY STRIP (MONITORAMENTO INTELIGENTE DE PNEUS) */}
      <div
        className={`p-3.5 rounded-xl border my-4 relative z-10 transition-colors ${
          tireStatus.status === 'urgent'
            ? 'bg-red-500/10 dark:bg-red-950/30 border-red-500/40 shadow-sm'
            : tireStatus.status === 'warning'
            ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/40 shadow-sm'
            : 'bg-slate-50/90 dark:bg-neutral-800/60 border-slate-200 dark:border-neutral-700/80'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Icon, Title, Status & Target Pressure Pills */}
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                tireStatus.status === 'urgent'
                  ? 'bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse'
                  : tireStatus.status === 'warning'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <Disc className="w-4 h-4" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-neutral-100">
                  Calibragem dos Pneus
                </span>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    tireStatus.status === 'urgent'
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse'
                      : tireStatus.status === 'warning'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {tireStatus.status === 'urgent' ? (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  ) : tireStatus.status === 'warning' ? (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{tireStatus.badgeText}</span>
                </span>
              </div>

              {/* Explanatory Counter */}
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {tireStatus.explanationText}
              </p>

              {/* Recommended Pressures */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-xs font-mono-numbers font-bold text-slate-700 dark:text-neutral-300">
                  <span className="text-slate-400 uppercase text-xs">Frente:</span>
                  <span>{tireStatus.frontPsi} PSI</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-xs font-mono-numbers font-bold text-slate-700 dark:text-neutral-300">
                  <span className="text-slate-400 uppercase text-xs">Traseira:</span>
                  <span>{tireStatus.rearPsi} PSI</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action "Calibrei Hoje" + "Ver histórico" */}
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
            {onViewTireHistory && (
              <button
                type="button"
                onClick={onViewTireHistory}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/80 dark:hover:bg-neutral-900/80 transition-all active:scale-95"
              >
                <History className="w-4 h-4 shrink-0" />
                <span>Ver histórico</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleQuickCalibrate}
              disabled={calibratedFeedback}
              title="Registra a data de hoje como última calibragem realizada para este veículo"
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                calibratedFeedback
                  ? 'bg-emerald-600 text-white'
                  : tireStatus.status === 'urgent'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                  : tireStatus.status === 'warning'
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold'
                  : 'bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 hover:border-emerald-500'
              }`}
            >
              {calibratedFeedback ? (
                <>
                  <CheckCheck className="w-4 h-4" />
                  <span>Calibrado!</span>
                </>
              ) : (
                <>
                  <Disc className="w-4 h-4" />
                  <span>Calibrei Hoje</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Best Station Tip & Footer */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800 relative z-10">
        {projection.bestStationTip ? (
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-300">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="line-clamp-1">{projection.bestStationTip.tipMessage}</p>
          </div>
        ) : (
          <div className="text-xs text-slate-500 dark:text-neutral-400">
            💡 Cadastre abastecimentos regulares para calibrar a taxa de consumo com precisão máxima.
          </div>
        )}
      </div>
    </div>
  );
};
