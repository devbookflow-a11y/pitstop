import React, { useState, useEffect } from 'react';
import {
  X,
  Fuel,
  MapPin,
  Calendar,
  Gauge,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  DollarSign,
  Disc,
  Crosshair,
  Loader2,
  Navigation
} from 'lucide-react';
import { FuelLog, FuelType, DrivingProfile, Vehicle, GasStation } from '../types';
import { findNearbyStation } from '../utils/calculations';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface FuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    log: Omit<FuelLog, 'id' | 'calculatedKmPerLiter' | 'calculatedCostPerKm' | 'distanceTraveled' | 'isAnomaly'>,
    didCalibrateTires?: boolean,
    stationToSave?: { name: string; brand: string; latitude: number; longitude: number }
  ) => void;
  vehicle: Vehicle;
  initialLog?: FuelLog | null;
  existingLogs: FuelLog[];
  stations?: GasStation[];
}

const COMMON_BRANDS = ['Shell', 'Ipiranga', 'Petrobras', 'Ale', 'Outro'];

export const FuelModal: React.FC<FuelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicle,
  initialLog,
  existingLogs,
  stations = [],
}) => {
  useBodyScrollLock(isOpen);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState<number | ''>('');
  const [liters, setLiters] = useState<string>('');
  const [pricePerLiter, setPricePerLiter] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [fuelType, setFuelType] = useState<FuelType>('gasolina_comum');
  const [drivingProfile, setDrivingProfile] = useState<DrivingProfile>('cidade');
  const [stationName, setStationName] = useState('Posto Shell Graal Sul');
  const [stationBrand, setStationBrand] = useState('Shell');
  const [notes, setNotes] = useState('');
  const [didCalibrateTires, setDidCalibrateTires] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Geolocation and Station Matching states
  const [isLocating, setIsLocating] = useState(false);
  const [currentGpsCoords, setCurrentGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<{
    type: 'matched' | 'no_match' | 'error';
    message: string;
    stationName?: string;
    distanceMeters?: number;
  } | null>(null);
  const [saveLocationToStation, setSaveLocationToStation] = useState(false);

  // Track the sequence of field changes for Triple Auto-Calculation
  const [lastEdited, setLastEdited] = useState<['liters' | 'price' | 'total', 'liters' | 'price' | 'total']>([
    'liters',
    'price',
  ]);

  // Unique existing stations for autocomplete/quick-selection
  const knownStations = Array.from(
    new Set(existingLogs.map(l => l.stationName).filter(Boolean))
  );

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setDidCalibrateTires(false);
      if (initialLog) {
        setDate(initialLog.date);
        setOdometer(initialLog.odometer);
        setLiters(initialLog.liters.toString());
        setPricePerLiter(initialLog.pricePerLiter.toString());
        setTotalCost(initialLog.totalCost.toString());
        setIsFullTank(initialLog.isFullTank);
        setFuelType(initialLog.fuelType);
        setDrivingProfile(initialLog.drivingProfile);
        setStationName(initialLog.stationName);
        setStationBrand(initialLog.stationBrand);
        setNotes(initialLog.notes || '');

        if (initialLog.latitude && initialLog.longitude) {
          setCurrentGpsCoords({ latitude: initialLog.latitude, longitude: initialLog.longitude });
          setGeoStatus({
            type: 'matched',
            message: `📍 Coordenadas registradas (${initialLog.latitude.toFixed(4)}, ${initialLog.longitude.toFixed(4)})`,
            stationName: initialLog.stationName,
          });
          setSaveLocationToStation(true);
        } else {
          setCurrentGpsCoords(null);
          setGeoStatus(null);
          setSaveLocationToStation(false);
        }
      } else {
        // New log defaults
        setDate(new Date().toISOString().slice(0, 10));
        setOdometer(vehicle.currentOdometer || vehicle.initialOdometer);
        setLiters('');
        setPricePerLiter('');
        setTotalCost('');
        setIsFullTank(true);
        setFuelType(vehicle.acceptedFuels[0] || 'gasolina_comum');
        setDrivingProfile('cidade');
        setNotes('');
        setCurrentGpsCoords(null);
        setGeoStatus(null);
        setSaveLocationToStation(false);
      }
    }
  }, [isOpen, initialLog, vehicle]);

  // Detect nearby station using browser geolocation and Haversine formula
  const handleDetectNearbyStation = () => {
    if (!navigator.geolocation) {
      setGeoStatus({
        type: 'error',
        message: 'Geolocalização não é suportada pelo seu navegador.',
      });
      return;
    }

    setIsLocating(true);
    setGeoStatus(null);

    navigator.geolocation.getCurrentPosition(
      position => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setCurrentGpsCoords({ latitude, longitude });

        // Search for nearby station within 300 meters (0.300 km)
        const match = findNearbyStation(latitude, longitude, stations, 0.300);

        if (match) {
          setStationName(match.station.name);
          setStationBrand(match.station.brand);
          setSaveLocationToStation(true);
          setGeoStatus({
            type: 'matched',
            message: `📍 ${match.station.name} detectado a ${match.distanceMeters}m!`,
            stationName: match.station.name,
            distanceMeters: match.distanceMeters,
          });
        } else {
          setSaveLocationToStation(true);
          setGeoStatus({
            type: 'no_match',
            message: `Localização obtida (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). Nenhum posto cadastrado a menos de 300m.`,
          });
        }
      },
      error => {
        setIsLocating(false);
        let msg = 'Não foi possível obter a localização GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Permissão de localização GPS negada. Você pode selecionar ou digitar o posto normalmente.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Tempo limite esgotado ao buscar GPS. Tente novamente.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Sinal de GPS indisponível no momento.';
        }
        setGeoStatus({
          type: 'error',
          message: msg,
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  if (!isOpen) return null;

  // Triple calculation handler
  const handleLitersChange = (val: string) => {
    setLiters(val);
    const numLiters = parseFloat(val);
    const numPrice = parseFloat(pricePerLiter);
    const numTotal = parseFloat(totalCost);

    const prevOrder = lastEdited;
    const newOrder: ['liters' | 'price' | 'total', 'liters' | 'price' | 'total'] = ['liters', prevOrder[0] === 'liters' ? prevOrder[1] : prevOrder[0]];
    setLastEdited(newOrder);

    if (!isNaN(numLiters) && numLiters > 0 && !isNaN(numPrice) && numPrice > 0 && newOrder[1] === 'price') {
      setTotalCost((numLiters * numPrice).toFixed(2));
    } else if (!isNaN(numLiters) && numLiters > 0 && !isNaN(numTotal) && numTotal > 0 && newOrder[1] === 'total') {
      setPricePerLiter((numTotal / numLiters).toFixed(2));
    }
  };

  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    const numPrice = parseFloat(val);
    const numLiters = parseFloat(liters);
    const numTotal = parseFloat(totalCost);

    const prevOrder = lastEdited;
    const newOrder: ['liters' | 'price' | 'total', 'liters' | 'price' | 'total'] = ['price', prevOrder[0] === 'price' ? prevOrder[1] : prevOrder[0]];
    setLastEdited(newOrder);

    if (!isNaN(numPrice) && numPrice > 0 && !isNaN(numLiters) && numLiters > 0 && newOrder[1] === 'liters') {
      setTotalCost((numLiters * numPrice).toFixed(2));
    } else if (!isNaN(numPrice) && numPrice > 0 && !isNaN(numTotal) && numTotal > 0 && newOrder[1] === 'total') {
      setLiters((numTotal / numPrice).toFixed(2));
    }
  };

  const handleTotalChange = (val: string) => {
    setTotalCost(val);
    const numTotal = parseFloat(val);
    const numPrice = parseFloat(pricePerLiter);
    const numLiters = parseFloat(liters);

    const prevOrder = lastEdited;
    const newOrder: ['liters' | 'price' | 'total', 'liters' | 'price' | 'total'] = ['total', prevOrder[0] === 'total' ? prevOrder[1] : prevOrder[0]];
    setLastEdited(newOrder);

    if (!isNaN(numTotal) && numTotal > 0 && !isNaN(numPrice) && numPrice > 0 && newOrder[1] === 'price') {
      setLiters((numTotal / numPrice).toFixed(2));
    } else if (!isNaN(numTotal) && numTotal > 0 && !isNaN(numLiters) && numLiters > 0 && newOrder[1] === 'liters') {
      setPricePerLiter((numTotal / numLiters).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const odoNum = typeof odometer === 'number' ? odometer : parseFloat(odometer as string);
    const litNum = parseFloat(liters);
    const priceNum = parseFloat(pricePerLiter);
    const totalNum = parseFloat(totalCost);

    if (isNaN(odoNum) || odoNum <= 0) {
      setErrorMsg('Informe um hodômetro válido em km.');
      return;
    }
    if (isNaN(litNum) || litNum <= 0) {
      setErrorMsg('Informe a quantidade de litros abastecida.');
      return;
    }
    if (isNaN(totalNum) || totalNum <= 0) {
      setErrorMsg('Informe o valor total do abastecimento.');
      return;
    }

    onSave(
      {
        vehicleId: vehicle.id,
        date,
        odometer: Math.round(odoNum),
        liters: Number(litNum.toFixed(2)),
        pricePerLiter: Number((priceNum || (totalNum / litNum)).toFixed(2)),
        totalCost: Number(totalNum.toFixed(2)),
        fuelType,
        isFullTank,
        drivingProfile,
        stationName: stationName.trim() || 'Posto Desconhecido',
        stationBrand,
        notes: notes.trim(),
        latitude: currentGpsCoords?.latitude,
        longitude: currentGpsCoords?.longitude,
      },
      didCalibrateTires,
      currentGpsCoords && saveLocationToStation
        ? {
            name: stationName.trim() || 'Posto Desconhecido',
            brand: stationBrand,
            latitude: currentGpsCoords.latitude,
            longitude: currentGpsCoords.longitude,
          }
        : undefined
    );

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
        <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[92dvh] pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-colors">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                  {initialLog ? 'Editar Abastecimento' : 'Novo Abastecimento'}
                </h2>
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

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Date & Odometer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  Data do Abastecimento
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  Hodômetro Atual (km)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={odometer}
                    onChange={e => setOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="ex: 45860"
                    required
                    className="w-full px-3 pr-10 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-neutral-500 font-mono pointer-events-none">
                    km
                  </span>
                </div>
              </div>
            </div>

            {/* TRIPLE CALCULATION BOX */}
            <div className="p-3.5 bg-slate-100/80 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  Valores (Cálculo Automático Triplo)
                </span>
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  Preencha 2 campos e o 3º é calculado
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Litros (L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={liters}
                    onChange={e => handleLitersChange(e.target.value)}
                    required
                    className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Preço por Litro (R$)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.00"
                    value={pricePerLiter}
                    onChange={e => handlePriceChange(e.target.value)}
                    required
                    className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={totalCost}
                    onChange={e => handleTotalChange(e.target.value)}
                    required
                    className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl text-amber-600 dark:text-amber-400 font-bold font-mono-numbers focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* FULL TANK TOGGLE */}
            <div className={`p-3 rounded-xl border transition-all ${
              isFullTank
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-600/40'
                : 'bg-slate-50 dark:bg-neutral-950/40 border-slate-200 dark:border-neutral-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-neutral-100">
                      Tanque Cheio?
                    </span>
                    {isFullTank && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        (Permite cálculo exato de km/L)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {isFullTank
                      ? 'Sim, encheu até travar a bomba. Fecha o ciclo para calcular o consumo real.'
                      : 'Não, foi parcial. O sistema acumulará os litros até o próximo tanque cheio.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFullTank(!isFullTank)}
                  aria-label="Alternar tanque cheio"
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95 ${
                    isFullTank ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isFullTank ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* FUEL TYPE */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1.5">
                Tipo de Combustível
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'gasolina_comum', label: 'Gasolina Comum' },
                  { id: 'gasolina_aditivada', label: 'Gasolina Aditivada' },
                  { id: 'etanol', label: 'Etanol' },
                  { id: 'diesel_s10', label: 'Diesel S10' },
                  { id: 'gnv', label: 'GNV' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFuelType(item.id as FuelType)}
                    className={`px-2.5 min-h-[44px] text-xs font-medium rounded-xl text-center transition-all truncate active:scale-95 ${
                      fuelType === item.id
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                        : 'bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DRIVING PROFILE */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1.5">
                Perfil de Condução
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cidade', label: '🏙️ Cidade' },
                  { id: 'misto', label: '⚖️ Misto' },
                  { id: 'estrada', label: '🛣️ Estrada' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDrivingProfile(item.id as DrivingProfile)}
                    className={`px-3 min-h-[44px] text-xs font-medium rounded-xl text-center transition-all active:scale-95 ${
                      drivingProfile === item.id
                        ? 'bg-slate-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-bold shadow'
                        : 'bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* STATION & BRAND WITH GEOLOCATION AUTO-DETECTION */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300">
                      Nome do Posto
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectNearbyStation}
                      disabled={isLocating}
                      title="Obter coordenadas GPS e selecionar posto mais próximo a menos de 300m"
                      className="flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-all border border-amber-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                          <span>Buscando GPS...</span>
                        </>
                      ) : (
                        <>
                          <Crosshair className="w-3.5 h-3.5 text-amber-500" />
                          <span>Detectar Posto Próximo</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={stationName}
                      onChange={e => setStationName(e.target.value)}
                      placeholder="ex: Posto Shell Graal Sul"
                      list="station-suggestions"
                      className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                    <datalist id="station-suggestions">
                      {knownStations.map(st => (
                        <option key={st} value={st} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1.5">
                    Bandeira
                  </label>
                  <select
                    value={stationBrand}
                    onChange={e => setStationBrand(e.target.value)}
                    className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    {COMMON_BRANDS.map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GEOLOCATION FEEDBACK BANNER */}
              {geoStatus && (
                <div
                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                    geoStatus.type === 'matched'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : geoStatus.type === 'no_match'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-neutral-800 border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium">{geoStatus.message}</span>
                    </div>
                    {currentGpsCoords && (
                      <span className="text-xs font-mono opacity-80 shrink-0">
                        {currentGpsCoords.latitude.toFixed(4)}, {currentGpsCoords.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>

                  {geoStatus.type === 'no_match' && currentGpsCoords && (
                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>Deseja vincular estas coordenadas ao posto digitado?</span>
                      <label className="flex items-center gap-2 font-semibold cursor-pointer min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={saveLocationToStation}
                          onChange={e => setSaveLocationToStation(e.target.checked)}
                          className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span>Salvar GPS neste posto</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NOTES */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Observações (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ex: Ar ligado o tempo todo, trânsito pesado"
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* TIRE CALIBRATION CHECKBOX */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700/80 flex flex-wrap items-center justify-between gap-2 transition-colors">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 dark:text-neutral-200 select-none min-h-[44px]">
                <input
                  type="checkbox"
                  checked={didCalibrateTires}
                  onChange={e => setDidCalibrateTires(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 dark:border-neutral-700 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                />
                <div className="flex items-center gap-1.5">
                  <Disc className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Calibrei os pneus neste abastecimento</span>
                </div>
              </label>
              <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                Recomendado: {vehicle.frontTirePsi || 32}/{vehicle.rearTirePsi || 30} PSI
              </span>
            </div>

            {/* FOOTER ACTIONS */}
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
                className="px-6 min-h-[44px] text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                {initialLog ? 'Salvar Alterações' : 'Salvar Abastecimento'}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
};
