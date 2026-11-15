import React, { useState, useEffect } from 'react';
import { X, Car, AlertCircle, Disc } from 'lucide-react';
import { Vehicle, FuelType } from '../types';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Omit<Vehicle, 'id'> | Vehicle) => void;
  initialVehicle?: Vehicle | null;
}

const AVAILABLE_FUELS: { id: FuelType; label: string }[] = [
  { id: 'gasolina_comum', label: 'Gasolina Comum' },
  { id: 'gasolina_aditivada', label: 'Gasolina Aditivada' },
  { id: 'etanol', label: 'Etanol' },
  { id: 'diesel_s10', label: 'Diesel S10' },
  { id: 'gnv', label: 'GNV' },
];

const COLOR_PRESETS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialVehicle,
}) => {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(2023);
  const [plate, setPlate] = useState('');
  const [initialOdometer, setInitialOdometer] = useState<number | ''>(0);
  const [currentOdometer, setCurrentOdometer] = useState<number | ''>(0);
  const [tankCapacityLiters, setTankCapacityLiters] = useState<number | ''>(50);
  const [acceptedFuels, setAcceptedFuels] = useState<FuelType[]>(['gasolina_comum', 'gasolina_aditivada']);
  const [color, setColor] = useState('#3B82F6');
  const [frontTirePsi, setFrontTirePsi] = useState<number | ''>(32);
  const [rearTirePsi, setRearTirePsi] = useState<number | ''>(30);
  const [tireDaysInterval, setTireDaysInterval] = useState<number | ''>(15);
  const [tireFillsInterval, setTireFillsInterval] = useState<number | ''>(2);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (initialVehicle) {
        setName(initialVehicle.name);
        setModel(initialVehicle.model);
        setYear(initialVehicle.year);
        setPlate(initialVehicle.plate);
        setInitialOdometer(initialVehicle.initialOdometer);
        setCurrentOdometer(initialVehicle.currentOdometer);
        setTankCapacityLiters(initialVehicle.tankCapacityLiters);
        setAcceptedFuels(initialVehicle.acceptedFuels);
        setColor(initialVehicle.color || '#3B82F6');
        setFrontTirePsi(initialVehicle.frontTirePsi ?? 32);
        setRearTirePsi(initialVehicle.rearTirePsi ?? 30);
        setTireDaysInterval(initialVehicle.tireCalibrationDaysInterval ?? 15);
        setTireFillsInterval(initialVehicle.tireCalibrationFillsInterval ?? 2);
      } else {
        setName('');
        setModel('');
        setYear(new Date().getFullYear());
        setPlate('');
        setInitialOdometer('');
        setCurrentOdometer('');
        setTankCapacityLiters(50);
        setAcceptedFuels(['gasolina_comum', 'gasolina_aditivada', 'etanol']);
        setColor('#3B82F6');
        setFrontTirePsi(32);
        setRearTirePsi(30);
        setTireDaysInterval(15);
        setTireFillsInterval(2);
      }
    }
  }, [isOpen, initialVehicle]);

  if (!isOpen) return null;

  const toggleFuel = (f: FuelType) => {
    if (acceptedFuels.includes(f)) {
      if (acceptedFuels.length === 1) {
        setErrorMsg('O veículo precisa aceitar ao menos 1 combustível.');
        return;
      }
      setAcceptedFuels(acceptedFuels.filter(x => x !== f));
    } else {
      setAcceptedFuels([...acceptedFuels, f]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Informe o nome do veículo.');
      return;
    }
    const initOdo = typeof initialOdometer === 'number' ? initialOdometer : parseFloat(initialOdometer as string);
    const currOdo = typeof currentOdometer === 'number' ? currentOdometer : parseFloat(currentOdometer as string);
    const tankCap = typeof tankCapacityLiters === 'number' ? tankCapacityLiters : parseFloat(tankCapacityLiters as string);

    if (isNaN(initOdo) || initOdo < 0) {
      setErrorMsg('Informe um hodômetro inicial válido.');
      return;
    }
    if (isNaN(currOdo) || currOdo < initOdo) {
      setErrorMsg('O hodômetro atual não pode ser menor que o inicial.');
      return;
    }
    if (isNaN(tankCap) || tankCap <= 0) {
      setErrorMsg('Informe a capacidade do tanque em litros.');
      return;
    }

    const fPsi = typeof frontTirePsi === 'number' ? frontTirePsi : parseFloat(frontTirePsi as string) || 32;
    const rPsi = typeof rearTirePsi === 'number' ? rearTirePsi : parseFloat(rearTirePsi as string) || 30;
    const tDays = typeof tireDaysInterval === 'number' ? tireDaysInterval : parseInt(tireDaysInterval as string, 10) || 15;
    const tFills = typeof tireFillsInterval === 'number' ? tireFillsInterval : parseInt(tireFillsInterval as string, 10) || 2;

    if (initialVehicle) {
      onSave({
        ...initialVehicle,
        name: name.trim(),
        model: model.trim(),
        year,
        plate: plate.trim().toUpperCase(),
        initialOdometer: Math.round(initOdo),
        currentOdometer: Math.round(currOdo),
        tankCapacityLiters: Number(tankCap.toFixed(1)),
        acceptedFuels,
        color,
        frontTirePsi: fPsi,
        rearTirePsi: rPsi,
        tireCalibrationDaysInterval: tDays,
        tireCalibrationFillsInterval: tFills,
      });
    } else {
      onSave({
        name: name.trim(),
        model: model.trim(),
        year,
        plate: plate.trim().toUpperCase(),
        initialOdometer: Math.round(initOdo),
        currentOdometer: Math.round(currOdo),
        tankCapacityLiters: Number(tankCap.toFixed(1)),
        acceptedFuels,
        color,
        frontTirePsi: fPsi,
        rearTirePsi: rPsi,
        tireCalibrationDaysInterval: tDays,
        tireCalibrationFillsInterval: tFills,
      });
    }

    onClose();
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
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[92dvh] pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-colors">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {initialVehicle ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
            </h3>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Nome / Marca
              </label>
              <input
                type="text"
                placeholder="ex: Honda Civic Touring"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Modelo / Motor
              </label>
              <input
                type="text"
                placeholder="ex: 1.5 Turbo"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Ano de Fabricação
              </label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value) || 2023)}
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Placa do Veículo
              </label>
              <input
                type="text"
                placeholder="ex: BRA-2E19"
                value={plate}
                onChange={e => setPlate(e.target.value)}
                required
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 uppercase font-mono-numbers focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Capacidade Tanque (L)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ex: 56"
                value={tankCapacityLiters}
                onChange={e => setTankCapacityLiters(e.target.value === '' ? '' : parseFloat(e.target.value))}
                required
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Hodômetro Inicial (km)
              </label>
              <input
                type="number"
                value={initialOdometer}
                onChange={e => setInitialOdometer(e.target.value === '' ? '' : parseFloat(e.target.value))}
                required
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Hodômetro Atual (km)
              </label>
              <input
                type="number"
                value={currentOdometer}
                onChange={e => setCurrentOdometer(e.target.value === '' ? '' : parseFloat(e.target.value))}
                required
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Accepted Fuels */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1.5">
              Combustíveis Aceitos
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_FUELS.map(f => {
                const active = acceptedFuels.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFuel(f.id)}
                    className={`px-2.5 min-h-[44px] text-xs font-medium rounded-xl text-center transition-all active:scale-95 ${
                      active
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                        : 'bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tire Calibration Parameters */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-neutral-200">
              <Disc className="w-4 h-4 text-amber-500" />
              <span>Calibragem e Pressão Recomendada</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Pneus Dianteiros (PSI)
                </label>
                <input
                  type="number"
                  min="15"
                  max="60"
                  value={frontTirePsi}
                  onChange={e => setFrontTirePsi(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="32"
                  className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Pneus Traseiros (PSI)
                </label>
                <input
                  type="number"
                  min="15"
                  max="60"
                  value={rearTirePsi}
                  onChange={e => setRearTirePsi(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="30"
                  className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Intervalo Máx. (dias)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={tireDaysInterval}
                  onChange={e => setTireDaysInterval(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="15"
                  className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Máx. Abastecimentos
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tireFillsInterval}
                  onChange={e => setTireFillsInterval(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="2"
                  className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Color preset */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1.5">
              Cor do Marcador
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl active:scale-95 transition-transform"
                >
                  <span
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      color === c ? 'scale-110 border-slate-900 dark:border-white shadow-md' : 'border-transparent opacity-80'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 min-h-[44px] text-xs font-medium text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-xl transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 min-h-[44px] text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all active:scale-95"
            >
              {initialVehicle ? 'Salvar Veículo' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
