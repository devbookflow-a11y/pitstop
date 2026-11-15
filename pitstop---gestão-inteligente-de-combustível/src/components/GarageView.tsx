import React, { useState, useRef, useEffect } from 'react';
import {
  Vehicle,
  MaintenanceItem,
  FuelLog,
  ExtraExpense,
  ExpenseCategory,
  TireCalibrationLog,
  GasStation,
} from '../types';
import {
  Car,
  Wrench,
  Download,
  Upload,
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Fuel,
  Info,
  Receipt,
  DollarSign,
  Calendar,
  Layers,
  Filter,
  Disc,
  Gauge
} from 'lucide-react';
import {
  exportBackupJSON,
  importBackupJSON,
  exportLogsCSV,
} from '../utils/storage';
import { VehicleModal } from './VehicleModal';
import { MaintenanceModal } from './MaintenanceModal';
import { ExpenseModal } from './ExpenseModal';

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; bg: string; text: string }> = {
  ipva_impostos: { label: 'IPVA / Impostos', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
  seguro: { label: 'Seguro Auto', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  licenciamento_taxas: { label: 'Licenciamento / Taxas', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  estacionamento_pedagio: { label: 'Estacionamento / Pedágio', bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
  lavagem_estetica: { label: 'Lavagem / Estética', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  multas: { label: 'Multas de Trânsito', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
  outros: { label: 'Outras Despesas', bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-neutral-400' },
};

interface GarageViewProps {
  vehicles: Vehicle[];
  activeVehicleId: string;
  onSelectVehicle: (id: string) => void;
  onSaveVehicle: (vehicle: Omit<Vehicle, 'id'> | Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  maintenanceItems: MaintenanceItem[];
  onSaveMaintenance: (item: Omit<MaintenanceItem, 'id'> | MaintenanceItem) => void;
  onDeleteMaintenance: (id: string) => void;
  onCompleteMaintenance: (id: string) => void;
  extraExpenses: ExtraExpense[];
  tireCalibrations?: TireCalibrationLog[];
  stations?: GasStation[];
  onSaveExpense: (expense: Omit<ExtraExpense, 'id'> | ExtraExpense) => void;
  onDeleteExpense: (id: string) => void;
  onOpenExpenseModal: () => void;
  onQuickCalibrateTires?: (notes?: string) => void | Promise<void>;
  onDeleteTireCalibration?: (id: string) => void;
  initialSection2Tab?: 'maintenance' | 'expenses' | 'calibrations';
  section2TabTrigger?: number;
  fuelLogs: FuelLog[];
  onRestoreAllData: (data: {
    vehicles: Vehicle[];
    fuelLogs: FuelLog[];
    maintenanceItems: MaintenanceItem[];
    extraExpenses?: ExtraExpense[];
    tireCalibrations?: TireCalibrationLog[];
    stations?: GasStation[];
  }) => void | Promise<boolean>;
}

export const GarageView: React.FC<GarageViewProps> = ({
  vehicles,
  activeVehicleId,
  onSelectVehicle,
  onSaveVehicle,
  onDeleteVehicle,
  maintenanceItems,
  onSaveMaintenance,
  onDeleteMaintenance,
  onCompleteMaintenance,
  extraExpenses,
  tireCalibrations = [],
  stations = [],
  onSaveExpense,
  onDeleteExpense,
  onOpenExpenseModal,
  onQuickCalibrateTires,
  onDeleteTireCalibration,
  initialSection2Tab = 'maintenance',
  section2TabTrigger = 0,
  fuelLogs,
  onRestoreAllData,
}) => {
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceItem | null>(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExtraExpense | null>(null);

  // Sub-tabs for Section 2: 'maintenance' | 'expenses' | 'calibrations'
  const [section2Tab, setSection2Tab] = useState<'maintenance' | 'expenses' | 'calibrations'>(
    initialSection2Tab
  );
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<'all' | ExpenseCategory>('all');

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (section2TabTrigger > 0) {
      setSection2Tab(initialSection2Tab);
      const timer = setTimeout(() => {
        section2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [initialSection2Tab, section2TabTrigger]);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0] || null;

  const vehicleMaintenance = activeVehicle
    ? maintenanceItems
        .filter(m => m.vehicleId === activeVehicle.id)
        .map(m => {
          const kmUsed = Math.max(0, activeVehicle.currentOdometer - m.lastDoneOdometer);
          const remainingKm = m.intervalKm - kmUsed;
          const progressPct = Math.min(100, Math.round((kmUsed / m.intervalKm) * 100));
          const isOverdue = remainingKm <= 0;
          const isUrgent = remainingKm <= 500 && !isOverdue;

          return {
            ...m,
            kmUsed,
            remainingKm,
            progressPct,
            isOverdue,
            isUrgent,
          };
        })
        .sort((a, b) => a.remainingKm - b.remainingKm)
    : [];

  // Extra expenses for the active vehicle
  const vehicleExpenses = activeVehicle
    ? extraExpenses
        .filter(e => e.vehicleId === activeVehicle.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const filteredExpenses = vehicleExpenses.filter(e => {
    if (selectedExpenseCategory === 'all') return true;
    return e.category === selectedExpenseCategory;
  });

  const totalVehicleExtraExpenses = vehicleExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Tire calibration history for the active vehicle (sorted newest first with intervals)
  const vehicleCalibrations = activeVehicle
    ? [...tireCalibrations]
        .filter(c => c.vehicleId === activeVehicle.id)
        .sort((a, b) => {
          const timeDiff = new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime();
          if (timeDiff !== 0) return timeDiff;
          return b.odometer - a.odometer;
        })
        .map((item, idx, arr) => {
          const previous = arr[idx + 1] || null;
          let daysSincePrevious: number | null = null;
          let kmSincePrevious: number | null = null;

          if (previous) {
            const currMs = new Date(item.date + 'T12:00:00').getTime();
            const prevMs = new Date(previous.date + 'T12:00:00').getTime();
            if (Number.isFinite(currMs) && Number.isFinite(prevMs)) {
              daysSincePrevious = Math.max(0, Math.round((currMs - prevMs) / (1000 * 60 * 60 * 24)));
            }
            kmSincePrevious = Math.max(0, item.odometer - previous.odometer);
          }

          return {
            ...item,
            daysSincePrevious,
            kmSincePrevious,
          };
        })
    : [];

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleExportJSON = () => {
    try {
      exportBackupJSON(vehicles, fuelLogs, maintenanceItems, extraExpenses, tireCalibrations, stations);
      showFeedback('Backup exportado com sucesso em formato JSON!');
    } catch (e) {
      showFeedback('Erro ao exportar backup.', 'error');
    }
  };

  const handleImportJSONClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result as string;
        const parsed = importBackupJSON(content);
        const confirmed = await onRestoreAllData({
          vehicles: parsed.vehicles,
          fuelLogs: parsed.fuelLogs,
          maintenanceItems: parsed.maintenanceItems || [],
          extraExpenses: parsed.extraExpenses || [],
          tireCalibrations: parsed.tireCalibrations || [],
          stations: parsed.stations || [],
        });
        if (confirmed !== false) {
          showFeedback(
            `Backup importado! ${parsed.vehicles.length} veículos, ${parsed.fuelLogs.length} abastecimentos, ${(parsed.maintenanceItems || []).length} manutenções, ${(parsed.extraExpenses || []).length} despesas e ${(parsed.stations || []).length} postos.`
          );
        }
      } catch (err: any) {
        showFeedback(err?.message || 'Falha ao importar backup.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    if (!activeVehicle) {
      showFeedback('Nenhum veículo selecionado para exportar CSV.', 'error');
      return;
    }
    try {
      const vehicleLogs = fuelLogs.filter(l => l.vehicleId === activeVehicle.id);
      exportLogsCSV(vehicleLogs, activeVehicle);
      showFeedback(`Relatório CSV gerado para o veículo ${activeVehicle.plate}!`);
    } catch (e) {
      showFeedback('Erro ao gerar CSV.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Notification banner */}
      {feedbackMsg && (
        <div
          className={`p-3 text-xs rounded-xl flex items-center gap-2 transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* SECTION 1: VEÍCULOS NA GARAGEM */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                <Car className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
                Garagem de Veículos
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Gerencie seus carros, motos e parâmetros de tanque e hodômetro.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingVehicle(null);
              setVehicleModalOpen(true);
            }}
            className="min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Veículo</span>
          </button>
        </div>

        {/* Vehicles Cards Grid or Empty State */}
        {vehicles.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm">
            <Car className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <h3 className="text-base font-bold text-slate-800 dark:text-neutral-200 mb-1">
              Nenhum veículo cadastrado
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mb-4">
              Adicione seu primeiro veículo para começar a gerenciar abastecimentos e plano preventivo.
            </p>
            <button
              onClick={() => {
                setEditingVehicle(null);
                setVehicleModalOpen(true);
              }}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Veículo</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {vehicles.map(v => {
            const isActive = v.id === activeVehicleId;
            const logCount = fuelLogs.filter(l => l.vehicleId === v.id).length;

            return (
              <div
                key={v.id}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isActive
                    ? 'bg-white dark:bg-neutral-900 border-2 border-amber-500 shadow-lg shadow-amber-500/10'
                    : 'bg-white dark:bg-neutral-900/60 border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
                }`}
                onClick={() => onSelectVehicle(v.id)}
              >
                {/* Active indicator badge */}
                {isActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/30">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Em Uso</span>
                  </div>
                )}

                <div className="flex items-start gap-3.5 mb-3">
                  <div
                    className="w-3.5 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: v.color || '#3B82F6' }}
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                      {v.name}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-neutral-400">
                      {v.model} · {v.year}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-slate-100 dark:border-neutral-800 text-xs font-mono-numbers">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-neutral-400 block">Placa</span>
                    <span className="font-bold text-slate-800 dark:text-neutral-200">{v.plate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-neutral-400 block">Hodômetro</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {v.currentOdometer.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-neutral-400 block">Tanque</span>
                    <span className="font-bold text-slate-800 dark:text-neutral-200">
                      {v.tankCapacityLiters} L
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="text-xs text-slate-500 dark:text-neutral-400">
                    {logCount} abastecimentos cadastrados
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingVehicle(v);
                        setVehicleModalOpen(true);
                      }}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all active:scale-95"
                      title="Editar veículo"
                      aria-label="Editar veículo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteVehicle(v.id);
                      }}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all active:scale-95"
                      title="Excluir veículo"
                      aria-label="Excluir veículo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* SECTION 2: GESTÃO OPERACIONAL - MANUTENÇÃO PREVENTIVA, DESPESAS EXTRAS E CALIBRAGENS */}
      <div ref={section2Ref} className="space-y-4 scroll-mt-24">
        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSection2Tab('maintenance')}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap ${
              section2Tab === 'maintenance'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 border border-slate-200 dark:border-neutral-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Plano de Manutenção Preventiva</span>
            {vehicleMaintenance.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono-numbers font-bold ${
                section2Tab === 'maintenance' ? 'bg-neutral-950/20 text-neutral-950' : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              }`}>
                {vehicleMaintenance.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSection2Tab('expenses')}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap ${
              section2Tab === 'expenses'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 border border-slate-200 dark:border-neutral-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Despesas Extras (Não-Combustível)</span>
            {vehicleExpenses.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono-numbers font-bold ${
                section2Tab === 'expenses' ? 'bg-neutral-950/20 text-neutral-950' : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              }`}>
                {vehicleExpenses.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSection2Tab('calibrations')}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap ${
              section2Tab === 'calibrations'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 border border-slate-200 dark:border-neutral-800'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>Histórico de Calibragens</span>
            {vehicleCalibrations.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono-numbers font-bold ${
                section2Tab === 'calibrations' ? 'bg-neutral-950/20 text-neutral-950' : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              }`}>
                {vehicleCalibrations.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1 CONTENT: PLANO DE MANUTENÇÃO PREVENTIVA */}
        {section2Tab === 'maintenance' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                    <Wrench className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
                    Manutenção Preventiva por Hodômetro
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {activeVehicle ? (
                    <>
                      Controle de vida útil de peças para <strong>{activeVehicle.name}</strong> ({activeVehicle.currentOdometer.toLocaleString('pt-BR')} km).
                    </>
                  ) : (
                    'Cadastre um veículo para gerenciar o plano preventivo.'
                  )}
                </p>
              </div>

              {activeVehicle && (
                <button
                  onClick={() => {
                    setEditingMaintenance(null);
                    setMaintenanceModalOpen(true);
                  }}
                  className="min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Novo Lembrete</span>
                </button>
              )}
            </div>

            {vehicleMaintenance.length === 0 ? (
              <div className="p-8 text-center bg-white/60 dark:bg-neutral-900/50 border border-slate-200 dark:border-neutral-800 rounded-2xl text-xs text-slate-500 dark:text-neutral-400">
                Nenhuma manutenção cadastrada para este veículo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {vehicleMaintenance.map(item => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm space-y-3 relative group transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                          {item.title}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-neutral-400">
                          Intervalo de {item.intervalKm.toLocaleString('pt-BR')} km · Última: {item.lastDoneOdometer.toLocaleString('pt-BR')} km
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 shrink-0">
                        <button
                          onClick={() => {
                            setEditingMaintenance(item);
                            setMaintenanceModalOpen(true);
                          }}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                          title="Editar"
                          aria-label="Editar manutenção"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteMaintenance(item.id)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                          title="Excluir"
                          aria-label="Excluir manutenção"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress status */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono-numbers gap-2">
                        <span className="text-slate-500 dark:text-neutral-400 text-xs">
                          Rodados: {item.kmUsed.toLocaleString('pt-BR')} / {item.intervalKm.toLocaleString('pt-BR')} km
                        </span>
                        <span
                          className={`font-bold shrink-0 ${
                            item.isOverdue
                              ? 'text-red-500'
                              : item.isUrgent
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {item.isOverdue
                            ? `Vencida há ${Math.abs(item.remainingKm).toLocaleString('pt-BR')} km!`
                            : `Restam ${item.remainingKm.toLocaleString('pt-BR')} km`}
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-neutral-950 rounded-full overflow-hidden border border-slate-200 dark:border-neutral-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.isOverdue
                              ? 'bg-red-500'
                              : item.isUrgent
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${item.progressPct}%` }}
                        />
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-500 dark:text-neutral-400 italic">
                        "{item.notes}"
                      </p>
                    )}

                    {/* Mark as done button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-slate-400 dark:text-neutral-500">
                        Realizada em {new Date(item.lastDoneDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <button
                        onClick={() => onCompleteMaintenance(item.id)}
                        className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-emerald-600 dark:text-emerald-400 transition-all active:scale-95"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Concluir Hoje ({activeVehicle?.currentOdometer.toLocaleString('pt-BR')} km)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2 CONTENT: DESPESAS EXTRAS (NÃO-COMBUSTÍVEL) */}
        {section2Tab === 'expenses' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg">
                    <Receipt className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
                    Despesas Extras & Custos Não-Combustível
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {activeVehicle ? (
                    <>
                      Controle de IPVA, seguro, pedágios, lavagens e taxas para <strong>{activeVehicle.name}</strong>.
                    </>
                  ) : (
                    'Cadastre um veículo para gerenciar despesas extras.'
                  )}
                </p>
              </div>

              {activeVehicle && (
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setExpenseModalOpen(true);
                  }}
                  className="min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nova Despesa</span>
                </button>
              )}
            </div>

            {/* Total Summary Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-slate-50 to-white dark:from-purple-950/30 dark:via-neutral-900 dark:to-neutral-950 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                  Total Acumulado em Despesas Extras
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono-numbers text-slate-900 dark:text-neutral-100">
                  R$ {totalVehicleExtraExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-neutral-400 font-mono-numbers">
                <strong>{vehicleExpenses.length}</strong> registro{vehicleExpenses.length !== 1 ? 's' : ''} vinculados ao veículo ativo
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedExpenseCategory('all')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap ${
                  selectedExpenseCategory === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 border border-slate-200 dark:border-neutral-800'
                }`}
              >
                Todas ({vehicleExpenses.length})
              </button>
              {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(cat => {
                const count = vehicleExpenses.filter(e => e.category === cat).length;
                if (count === 0 && selectedExpenseCategory !== cat) return null;
                const conf = CATEGORY_CONFIG[cat];
                const active = selectedExpenseCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedExpenseCategory(cat)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap flex items-center gap-1.5 ${
                      active
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 border border-slate-200 dark:border-neutral-800'
                    }`}
                  >
                    <span>{conf.label}</span>
                    <span className="text-xs opacity-75 font-mono-numbers">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Expenses List */}
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center bg-white/60 dark:bg-neutral-900/50 border border-slate-200 dark:border-neutral-800 rounded-2xl text-xs text-slate-500 dark:text-neutral-400">
                Nenhuma despesa extra encontrada para este filtro.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredExpenses.map(exp => {
                  const catConf = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.outros;
                  return (
                    <div
                      key={exp.id}
                      className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-2 relative group transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold uppercase ${catConf.bg} ${catConf.text}`}>
                              {catConf.label}
                            </span>
                            {exp.recurrence && exp.recurrence !== 'unica' && (
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                                {exp.recurrence === 'mensal' ? 'Mensal' : 'Anual'}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                            {exp.description}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 shrink-0">
                          <button
                            onClick={() => {
                              setEditingExpense(exp);
                              setExpenseModalOpen(true);
                            }}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                            title="Editar"
                            aria-label="Editar despesa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteExpense(exp.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                            title="Excluir"
                            aria-label="Excluir despesa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {exp.notes && (
                        <p className="text-xs text-slate-500 dark:text-neutral-400 italic">
                          "{exp.notes}"
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                        <div className="text-xs text-slate-400 font-mono-numbers">
                          <span>{new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          {exp.odometer && (
                            <span className="ml-2">· {exp.odometer.toLocaleString('pt-BR')} km</span>
                          )}
                        </div>
                        <div className="text-base font-black font-mono-numbers text-slate-900 dark:text-neutral-100">
                          R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3 CONTENT: HISTÓRICO DE CALIBRAGENS DOS PNEUS */}
        {section2Tab === 'calibrations' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <Disc className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Histórico de Calibragens
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {activeVehicle ? (
                    <>
                      Registros de calibragem de pneus para <strong>{activeVehicle.name}</strong> (Ref.: Dianteira {activeVehicle.frontTirePsi || 32} PSI · Traseira {activeVehicle.rearTirePsi || 30} PSI).
                    </>
                  ) : (
                    'Cadastre um veículo para acompanhar o histórico de calibragens.'
                  )}
                </p>
              </div>

              {activeVehicle && onQuickCalibrateTires && (
                <button
                  type="button"
                  onClick={() => void onQuickCalibrateTires('Calibragem registrada pela Garagem')}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Calibragem</span>
                </button>
              )}
            </div>

            {vehicleCalibrations.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 text-amber-500 flex items-center justify-center mx-auto">
                  <Disc className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Nenhuma calibragem registrada
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                    Mantenha a pressão ideal dos pneus para economizar combustível, preservar a banda de rodagem e garantir segurança.
                  </p>
                </div>
                {activeVehicle && onQuickCalibrateTires && (
                  <button
                    type="button"
                    onClick={() => void onQuickCalibrateTires('Primeira calibragem registrada')}
                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
                  >
                    <Disc className="w-4 h-4" />
                    <span>Registrar Primeira Calibragem</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicleCalibrations.map(item => {
                  const formattedDate = new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR');
                  const frontPsi = item.frontPsi || activeVehicle?.frontTirePsi || 32;
                  const rearPsi = item.rearPsi || activeVehicle?.rearTirePsi || 30;

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-zinc-900 dark:text-white font-mono-numbers block">
                              {formattedDate}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-mono-numbers">
                              <Gauge className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              {item.odometer.toLocaleString('pt-BR')} km
                            </span>
                          </div>
                        </div>

                        {onDeleteTireCalibration && (
                          <button
                            type="button"
                            onClick={() => onDeleteTireCalibration(item.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shrink-0"
                            title="Excluir registro de calibragem"
                            aria-label="Excluir registro de calibragem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Reference Pressures */}
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 text-xs font-mono-numbers text-zinc-700 dark:text-zinc-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          Dianteira: <strong className="text-zinc-900 dark:text-white">{frontPsi} PSI</strong>
                        </span>
                        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">|</span>
                        <span>
                          Traseira: <strong className="text-zinc-900 dark:text-white">{rearPsi} PSI</strong>
                        </span>
                      </div>

                      {/* Interval & Notes */}
                      <div className="space-y-1">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          {item.daysSincePrevious !== null && item.kmSincePrevious !== null ? (
                            <span className="font-mono-numbers">
                              Intervalo: <strong>{item.daysSincePrevious} dia{item.daysSincePrevious !== 1 ? 's' : ''}</strong> · <strong>+{item.kmSincePrevious.toLocaleString('pt-BR')} km</strong> desde a calibragem anterior
                            </span>
                          ) : (
                            <span>Primeiro registro histórico deste veículo</span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: BACKUP, EXPORTAÇÃO E IMPORTAÇÃO */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm space-y-4 transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <span>Persistência, Backup e Relatórios</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Todos os seus dados estão salvos com segurança. Guarde backups ou exporte planilhas completas em CSV.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="min-h-[48px] flex items-center justify-center gap-2 p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800/80 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-100 transition-all active:scale-95 text-center"
          >
            <Download className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Exportar Backup (JSON)</span>
          </button>

          {/* Import JSON */}
          <button
            onClick={handleImportJSONClick}
            className="min-h-[48px] flex items-center justify-center gap-2 p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800/80 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-100 transition-all active:scale-95 text-center"
          >
            <Upload className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Importar Backup (JSON)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!activeVehicle}
            className="min-h-[48px] flex items-center justify-center gap-2 p-3.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-neutral-950 dark:hover:bg-neutral-800/80 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-100 transition-all active:scale-95 text-center"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Exportar Relatório (CSV)</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <VehicleModal
        isOpen={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        onSave={onSaveVehicle}
        initialVehicle={editingVehicle}
      />

      {activeVehicle && (
        <MaintenanceModal
          isOpen={maintenanceModalOpen}
          onClose={() => setMaintenanceModalOpen(false)}
          onSave={onSaveMaintenance}
          vehicleId={activeVehicle.id}
          currentVehicleOdometer={activeVehicle.currentOdometer}
          initialItem={editingMaintenance}
        />
      )}

      {activeVehicle && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => {
            setExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={expense => {
            onSaveExpense(expense);
            setExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          vehicleId={activeVehicle.id}
          currentVehicleOdometer={activeVehicle.currentOdometer}
          initialExpense={editingExpense}
        />
      )}
    </div>
  );
};
