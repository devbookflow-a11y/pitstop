import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  Upload,
  Database,
  FileJson,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdminUserSummary, AuthUser } from '../../types';
import {
  adapterExportGlobalBackupJson,
  adapterExportUserBackupJson,
  adapterParseAdminBackupJson,
  adapterRestoreUserBackup,
  ParsedAdminBackupPreview,
} from '../../lib/storageAdapter';

interface AdminBackupsTabProps {
  users: AdminUserSummary[];
  currentUser: AuthUser;
  onRefresh: () => Promise<void>;
  onDataMutatedForCurrentUser: () => Promise<void>;
  onRequestConfirm: (opts: {
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  }) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AdminBackupsTab: React.FC<AdminBackupsTabProps> = ({
  users,
  currentUser,
  onRefresh,
  onDataMutatedForCurrentUser,
  onRequestConfirm,
  onShowToast,
}) => {
  const [selectedExportUserId, setSelectedExportUserId] = useState<string>(
    () => users[0]?.id || currentUser.id
  );
  const [isExportingGlobal, setIsExportingGlobal] = useState(false);
  const [isExportingUser, setIsExportingUser] = useState(false);

  // Restore states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [parsedBackup, setParsedBackup] = useState<ParsedAdminBackupPreview | null>(null);
  const [selectedSourceUserId, setSelectedSourceUserId] = useState<string>('');
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>(
    () => users[0]?.id || currentUser.id
  );
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);

  const triggerDownload = (filename: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportGlobal = async () => {
    setIsExportingGlobal(true);
    try {
      const payload = await adapterExportGlobalBackupJson(currentUser);
      const today = new Date().toISOString().slice(0, 10);
      triggerDownload(`pitstop-backup-global-${today}.json`, payload);
      onShowToast('Backup global da plataforma exportado com sucesso.', 'success');
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'Falha ao gerar backup global.',
        'error'
      );
    } finally {
      setIsExportingGlobal(false);
    }
  };

  const handleExportSelectedUser = async () => {
    const targetId = selectedExportUserId || users[0]?.id;
    if (!targetId) {
      onShowToast('Selecione um usuário válido.', 'warning');
      return;
    }
    setIsExportingUser(true);
    try {
      const userObj = users.find(u => u.id === targetId);
      const payload = await adapterExportUserBackupJson(targetId, currentUser);
      const safeEmail = (userObj?.email || targetId).replace(/[^a-zA-Z0-9._@-]/g, '_');
      const today = new Date().toISOString().slice(0, 10);
      triggerDownload(`pitstop-backup-usuario-${safeEmail}-${today}.json`, payload);
      onShowToast(`Backup JSON de ${userObj?.email || 'usuário'} exportado.`, 'success');
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'Falha ao gerar backup do usuário.',
        'error'
      );
    } finally {
      setIsExportingUser(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = String(ev.target?.result || '');
        const parsed = adapterParseAdminBackupJson(text);
        setParsedBackup(parsed);
        setUploadedFileName(file.name);

        const defaultSourceId = parsed.availableSourceUsers[0]?.id || '';
        setSelectedSourceUserId(defaultSourceId);

        // Auto-detect matching user in current database
        const matchedByEmail = parsed.detectedTargetEmail
          ? users.find(
              u => u.email.toLowerCase() === parsed.detectedTargetEmail!.toLowerCase()
            )
          : undefined;
        const matchedById = parsed.detectedTargetUserId
          ? users.find(u => u.id === parsed.detectedTargetUserId)
          : undefined;

        setSelectedTargetUserId(
          matchedById?.id || matchedByEmail?.id || users[0]?.id || currentUser.id
        );
      } catch (err) {
        setParsedBackup(null);
        setUploadedFileName('');
        onShowToast(
          err instanceof Error ? err.message : 'Não foi possível ler o arquivo JSON.',
          'error'
        );
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const previewData = useMemo(() => {
    if (!parsedBackup) return null;
    const sourceId =
      parsedBackup.format === 'global' ? selectedSourceUserId || undefined : undefined;
    return parsedBackup.extractForSourceUser(sourceId);
  }, [parsedBackup, selectedSourceUserId]);

  const previewTotalCount = useMemo(() => {
    if (!previewData) return 0;
    return (
      (previewData.vehicles?.length || 0) +
      (previewData.fuelLogs?.length || 0) +
      (previewData.stations?.length || 0) +
      (previewData.maintenanceItems?.length || 0) +
      (previewData.extraExpenses?.length || 0) +
      (previewData.tireCalibrations?.length || 0)
    );
  }, [previewData]);

  const handleConfirmRestore = () => {
    if (!previewData || !selectedTargetUserId) return;
    const targetUser = users.find(u => u.id === selectedTargetUserId);
    const isReplace = restoreMode === 'replace';

    onRequestConfirm({
      title: isReplace
        ? 'Substituir toda a base do usuário?'
        : 'Mesclar registros na conta do usuário?',
      description: (
        <div className="space-y-2">
          <p>
            Destino:{' '}
            <strong className="text-zinc-900 dark:text-white">
              {targetUser ? `${targetUser.nome} (${targetUser.email})` : selectedTargetUserId}
            </strong>
          </p>
          <p>
            {isReplace
              ? 'Todos os veículos, abastecimentos, postos, manutenções, despesas e calibragens atuais deste usuário serão substituídos pelos registros do backup.'
              : 'Os registros do backup serão adicionados à conta do usuário preservando dados existentes e ignorando duplicidades.'}
          </p>
        </div>
      ),
      confirmLabel: isReplace ? 'Substituir Dados' : 'Mesclar Registros',
      cancelLabel: 'Cancelar',
      variant: isReplace ? 'danger' : 'warning',
      onConfirm: async () => {
        setIsRestoring(true);
        try {
          const result = await adapterRestoreUserBackup(
            selectedTargetUserId,
            previewData,
            restoreMode
          );
          await onRefresh();
          if (selectedTargetUserId === currentUser.id) {
            await onDataMutatedForCurrentUser();
          }
          onShowToast(
            `Restauração concluída: ${result.count} registros processados para ${
              targetUser?.email || 'usuário'
            }.`,
            'success'
          );
          setParsedBackup(null);
          setUploadedFileName('');
        } catch (err) {
          onShowToast(
            err instanceof Error ? err.message : 'Erro ao restaurar backup JSON.',
            'error'
          );
        } finally {
          setIsRestoring(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Export Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Global Backup Export */}
        <section className="p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Backup Global da Plataforma
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Exporta todos os usuários e todas as tabelas em um único JSON estruturado
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1">
              Inclui cadastros, assinaturas, veículos, abastecimentos, postos, manutenções,
              despesas extras e calibragens vinculados ao respectivo <code className="font-mono">user_id</code>.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportGlobal}
            disabled={isExportingGlobal}
            className="w-full min-h-[46px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExportingGlobal
                ? 'Gerando Backup Completo...'
                : 'Exportar Backup Completo (.json)'}
            </span>
          </button>
        </section>

        {/* Per-User Export */}
        <section className="p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <FileJson className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Backup Individual por Usuário
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Exporte exclusivamente a base de dados de uma conta específica
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                Selecionar Usuário
              </label>
              <select
                value={selectedExportUserId}
                onChange={e => setSelectedExportUserId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.email}) — {u.vehicleCount} veíc. / {u.fuelLogCount} abast.
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportSelectedUser}
            disabled={isExportingUser || users.length === 0}
            className="w-full min-h-[46px] px-4 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 border border-zinc-700 transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>
              {isExportingUser
                ? 'Exportando JSON...'
                : 'Exportar JSON do Usuário Selecionado'}
            </span>
          </button>
        </section>
      </div>

      {/* Granular JSON Restore */}
      <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-500" />
              Restauração Granular via JSON
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Carregue um arquivo .json (Global, por Usuário ou Padrão PitStop), valide a prévia
              dos registros e escolha o modo de importação.
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Selecionar Arquivo .json</span>
            </button>
          </div>
        </div>

        {parsedBackup && previewData && (
          <div className="space-y-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Arquivo carregado: <span className="text-zinc-900 dark:text-white">{uploadedFileName}</span>
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 font-mono-numbers tabular-nums">
                Formato: {parsedBackup.format.toUpperCase()} · Total detectado: {previewTotalCount}{' '}
                registros
              </span>
            </div>

            {/* Source (if global) & Target User Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parsedBackup.format === 'global' && parsedBackup.availableSourceUsers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Usuário de Origem no Backup Global
                  </label>
                  <select
                    value={selectedSourceUserId}
                    onChange={e => setSelectedSourceUserId(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Todos os registros combinados</option>
                    {parsedBackup.availableSourceUsers.map(su => (
                      <option key={su.id} value={su.id}>
                        {su.nome} ({su.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Conta de Destino na Restauração
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedTargetUserId}
                    onChange={e => setSelectedTargetUserId(e.target.value)}
                    className="w-full min-h-[44px] pl-9 pr-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Live Record Counts Preview */}
            <div>
              <span className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-2">
                Prévia dos Dados Encontrados
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  { label: 'Veículos', count: previewData.vehicles.length },
                  { label: 'Abastecimentos', count: previewData.fuelLogs.length },
                  { label: 'Postos', count: previewData.stations?.length || 0 },
                  { label: 'Manutenções', count: previewData.maintenanceItems.length },
                  { label: 'Despesas Extras', count: previewData.extraExpenses?.length || 0 },
                  { label: 'Calibragens', count: previewData.tireCalibrations?.length || 0 },
                ].map(item => (
                  <div
                    key={item.label}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800"
                  >
                    <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                      {item.label}
                    </span>
                    <span className="text-lg font-extrabold font-mono-numbers tabular-nums text-zinc-900 dark:text-white">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Restore Mode Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                  restoreMode === 'merge'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181B]'
                }`}
              >
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                  className="mt-1 accent-emerald-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-zinc-900 dark:text-white block">
                    Mesclar registros sem duplicar
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Preserva a base atual do usuário e adiciona apenas itens novos do JSON.
                  </span>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                  restoreMode === 'replace'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181B]'
                }`}
              >
                <input
                  type="radio"
                  name="restoreMode"
                  value="replace"
                  checked={restoreMode === 'replace'}
                  onChange={() => setRestoreMode('replace')}
                  className="mt-1 accent-red-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-zinc-900 dark:text-white block">
                    Substituir dados atuais do usuário
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Apaga os registros atuais do usuário destino e grava exatamente o conteúdo do JSON.
                  </span>
                </div>
              </label>
            </div>

            {restoreMode === 'replace' && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Atenção: o modo de substituição sobrescreverá os registros atuais da conta selecionada.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setParsedBackup(null);
                  setUploadedFileName('');
                }}
                className="min-h-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              >
                Limpar Seleção
              </button>
              <button
                type="button"
                disabled={isRestoring || previewTotalCount === 0}
                onClick={handleConfirmRestore}
                className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold transition-colors disabled:opacity-50"
              >
                {isRestoring ? 'Restaurando...' : 'Restaurar Base de Dados'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
