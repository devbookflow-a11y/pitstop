import React, { useState, useMemo } from 'react';
import {
  X,
  Compass,
  MapPin,
  Fuel,
  ArrowRightLeft,
  Navigation,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Receipt,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Gauge
} from 'lucide-react';
import { Vehicle, FuelLog, RouteProfile, StartingTankLevel, TripSimulationInput } from '../types';
import { simulateTripCost } from '../utils/calculations';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface TripSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  logs: FuelLog[];
}

export const TripSimulatorModal: React.FC<TripSimulatorModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  logs,
}) => {
  // Pull last prices paid from logs for default inputs
  const latestGasolinaLog = logs
    .filter(l => l.vehicleId === vehicle.id && (l.fuelType === 'gasolina_comum' || l.fuelType === 'gasolina_aditivada'))
    .sort((a, b) => b.odometer - a.odometer)[0];

  const latestEtanolLog = logs
    .filter(l => l.vehicleId === vehicle.id && l.fuelType === 'etanol')
    .sort((a, b) => b.odometer - a.odometer)[0];

  const latestDieselLog = logs
    .filter(l => l.vehicleId === vehicle.id && l.fuelType === 'diesel_s10')
    .sort((a, b) => b.odometer - a.odometer)[0];

  // Simulation Form State
  const [distanceKm, setDistanceKm] = useState<number>(380);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('estrada');
  const [customKmL, setCustomKmL] = useState<number>(13.5);
  const [startingTankLevel, setStartingTankLevel] = useState<StartingTankLevel>('full');
  const [gasolinaPrice, setGasolinaPrice] = useState<number>(latestGasolinaLog?.pricePerLiter || 5.89);
  const [etanolPrice, setEtanolPrice] = useState<number>(latestEtanolLog?.pricePerLiter || 3.89);
  const [dieselPrice, setDieselPrice] = useState<number>(latestDieselLog?.pricePerLiter || 6.19);
  const [tollCost, setTollCost] = useState<string>('45.00');
  const [copied, setCopied] = useState(false);

  useBodyScrollLock(isOpen);

  // Quick distance presets for popular road trips
  const presets = [
    { label: 'Litoral / Praia', km: 120 },
    { label: 'Interior / Serra', km: 260 },
    { label: 'Capital ⇄ Capital', km: 450 },
    { label: 'Interestadual', km: 850 },
  ];

  const simulationInput: TripSimulationInput = useMemo(
    () => ({
      distanceKm: Math.max(1, distanceKm || 1),
      isRoundTrip,
      routeProfile,
      customKmL,
      startingTankLevel,
      gasolinaPrice: Math.max(0.01, gasolinaPrice || 5.89),
      etanolPrice: Math.max(0.01, etanolPrice || 3.89),
      dieselPrice: Math.max(0.01, dieselPrice || 6.19),
      tollCost: parseFloat(tollCost) || 0,
    }),
    [
      distanceKm,
      isRoundTrip,
      routeProfile,
      customKmL,
      startingTankLevel,
      gasolinaPrice,
      etanolPrice,
      dieselPrice,
      tollCost,
    ]
  );

  const result = useMemo(
    () => simulateTripCost(vehicle, logs, simulationInput),
    [vehicle, logs, simulationInput]
  );

  if (!isOpen) return null;

  // Build textual summary for copying & WhatsApp sharing
  const buildTripSummaryText = () => {
    const tripType = isRoundTrip ? 'Ida e Volta' : 'Só Ida';
    const profileLabel =
      routeProfile === 'estrada'
        ? 'Rodoviário Puro (Estrada)'
        : routeProfile === 'misto'
        ? 'Misto (Estrada + Urbano)'
        : `Personalizado (${customKmL} km/L)`;

    const betterFuelText =
      result.betterFuel === 'etanol'
        ? `🟢 Etanol é a opção mais econômica (Economia de R$ ${result.savingsAmount.toFixed(2)} / R$ ${result.savingsPerKm.toFixed(3)} por km)`
        : result.betterFuel === 'gasolina'
        ? `🟡 Gasolina é a opção mais econômica (Economia de R$ ${result.savingsAmount.toFixed(2)} / R$ ${result.savingsPerKm.toFixed(3)} por km)`
        : 'Diesel';

    let stopsText = result.isDepartureFuelSufficient
      ? '✅ Combustível atual no tanque suficiente para o trajeto sem paradas.'
      : `⚠️ ${result.stopsNeeded} parada(s) recomendada(s) antes de atingir reserva de 15%:\n` +
        result.stops
          .map(
            s =>
              `  • Parada #${s.stopNumber}: no km ${s.atDistanceKm} (~${s.litersToFill} L | R$ ${s.estimatedCost.toFixed(2)})`
          )
          .join('\n');

    return (
      `🚗 *Planejamento de Viagem & Rota - PitStop*\n` +
      `Veículo: ${vehicle.name} (${vehicle.plate})\n` +
      `Distância: ${result.totalDistanceKm} km (${tripType})\n` +
      `Perfil da Rota: ${profileLabel}\n\n` +
      `⛽ *Consumo & Combustível:*\n` +
      `• Consumo estimado: ${result.effectiveKmL} km/L\n` +
      `• Litros necessários: ~${result.totalLitersNeeded} L\n` +
      (result.isGasolinaAvailable ? `• Gasolina (R$ ${gasolinaPrice.toFixed(2)}/L): R$ ${result.gasolinaTotalCost.toFixed(2)} (R$ ${result.gasolinaCostPerKm.toFixed(2)}/km)\n` : '') +
      (result.isEtanolAvailable ? `• Etanol (R$ ${etanolPrice.toFixed(2)}/L): R$ ${result.etanolTotalCost.toFixed(2)} (R$ ${result.etanolCostPerKm.toFixed(2)}/km)\n` : '') +
      `${betterFuelText}\n\n` +
      `🛑 *Radar de Paradas & Autonomia:*\n` +
      `${stopsText}\n\n` +
      `💰 *Custo Total Estimado da Viagem:*\n` +
      `• Combustível: R$ ${(result.grandTotalCost - result.tollCost).toFixed(2)}\n` +
      `• Pedágios: R$ ${result.tollCost.toFixed(2)}\n` +
      `• *Total da Rota: R$ ${result.grandTotalCost.toFixed(2)} (R$ ${result.costPerKm.toFixed(2)}/km)*\n\n` +
      `_Gerado pelo PitStop Monitor_`
    );
  };

  const handleCopySummary = () => {
    const text = buildTripSummaryText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = buildTripSummaryText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden transition-colors max-h-[92dvh] flex flex-col">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-neutral-100">
                  Simulador de Viagem & Custo de Rota
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Inteligência Preditiva
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Projeção baseada na eficiência real do <strong>{vehicle.name}</strong> ({vehicle.plate})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar simulador"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-neutral-100 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-95 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* SECTION 1: ENTRADAS DA VIAGEM */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-amber-500" />
                1. Parâmetros da Rota
              </span>

              {/* Round Trip Toggle Button */}
              <button
                type="button"
                onClick={() => setIsRoundTrip(!isRoundTrip)}
                className={`flex items-center gap-2 px-3.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all border active:scale-95 ${
                  isRoundTrip
                    ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-sm'
                    : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 border-slate-300 dark:border-neutral-700 hover:border-amber-500/50'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{isRoundTrip ? 'Ida e Volta Ativada (2x km)' : 'Apenas Ida'}</span>
              </button>
            </div>

            {/* Distance Input & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Distância do Trecho {isRoundTrip ? '(por sentido)' : ''}
                </label>
                <span className="text-xs font-mono-numbers font-bold text-amber-600 dark:text-amber-400">
                  Total da Rota: {result.totalDistanceKm} km
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={distanceKm}
                  onChange={e => setDistanceKm(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 pr-10 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers font-bold focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-neutral-500 font-mono pointer-events-none">
                  km
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                {presets.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setDistanceKm(p.km)}
                    className={`px-3 min-h-[44px] rounded-xl text-xs font-medium transition-all active:scale-95 ${
                      distanceKm === p.km
                        ? 'bg-slate-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-bold'
                        : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800 hover:border-slate-400'
                    }`}
                  >
                    {p.label} ({p.km} km)
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-neutral-300 block">
                Perfil de Eficiência da Estrada
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'estrada',
                    title: '🛣️ Rodoviário Puro',
                    desc: 'Fluidez em rodovia asfaltada',
                  },
                  {
                    id: 'misto',
                    title: '⚖️ Misto (70/30)',
                    desc: 'Estrada + trechos urbanos',
                  },
                  {
                    id: 'personalizado',
                    title: '⚙️ Personalizado',
                    desc: 'Informar km/L manual',
                  },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRouteProfile(item.id as RouteProfile)}
                    className={`p-3 min-h-[44px] rounded-xl text-left transition-all border active:scale-95 ${
                      routeProfile === item.id
                        ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-neutral-100 mb-0.5">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>

              {routeProfile === 'personalizado' && (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <label className="text-xs text-slate-600 dark:text-neutral-400 whitespace-nowrap">
                    Média esperada do veículo:
                  </label>
                  <div className="relative w-36">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={customKmL}
                      onChange={e => setCustomKmL(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 pr-12 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono pointer-events-none">
                      km/L
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Starting Tank Level */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Nível Atual do Tanque na Partida
                </label>
                <span className="text-xs font-mono-numbers text-slate-500 dark:text-neutral-400">
                  {result.departureLiters} L / {vehicle.tankCapacityLiters} L (~{result.departureAutonomyKm} km)
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                {[
                  { id: 'full', label: 'Cheio', pct: '100%' },
                  { id: 'three_quarters', label: '3/4', pct: '75%' },
                  { id: 'half', label: '1/2', pct: '50%' },
                  { id: 'one_quarter', label: '1/4', pct: '25%' },
                  { id: 'reserve', label: 'Reserva', pct: '~12%' },
                ].map(level => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setStartingTankLevel(level.id as StartingTankLevel)}
                    className={`py-2 px-1 min-h-[44px] rounded-xl text-xs font-semibold transition-all border active:scale-95 ${
                      startingTankLevel === level.id
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-sm'
                        : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-800 hover:border-slate-300'
                    }`}
                  >
                    <div>{level.label}</div>
                    <div className="text-xs opacity-75 font-mono">{level.pct}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fuel Prices & Tolls Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Gasolina na Estrada (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={gasolinaPrice}
                  onChange={e => setGasolinaPrice(Number(e.target.value))}
                  className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Etanol na Estrada (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={etanolPrice}
                  onChange={e => setEtanolPrice(Number(e.target.value))}
                  className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Gastos com Pedágios (R$)
                </label>
                <input
                  type="number"
                  step="0.50"
                  placeholder="0.00"
                  value={tollCost}
                  onChange={e => setTollCost(e.target.value)}
                  className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PAINEL DE RESULTADOS EM TEMPO REAL */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                2. Balanço Executivo da Viagem
              </span>
              <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                Consumo: ~{result.effectiveKmL} km/L
              </span>
            </div>

            {/* Primary KPI Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Grand Total */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500/40 dark:border-amber-500/30">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block mb-1">
                  Custo Total Previsto
                </span>
                <div className="flex items-baseline gap-1 font-mono-numbers">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100">
                    R$ {result.grandTotalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                  Combustível + R$ {result.tollCost.toFixed(2)} pedágio
                </div>
              </div>

              {/* Cost Per Km */}
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 block mb-1">
                  Custo por Km Rodado
                </span>
                <div className="flex items-baseline gap-1 font-mono-numbers">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100">
                    R$ {result.costPerKm.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-neutral-400">/km</span>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                  Baseado em {result.totalDistanceKm} km
                </div>
              </div>

              {/* Volume Needed */}
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 block mb-1">
                  Volume de Combustível
                </span>
                <div className="flex items-baseline gap-1 font-mono-numbers">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100">
                    ~{result.totalLitersNeeded}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-neutral-400">Litros</span>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                  Tanque do carro: {vehicle.tankCapacityLiters} L
                </div>
              </div>
            </div>

            {/* SIDE-BY-SIDE: GASOLINA VS ETANOL */}
            {result.isGasolinaAvailable && result.isEtanolAvailable && (
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-amber-500" />
                    Comparativo na Rota: Gasolina vs. Etanol
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {result.betterFuel === 'etanol' ? '🌱 Etanol Vence' : '⛽ Gasolina Vence'} (Economia: R$ {result.savingsAmount.toFixed(2)})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Gasolina Card */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      result.betterFuel === 'gasolina'
                        ? 'bg-amber-500/10 border-amber-500 text-slate-900 dark:text-neutral-100 shadow-sm'
                        : 'bg-slate-50 dark:bg-neutral-950/60 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold flex flex-wrap items-center gap-1.5">
                        <span>Gasolina</span>
                        {result.betterFuel === 'gasolina' && (
                          <span className="px-1.5 py-0.5 bg-amber-500 text-neutral-950 font-black rounded text-xs">
                            MAIS ECONÔMICA
                          </span>
                        )}
                      </span>
                      <span className="font-mono-numbers font-semibold">
                        {result.gasolinaKmL} km/L
                      </span>
                    </div>
                    <div className="text-lg font-black font-mono-numbers text-slate-900 dark:text-neutral-100">
                      R$ {result.gasolinaTotalCost.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers mt-0.5">
                      {result.gasolinaLitersNeeded} L necessários · R$ {result.gasolinaCostPerKm.toFixed(2)}/km
                    </div>
                  </div>

                  {/* Etanol Card */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      result.betterFuel === 'etanol'
                        ? 'bg-emerald-500/10 border-emerald-500 text-slate-900 dark:text-neutral-100 shadow-sm'
                        : 'bg-slate-50 dark:bg-neutral-950/60 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold flex flex-wrap items-center gap-1.5">
                        <span>Etanol</span>
                        {result.betterFuel === 'etanol' && (
                          <span className="px-1.5 py-0.5 bg-emerald-500 text-neutral-950 font-black rounded text-xs">
                            MAIS ECONÔMICO
                          </span>
                        )}
                      </span>
                      <span className="font-mono-numbers font-semibold">
                        {result.etanolKmL} km/L
                      </span>
                    </div>
                    <div className="text-lg font-black font-mono-numbers text-slate-900 dark:text-neutral-100">
                      R$ {result.etanolTotalCost.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers mt-0.5">
                      {result.etanolLitersNeeded} L necessários · R$ {result.etanolCostPerKm.toFixed(2)}/km
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: RADAR DE PARADAS E AUTONOMIA */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-500" />
                  Planejamento de Paradas & Autonomia Segura
                </span>
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  Margem de Reserva: 15% ({Math.round(vehicle.tankCapacityLiters * 0.15)} L)
                </span>
              </div>

              {result.isDepartureFuelSufficient ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <strong>Chegada Direta Garantida:</strong> O combustível atual no tanque ({result.departureLiters} L) rende ~{result.departureAutonomyKm} km, suficiente para cobrir os {result.totalDistanceKm} km da rota com reserva preservada.
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      Recomendado realizar <strong>{result.stopsNeeded} parada(s)</strong> de reabastecimento para não entrar na reserva do tanque.
                    </span>
                  </div>

                  {/* List of stops */}
                  <div className="space-y-2">
                    {result.stops.map(stop => (
                      <div
                        key={stop.stopNumber}
                        className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center font-mono-numbers shrink-0">
                            #{stop.stopNumber}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-neutral-100 flex flex-wrap items-center gap-2">
                              <span>Parada no km {stop.atDistanceKm}</span>
                              <span className="text-xs text-slate-400 font-mono">
                                (Hodômetro alvo: {stop.recommendedOdometer.toLocaleString('pt-BR')} km)
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-neutral-400">
                              {stop.tip}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono-numbers font-bold text-slate-900 dark:text-neutral-100 block">
                            +{stop.litersToFill} L · R$ {stop.estimatedCost.toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400">
                            Previsão de abastecimento
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Valores calculados em tempo real prontos para exportação.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 min-h-[44px] text-xs font-semibold bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 rounded-xl transition-all shadow-sm active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Roteiro</span>
                </>
              )}
            </button>

            {/* Share WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 min-h-[44px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
