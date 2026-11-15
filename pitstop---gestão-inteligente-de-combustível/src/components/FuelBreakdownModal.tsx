import React from 'react';
import { X, Fuel, DollarSign, Layers, Droplet } from 'lucide-react';
import { FuelLog, Vehicle, FuelType } from '../types';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface FuelBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: FuelLog[];
  vehicle: Vehicle;
}

interface FuelStat {
  type: FuelType;
  label: string;
  colorClass: string;
  barColor: string;
  totalCost: number;
  totalLiters: number;
  avgPricePerLiter: number;
  percentage: number;
  entriesCount: number;
}

const FUEL_CONFIG: Record<FuelType, { label: string; colorClass: string; barColor: string }> = {
  gasolina_comum: {
    label: 'Gasolina Comum',
    colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    barColor: '#F59E0B',
  },
  gasolina_aditivada: {
    label: 'Gasolina Aditivada',
    colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    barColor: '#3B82F6',
  },
  etanol: {
    label: 'Etanol',
    colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    barColor: '#10B981',
  },
  diesel_s10: {
    label: 'Diesel S10',
    colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    barColor: '#8B5CF6',
  },
  gnv: {
    label: 'GNV',
    colorClass: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
    barColor: '#06B6D4',
  },
};

export const FuelBreakdownModal: React.FC<FuelBreakdownModalProps> = ({
  isOpen,
  onClose,
  logs,
  vehicle,
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const totalSpentAll = logs.reduce((acc, l) => acc + l.totalCost, 0);
  const totalLitersAll = logs.reduce((acc, l) => acc + l.liters, 0);

  // Group by fuel type for this vehicle
  const groupMap: Partial<Record<FuelType, { cost: number; liters: number; count: number }>> = {};

  logs.forEach(log => {
    const current = groupMap[log.fuelType] || { cost: 0, liters: 0, count: 0 };
    current.cost += log.totalCost;
    current.liters += log.liters;
    current.count += 1;
    groupMap[log.fuelType] = current;
  });

  const fuelStats: FuelStat[] = Object.entries(groupMap)
    .map(([key, val]) => {
      const type = key as FuelType;
      const config = FUEL_CONFIG[type] || {
        label: type,
        colorClass: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/30',
        barColor: '#6B7280',
      };
      const percentage = totalSpentAll > 0 ? (val.cost / totalSpentAll) * 100 : 0;
      const avgPrice = val.liters > 0 ? val.cost / val.liters : 0;

      return {
        type,
        label: config.label,
        colorClass: config.colorClass,
        barColor: config.barColor,
        totalCost: val.cost,
        totalLiters: val.liters,
        avgPricePerLiter: avgPrice,
        percentage,
        entriesCount: val.count,
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[92dvh] pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-colors">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                Detalhamento por Combustível
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {vehicle.name} · <span className="font-mono-numbers">{vehicle.plate}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-neutral-100 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Top Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 font-mono-numbers">
            <div>
              <span className="text-xs text-slate-500 dark:text-neutral-400 uppercase font-semibold block">
                Total Gasto
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                R$ {totalSpentAll.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-neutral-400 uppercase font-semibold block">
                Volume Total
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-neutral-200">
                {totalLitersAll.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 dark:text-neutral-400 uppercase font-semibold block">
                Abastecimentos
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-neutral-200">
                {logs.length} paradas
              </span>
            </div>
          </div>

          {/* Fuel List Breakdown */}
          {fuelStats.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-neutral-400">
              Nenhum abastecimento registrado para este veículo.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-neutral-300">
                <span>Combustíveis Utilizados</span>
                <span className="text-xs text-slate-500 dark:text-neutral-400 font-normal">
                  {fuelStats.length} {fuelStats.length === 1 ? 'tipo' : 'tipos'}
                </span>
              </div>

              {fuelStats.map(stat => (
                <div
                  key={stat.type}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800/80 space-y-3"
                >
                  {/* Top line: Label + Total Cost */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: stat.barColor }}
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-neutral-100">
                          {stat.label}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-neutral-400 ml-1.5 font-medium">
                          ({stat.entriesCount} {stat.entriesCount === 1 ? 'abastecimento' : 'abastecimentos'})
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold font-mono-numbers text-slate-900 dark:text-neutral-100">
                        R$ {stat.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${stat.percentage}%`,
                          backgroundColor: stat.barColor,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                      <span>{stat.percentage.toFixed(1)}% do gasto total</span>
                      <span>{stat.totalLiters.toFixed(2)} Litros</span>
                    </div>
                  </div>

                  {/* Sub stats: Preço Médio / L */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-xs text-slate-500 dark:text-neutral-400">
                      Preço médio pago por litro:
                    </span>
                    <span className="font-semibold font-mono-numbers text-slate-800 dark:text-neutral-200">
                      R$ {stat.avgPricePerLiter.toFixed(2)} / L
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 min-h-[44px] text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 rounded-xl transition-all active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
