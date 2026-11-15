import React, { useState } from 'react';
import {
  FuelLog,
  Vehicle,
  GasStation,
} from '../types';
import {
  calculateSmartFlex,
  calculateStationRankings,
} from '../utils/calculations';
import {
  Scale,
  Award,
  TrendingUp,
  Fuel,
  Info,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Compass,
  MapPin
} from 'lucide-react';
import { TripSimulatorModal } from './TripSimulatorModal';

interface FlexAndStationsViewProps {
  logs: FuelLog[];
  vehicle: Vehicle;
  stations?: GasStation[];
}

export const FlexAndStationsView: React.FC<FlexAndStationsViewProps> = ({
  logs,
  vehicle,
  stations = [],
}) => {
  // Flex calculator prices state (default reasonable brazilian pump prices)
  const [etanolPrice, setEtanolPrice] = useState<number>(3.89);
  const [gasolinaPrice, setGasolinaPrice] = useState<number>(5.89);
  const [isTripSimulatorOpen, setIsTripSimulatorOpen] = useState(false);

  const flexResult = calculateSmartFlex(logs, vehicle, etanolPrice, gasolinaPrice);
  const rankedStations = calculateStationRankings(logs);

  const isEtanolBetter = flexResult.recommendedFuel === 'etanol';

  const getRatingBadge = (rating: 'excelente' | 'bom' | 'regular' | 'ruim') => {
    switch (rating) {
      case 'excelente':
        return {
          text: 'Excelente',
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
        };
      case 'bom':
        return {
          text: 'Bom',
          bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-300 dark:border-blue-800',
        };
      case 'regular':
        return {
          text: 'Regular',
          bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-800',
        };
      case 'ruim':
        return {
          text: 'Baixo Rendimento',
          bg: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-300 dark:border-red-800',
        };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SECTION 1: CALCULADORA FLEX INTELIGENTE */}
      <div className="flex flex-col gap-4">
        {/* Banner (order-2 on mobile & tablet below pump prices; order-1 on desktop lg+) */}
        <div className="order-2 lg:order-1 flex flex-col sm:flex-row sm:items-center justify-between md:grid md:grid-cols-2 md:items-center md:gap-4 lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-3 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                <Scale className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
                Calculadora Flex Inteligente (Histórico Real)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
              Ao invés da regra genérica dos 70%, o cálculo utiliza o <strong>rendimento real do {vehicle.name}</strong> para apontar a opção mais econômica na bomba.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:grid md:grid-cols-2 md:gap-3 md:items-stretch lg:flex lg:flex-wrap lg:items-center lg:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsTripSimulatorOpen(true)}
              className="min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Simulador de Viagem</span>
            </button>
            <div className="min-h-[44px] flex items-center justify-center md:flex-col md:text-center lg:flex-row lg:text-left gap-x-2 gap-y-0.5 text-xs font-mono-numbers px-3 py-2 bg-slate-100 dark:bg-neutral-950 rounded-xl border border-slate-200 dark:border-neutral-800">
              <span className="text-slate-500 dark:text-neutral-400">Paridade Real:</span>
              <div className="flex items-center gap-1.5">
                <strong className="text-amber-600 dark:text-amber-400">
                  {(flexResult.carRealRatio * 100).toFixed(1)}%
                </strong>
                <span className="text-slate-400 dark:text-neutral-500">(vs 70% padrão)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Comparison Card (order-1 on mobile & tablet; order-2 on desktop lg+) */}
        <div className="order-1 lg:order-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-5 lg:gap-6 p-5 sm:p-6 md:p-5 lg:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xl transition-colors">
          {/* Left: Interactive Pump Inputs */}
          <div className="md:col-span-1 lg:col-span-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
              Preços Atuais na Bomba
            </h3>

            {/* Etanol Input */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5" />
                  Etanol (R$ / Litro)
                </label>
                <span className="text-xs font-bold font-mono-numbers text-slate-900 dark:text-neutral-100">
                  R$ {etanolPrice.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="2.50"
                max="6.00"
                step="0.01"
                value={etanolPrice}
                onChange={e => setEtanolPrice(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setEtanolPrice((prev: number) => Math.max(2.0, Number((prev - 0.10).toFixed(2))))}
                  className="min-h-[44px] min-w-[60px] px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-mono-numbers font-semibold active:scale-95 transition-all"
                >
                  -0,10
                </button>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={etanolPrice}
                    onChange={e => setEtanolPrice(parseFloat(e.target.value) || 0)}
                    className="w-24 min-h-[44px] px-2 py-1.5 text-center text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setEtanolPrice((prev: number) => Math.min(8.0, Number((prev + 0.10).toFixed(2))))}
                  className="min-h-[44px] min-w-[60px] px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-mono-numbers font-semibold active:scale-95 transition-all"
                >
                  +0,10
                </button>
              </div>
            </div>

            {/* Gasolina Input */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5" />
                  Gasolina (R$ / Litro)
                </label>
                <span className="text-xs font-bold font-mono-numbers text-slate-900 dark:text-neutral-100">
                  R$ {gasolinaPrice.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="4.00"
                max="8.00"
                step="0.01"
                value={gasolinaPrice}
                onChange={e => setGasolinaPrice(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setGasolinaPrice((prev: number) => Math.max(3.0, Number((prev - 0.10).toFixed(2))))}
                  className="min-h-[44px] min-w-[60px] px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-mono-numbers font-semibold active:scale-95 transition-all"
                >
                  -0,10
                </button>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={gasolinaPrice}
                    onChange={e => setGasolinaPrice(parseFloat(e.target.value) || 0)}
                    className="w-24 min-h-[44px] px-2 py-1.5 text-center text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setGasolinaPrice((prev: number) => Math.min(10.0, Number((prev + 0.10).toFixed(2))))}
                  className="min-h-[44px] min-w-[60px] px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-mono-numbers font-semibold active:scale-95 transition-all"
                >
                  +0,10
                </button>
              </div>
            </div>

            {/* Car Historical Averages info */}
            <div className="p-3 bg-slate-100/70 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs space-y-1.5">
              <div className="text-slate-600 dark:text-neutral-400 font-medium">Médias Históricas deste Veículo:</div>
              <div className="flex items-center justify-between font-mono-numbers text-slate-900 dark:text-neutral-200">
                <span>Etanol: <strong>{flexResult.carAvgEtanol} km/L</strong></span>
                <span>Gasolina: <strong>{flexResult.carAvgGasolina} km/L</strong></span>
              </div>
              <div className="text-xs text-slate-500 dark:text-neutral-400">
                {flexResult.hasSufficientData
                  ? 'Calculado com abastecimentos reais registrados no seu histórico.'
                  : 'Valores estimados de referência. Adicione abastecimentos de ambos combustíveis para afinar.'}
              </div>
            </div>
          </div>

          {/* Right: Recommendation & Financial Savings */}
          <div className="md:col-span-1 lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* The Big Verdict Badge */}
            <div
              className={`p-5 rounded-2xl border-2 transition-all shadow-lg ${
                isEtanolBetter
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/70 text-emerald-900 dark:text-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-500/70 text-amber-900 dark:text-amber-100'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs uppercase tracking-wider font-bold opacity-80">
                    Veredito Econômico
                  </span>
                  <h4 className="text-xl sm:text-2xl md:text-lg lg:text-2xl font-extrabold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 shrink-0" />
                    <span>
                      {isEtanolBetter ? 'ABASTEÇA COM ETANOL' : 'ABASTEÇA COM GASOLINA'}
                    </span>
                  </h4>
                </div>

                <div className="md:text-left lg:text-right text-right shrink-0">
                  <span className="text-xs block opacity-80">Economia/Tanque</span>
                  <span className="text-xl font-black font-mono-numbers">
                    R$ {flexResult.savingsPerTank.toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-xs opacity-90 leading-relaxed">
                {isEtanolBetter
                  ? `Com o Etanol a R$ ${etanolPrice.toFixed(2)}, você gasta R$ ${flexResult.etanolCostPerKm.toFixed(2)} por km rodado contra R$ ${flexResult.gasolinaCostPerKm.toFixed(2)} na Gasolina.`
                  : `Com a Gasolina a R$ ${gasolinaPrice.toFixed(2)}, você gasta R$ ${flexResult.gasolinaCostPerKm.toFixed(2)} por km rodado contra R$ ${flexResult.etanolCostPerKm.toFixed(2)} no Etanol.`}
              </p>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 dark:text-neutral-400 block">Custo/km Etanol</span>
                <span className="text-base font-bold font-mono-numbers text-emerald-600 dark:text-emerald-400">
                  R$ {flexResult.etanolCostPerKm.toFixed(3)}
                </span>
                <span className="text-xs text-slate-400 dark:text-neutral-400 block">por quilômetro</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 dark:text-neutral-400 block">Custo/km Gasolina</span>
                <span className="text-base font-bold font-mono-numbers text-amber-600 dark:text-amber-400">
                  R$ {flexResult.gasolinaCostPerKm.toFixed(3)}
                </span>
                <span className="text-xs text-slate-400 dark:text-neutral-400 block">por quilômetro</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-1 col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-1">
                <span className="text-xs text-slate-500 dark:text-neutral-400 block">Preço Limite Etanol</span>
                <span className="text-base font-bold font-mono-numbers text-slate-800 dark:text-neutral-200">
                  R$ {flexResult.breakEvenEtanolPrice.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 dark:text-neutral-400 block">ponto de empate</span>
              </div>
            </div>

            {/* Financial Analysis Note */}
            <div className="p-3.5 bg-slate-100/80 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 rounded-xl flex items-center gap-3 text-xs text-slate-600 dark:text-neutral-400">
              <Info className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Tanque de <strong>{vehicle.tankCapacityLiters} Litros</strong>: O Etanol vale a pena neste carro até <strong>R$ {flexResult.breakEvenEtanolPrice.toFixed(2)}</strong> com a gasolina a R$ {gasolinaPrice.toFixed(2)}.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: RANKING DE POSTOS E RENDIMENTO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm transition-colors">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Award className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                Ranking de Rendimento por Posto
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Classificação baseada na eficiência real obtida em cada estabelecimento.
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-neutral-500 font-mono-numbers">
            {rankedStations.length} postos analisados
          </span>
        </div>

        {/* Stations Table / Cards */}
        {rankedStations.length === 0 ? (
          <div className="p-8 text-center bg-white/60 dark:bg-neutral-900/50 border border-slate-200 dark:border-neutral-800 rounded-2xl text-xs text-slate-500 dark:text-neutral-400">
            Nenhum posto com medição de consumo completo ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm transition-colors">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-neutral-950/80 text-slate-500 dark:text-neutral-400 uppercase text-xs tracking-wider border-b border-slate-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Posição</th>
                  <th className="py-3 px-4">Posto / Bandeira</th>
                  <th className="py-3 px-4 text-center">Visitas</th>
                  <th className="py-3 px-4 text-right">Média (km/L)</th>
                  <th className="py-3 px-4 text-right">Custo / km</th>
                  <th className="py-3 px-4 text-center">Avaliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-800 dark:text-neutral-200">
                {rankedStations.map((st, idx) => {
                  const badge = getRatingBadge(st.efficiencyRating);
                  const matchStation = stations.find(
                    s => s.name.trim().toLowerCase() === st.stationName.trim().toLowerCase()
                  );

                  return (
                    <tr key={`${st.stationName}-${st.stationBrand}`} className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono-numbers font-bold text-slate-400 dark:text-neutral-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-neutral-100">{st.stationName}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                          <span>Bandeira {st.stationBrand}</span>
                          {matchStation?.latitude !== undefined && matchStation?.longitude !== undefined && (
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <MapPin className="w-3 h-3" />
                              <span>GPS: {matchStation.latitude.toFixed(2)}, {matchStation.longitude.toFixed(2)}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-numbers">
                        {st.visitCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers font-bold text-amber-600 dark:text-amber-400 text-sm">
                        {st.avgKmPerLiter > 0 ? `${st.avgKmPerLiter} km/L` : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-numbers text-slate-700 dark:text-neutral-300">
                        {st.avgCostPerKm > 0 ? `R$ ${st.avgCostPerKm.toFixed(2)}` : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
                          {badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
