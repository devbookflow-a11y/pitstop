import React, { useState } from 'react';
import {
  X,
  Settings,
  Sun,
  Moon,
  Bell,
  Sliders,
  Database,
  Download,
  Upload,
  Trash2,
  FileText,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Disc,
  Fuel,
  Wrench,
  ShieldAlert,
  Cloud,
  CloudUpload,
  CloudDownload,
  Copy,
  Check,
  Server,
  Sparkles,
} from 'lucide-react';
import {
  AppSettings,
  BackupData,
  Vehicle,
  FuelLog,
  MaintenanceItem,
  ExtraExpense,
  TireCalibrationLog,
  GasStation,
} from '../types';
import { exportBackupJSON, importBackupJSON } from '../utils/storage';
import {
  uploadAllToSupabase,
  downloadAllFromSupabase,
  SUPABASE_SCHEMA_SQL,
} from '../services/supabase';
import { TermsModal } from './TermsModal';
import { PrivacyModal } from './PrivacyModal';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  userEmail?: string;
  userId?: string;
  // Backup / Data handlers
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  maintenanceItems: MaintenanceItem[];
  extraExpenses: ExtraExpense[];
  tireCalibrations: TireCalibrationLog[];
  stations: GasStation[];
  onApplyCloudData?: (backup: BackupData) => void;
  onRestoreBackup: (backup: BackupData) => void | Promise<boolean | void>;
  onFactoryReset: () => void;
  initialSection?: 'geral' | 'alertas' | 'dados' | 'supabase';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  theme,
  onToggleTheme,
  userEmail,
  userId,
  vehicles,
  fuelLogs,
  maintenanceItems,
  extraExpenses,
  tireCalibrations,
  stations,
  onApplyCloudData,
  onRestoreBackup,
  onFactoryReset,
  initialSection = 'geral',
}) => {
  const [activeSection, setActiveSection] = useState<'geral' | 'alertas' | 'dados' | 'supabase'>(initialSection);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Supabase states
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [isDownloadingSupabase, setIsDownloadingSupabase] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlScript, setShowSqlScript] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const handleToggle = (key: keyof AppSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleExport = () => {
    exportBackupJSON(
      vehicles,
      fuelLogs,
      maintenanceItems,
      extraExpenses,
      tireCalibrations,
      stations
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const json = event.target?.result as string;
        const backup = importBackupJSON(json);
        const imported = await onRestoreBackup(backup);
        if (imported !== false) {
          setImportSuccess('Backup importado com sucesso!');
          setTimeout(() => setImportSuccess(null), 3000);
        }
      } catch (err: unknown) {
        setImportError(
          err instanceof Error
            ? err.message
            : 'Erro ao processar arquivo JSON. Verifique a formatação.'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Supabase Actions
  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    setSyncFeedback(null);
    try {
      const res = await uploadAllToSupabase({
        vehicles,
        fuelLogs,
        maintenanceItems,
        extraExpenses,
        tireCalibrations,
        stations,
        userEmail,
        userId,
      });
      setSyncFeedback(res);
    } catch (err: unknown) {
      setSyncFeedback({
        ok: false,
        message: err instanceof Error ? err.message : 'Falha ao sincronizar',
      });
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleDownloadFromSupabase = async () => {
    setIsDownloadingSupabase(true);
    setDownloadFeedback(null);
    try {
      const res = await downloadAllFromSupabase(userId);
      if (res.ok && res.data) {
        if (onApplyCloudData) {
          onApplyCloudData(res.data);
        } else {
          onRestoreBackup(res.data);
        }
        setDownloadFeedback({
          ok: true,
          message: `${res.message} (${res.data.vehicles.length} veículo(s) e ${res.data.fuelLogs.length} abastecimento(s) carregados)`,
        });
      } else {
        setDownloadFeedback({
          ok: false,
          message: res.message,
        });
      }
    } catch (err: unknown) {
      setDownloadFeedback({
        ok: false,
        message: err instanceof Error ? err.message : 'Falha ao baixar dados',
      });
    } finally {
      setIsDownloadingSupabase(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-neutral-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50/70 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-title" className="text-base font-extrabold tracking-tight">
                Configurações & Preferências
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Personalize o comportamento, alertas, backup e nuvem Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
            aria-label="Fechar configurações"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-neutral-800 bg-slate-100/50 dark:bg-neutral-950/60 px-4 sm:px-5 pt-2 gap-2 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection('geral')}
            className={`min-h-[44px] px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap active:scale-95 ${
              activeSection === 'geral'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('alertas')}
            className={`min-h-[44px] px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap active:scale-95 ${
              activeSection === 'alertas'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alertas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('dados')}
            className={`min-h-[44px] px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap active:scale-95 ${
              activeSection === 'dados'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Dados & Backup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('supabase')}
            className={`min-h-[44px] px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap active:scale-95 ${
              activeSection === 'supabase'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-500" />
            <span>Nuvem Supabase</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700 dark:text-neutral-300">
          {/* SECTION 1: GERAL */}
          {activeSection === 'geral' && (
            <div className="space-y-6">
              {/* Theme Selector */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                      Tema Visual da Aplicação
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Escolha entre a interface escura de alto contraste ou o modo claro de alta luminosidade
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => theme !== 'light' && onToggleTheme()}
                    className={`p-3 min-h-[44px] rounded-xl border text-left flex items-center gap-3 transition-all active:scale-95 ${
                      theme === 'light'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold shadow-xs'
                        : 'border-slate-300 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-white shadow-xs text-amber-500">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Modo Claro</span>
                      <span className="text-xs text-slate-500">Fundo branco e contraste suave</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => theme !== 'dark' && onToggleTheme()}
                    className={`p-3 min-h-[44px] rounded-xl border text-left flex items-center gap-3 transition-all active:scale-95 ${
                      theme === 'dark'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold shadow-xs'
                        : 'border-slate-300 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-neutral-900 shadow-xs text-amber-400">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Modo Escuro</span>
                      <span className="text-xs text-slate-400">Cockpit automotivo escuro</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Measurement Units */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                  Padrões e Unidades de Medida
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-center">
                    <span className="text-xs uppercase text-slate-400 block font-sans">Distância</span>
                    <strong className="text-sm text-slate-900 dark:text-neutral-100 font-bold">km</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-center">
                    <span className="text-xs uppercase text-slate-400 block font-sans">Volume</span>
                    <strong className="text-sm text-slate-900 dark:text-neutral-100 font-bold">Litros (L)</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-center">
                    <span className="text-xs uppercase text-slate-400 block font-sans">Eficiência</span>
                    <strong className="text-sm text-slate-900 dark:text-neutral-100 font-bold">km/L</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-center">
                    <span className="text-xs uppercase text-slate-400 block font-sans">Moeda</span>
                    <strong className="text-sm text-slate-900 dark:text-neutral-100 font-bold">BRL (R$)</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: ALERTAS */}
          {activeSection === 'alertas' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-neutral-400 mb-2">
                Ative ou desative quais tipos de monitoramento geram avisos na Central de Alertas:
              </p>

              {/* Lembrete de Calibragem */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0 mt-0.5">
                    <Disc className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-neutral-100">
                      Lembretes de Calibragem de Pneus
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Avisa quando decorrerem mais de 15 dias ou 2 abastecimentos sem calibrar.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.alertTireCalibration}
                  onChange={() => handleToggle('alertTireCalibration')}
                  className="w-5 h-5 rounded border-slate-300 dark:border-neutral-700 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer shrink-0"
                />
              </div>

              {/* Alerta de Reserva */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-neutral-100">
                      Alerta de Autonomia & Reserva
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Notifica com antecedência quando o tanque estiver próximo do limite de reserva segura (15%).
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.alertLowFuel}
                  onChange={() => handleToggle('alertLowFuel')}
                  className="w-5 h-5 rounded border-slate-300 dark:border-neutral-700 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer shrink-0"
                />
              </div>

              {/* Manutenção Preventiva */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-neutral-100">
                      Avisos de Manutenção Preventiva
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Dispara alertas quando óleo, filtros ou revisão estiverem a menos de 500 km do vencimento.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.alertPreventiveMaintenance}
                  onChange={() => handleToggle('alertPreventiveMaintenance')}
                  className="w-5 h-5 rounded border-slate-300 dark:border-neutral-700 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer shrink-0"
                />
              </div>

              {/* Anomalia Mecânica */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-red-500/10 text-red-500 shrink-0 mt-0.5">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-neutral-100">
                      Detecção de Anomalia de Consumo
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Alerta quando um abastecimento registrar queda superior a 15% em relação à média histórica.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.alertMechanicalAnomaly}
                  onChange={() => handleToggle('alertMechanicalAnomaly')}
                  className="w-5 h-5 rounded border-slate-300 dark:border-neutral-700 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer shrink-0"
                />
              </div>
            </div>
          )}

          {/* SECTION 3: DADOS & PRIVACIDADE */}
          {activeSection === 'dados' && (
            <div className="space-y-5">
              {/* Backup & Restore */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                  Backup e Portabilidade Local (JSON)
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Exporte uma cópia completa dos seus veículos, abastecimentos, despesas e postos em formato aberto para guardar no seu computador ou transferir para outro dispositivo.
                </p>

                {importError && (
                  <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
                    {importError}
                  </div>
                )}
                {importSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {importSuccess}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 font-bold text-xs text-slate-800 dark:text-neutral-200 transition-all shadow-xs active:scale-95"
                  >
                    <Download className="w-4 h-4 text-amber-500" />
                    <span>Exportar Backup JSON</span>
                  </button>

                  <label className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 font-bold text-xs text-slate-800 dark:text-neutral-200 transition-all cursor-pointer shadow-xs active:scale-95">
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <span>Restaurar Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Legal Links */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                  Documentação Legal & Transparência
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Consulte os termos que regem o uso do aplicativo e o compromisso de privacidade dos seus dados:
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsTermsOpen(true)}
                    className="flex items-center gap-1.5 min-h-[44px] px-2 text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold active:scale-95"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Termos de Uso</span>
                  </button>
                  <span className="text-slate-300 dark:text-neutral-700">•</span>
                  <button
                    type="button"
                    onClick={() => setIsPrivacyOpen(true)}
                    className="flex items-center gap-1.5 min-h-[44px] px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold active:scale-95"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Política de Privacidade</span>
                  </button>
                </div>
              </div>

              {/* Destructive Factory Reset */}
              <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/15 space-y-2">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className="text-sm font-bold">Zona de Perigo: Reset de Fábrica</h3>
                </div>
                <p className="text-xs text-red-700 dark:text-red-300/80 leading-relaxed">
                  Esta ação excluirá permanentemente todos os veículos cadastrados, registros de abastecimento, despesas, postos e calibrações gravadas no navegador.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onFactoryReset}
                    className="flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-md active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Limpar Todos os Dados / Reset de Fábrica</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: NUVEM SUPABASE */}
          {activeSection === 'supabase' && (
            <div className="space-y-5">

              {/* Cloud Sync Actions */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-500" />
                  Sincronização Bidirecional (Nuvem ⇄ Local)
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Envie os dados locais do seu navegador para o Supabase ou baixe os registros salvos na nuvem para qualquer aparelho.
                </p>

                {syncFeedback && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                      syncFeedback.ok
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{syncFeedback.message}</span>
                  </div>
                )}

                {downloadFeedback && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                      downloadFeedback.ok
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{downloadFeedback.message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncToSupabase}
                    disabled={isSyncingSupabase}
                    className="flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-60"
                  >
                    <CloudUpload className={`w-4 h-4 ${isSyncingSupabase ? 'animate-bounce' : ''}`} />
                    <span>{isSyncingSupabase ? 'Enviando...' : 'Enviar Dados para Nuvem (Upload)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadFromSupabase}
                    disabled={isDownloadingSupabase}
                    className="flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-bold text-xs transition-all shadow-xs active:scale-95 disabled:opacity-60"
                  >
                    <CloudDownload className={`w-4 h-4 ${isDownloadingSupabase ? 'animate-bounce' : ''}`} />
                    <span>{isDownloadingSupabase ? 'Baixando...' : 'Baixar Dados da Nuvem (Download)'}</span>
                  </button>
                </div>
              </div>

              {/* SQL Schema Script Helper */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                      Script SQL das Tabelas (Supabase SQL Editor)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-xs active:scale-95"
                      title="Copiar SQL para a área de transferência"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSqlScript(prev => !prev)}
                      className="px-3 min-h-[44px] rounded-xl border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-300 transition-all active:scale-95"
                    >
                      {showSqlScript ? 'Ocultar' : 'Ver Código'}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Caso deseje criar as tabelas relacionais no seu Supabase, clique em <strong>Copiar SQL</strong> e cole na aba <strong>SQL Editor</strong> do painel Supabase.
                </p>

                {showSqlScript && (
                  <div className="relative mt-2">
                    <pre className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-emerald-400 font-mono text-xs leading-relaxed overflow-x-auto max-h-60 overflow-y-auto selection:bg-emerald-500 selection:text-black">
                      {SUPABASE_SCHEMA_SQL}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <img
              src="/icon-192x192.png"
              alt="Logo PitStop"
              className="w-5 h-5 rounded-md object-cover ring-1 ring-slate-200 dark:ring-neutral-700 shrink-0"
            />
            <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
              PitStop v1.5.0 • © {new Date().getFullYear()}
            </span>
            <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="text-xs font-medium text-slate-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 underline-offset-2 hover:underline"
            >
              Termos de Uso
            </button>
            <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="text-xs font-medium text-slate-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-all shadow-md active:scale-95 shrink-0"
          >
            Concluir
          </button>
        </div>
      </div>

      {/* Terms & Privacy Modals */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
};
