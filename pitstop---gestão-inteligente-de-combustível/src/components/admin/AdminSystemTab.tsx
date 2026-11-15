import React, { useEffect, useState } from 'react';
import {
  Megaphone,
  Wrench,
  Info,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import {
  AuthUser,
  GlobalAnnouncementType,
  SystemConfig,
} from '../../types';
import { adapterSaveSystemConfig } from '../../lib/storageAdapter';

interface AdminSystemTabProps {
  systemConfig: SystemConfig;
  currentUser: AuthUser;
  onSystemConfigUpdated: (nextConfig: SystemConfig) => void;
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

export const AdminSystemTab: React.FC<AdminSystemTabProps> = ({
  systemConfig,
  currentUser,
  onSystemConfigUpdated,
  onRequestConfirm,
  onShowToast,
}) => {
  // Announcement state
  const [title, setTitle] = useState(systemConfig.announcement.title);
  const [message, setMessage] = useState(systemConfig.announcement.message);
  const [type, setType] = useState<GlobalAnnouncementType>(systemConfig.announcement.type);
  const [active, setActive] = useState(systemConfig.announcement.active);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Maintenance state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(systemConfig.maintenance.enabled);
  const [maintenanceMessage, setMaintenanceMessage] = useState(systemConfig.maintenance.message);
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);

  useEffect(() => {
    setTitle(systemConfig.announcement.title);
    setMessage(systemConfig.announcement.message);
    setType(systemConfig.announcement.type);
    setActive(systemConfig.announcement.active);
    setMaintenanceEnabled(systemConfig.maintenance.enabled);
    setMaintenanceMessage(systemConfig.maintenance.message);
  }, [systemConfig]);

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (active && (!title.trim() || !message.trim())) {
      onShowToast('Informe um título e uma mensagem para publicar o comunicado.', 'warning');
      return;
    }
    setIsSavingAnnouncement(true);
    try {
      const next: SystemConfig = {
        ...systemConfig,
        announcement: {
          id: `msg_${Date.now()}`,
          title: title.trim(),
          message: message.trim(),
          type,
          active,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.email,
        },
      };
      const saved = await adapterSaveSystemConfig(next);
      onSystemConfigUpdated(saved);
      onShowToast(
        active
          ? 'Comunicado global publicado no topo do Painel!'
          : 'Comunicado global atualizado e ocultado.',
        'success'
      );
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'Erro ao salvar mensagem global.',
        'error'
      );
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const applyMaintenanceSave = async () => {
    setIsSavingMaintenance(true);
    try {
      const next: SystemConfig = {
        ...systemConfig,
        maintenance: {
          enabled: maintenanceEnabled,
          message:
            maintenanceMessage.trim() ||
            'Estamos realizando melhorias programadas no banco de dados. Voltamos em alguns minutos.',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.email,
        },
      };
      const saved = await adapterSaveSystemConfig(next);
      onSystemConfigUpdated(saved);
      onShowToast(
        maintenanceEnabled
          ? 'Modo Manutenção ATIVADO para usuários comuns.'
          : 'Modo Manutenção DESATIVADO. Plataforma liberada.',
        'success'
      );
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'Erro ao atualizar modo manutenção.',
        'error'
      );
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  const handleSaveMaintenance = () => {
    if (maintenanceEnabled && !systemConfig.maintenance.enabled) {
      onRequestConfirm({
        title: 'Ativar Modo Manutenção do Sistema?',
        description:
          'Todos os usuários comuns visualizarão a tela de bloqueio por manutenção e não poderão operar o aplicativo. Contas Administradoras continuam com acesso normal.',
        confirmLabel: 'Ativar Manutenção',
        cancelLabel: 'Cancelar',
        variant: 'warning',
        onConfirm: applyMaintenanceSave,
      });
      return;
    }
    void applyMaintenanceSave();
  };

  const previewBannerClass =
    type === 'news'
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
      : type === 'warning'
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
      : 'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-100';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mensagem Global (Banner) */}
      <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Mensagem Global (Banner no Painel)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Exibe um comunicado dispensável no topo do Painel de todos os usuários
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-zinc-300 dark:bg-zinc-700 peer-checked:bg-emerald-500 rounded-full relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
              {active ? 'Ativo' : 'Inativo'}
            </span>
          </label>
        </div>

        <form onSubmit={handleSaveAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tipo do Comunicado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'info' as const, label: 'Informativo', icon: Info },
                { id: 'news' as const, label: 'Novidade', icon: Sparkles },
                { id: 'warning' as const, label: 'Alerta', icon: AlertTriangle },
              ].map(opt => {
                const Icon = opt.icon;
                const selected = type === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id)}
                    className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      selected
                        ? opt.id === 'news'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : opt.id === 'warning'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181B] text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Título do Comunicado
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex.: Nova Calculadora Flex 2.0 disponível"
              className="w-full min-h-[44px] px-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Mensagem
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escreva os detalhes do comunicado para os usuários..."
              className="w-full p-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {(title.trim() || message.trim()) && (
            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Pré-visualização do Banner
              </span>
              <div className={`p-3.5 rounded-xl border text-xs ${previewBannerClass}`}>
                <strong className="block font-bold">{title || 'Título do comunicado'}</strong>
                <span className="opacity-90">{message || 'Texto da mensagem...'}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingAnnouncement}
            className="w-full min-h-[46px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSavingAnnouncement ? 'Publicando...' : 'Publicar Mensagem Global'}
            </span>
          </button>
        </form>
      </section>

      {/* Modo Manutenção do Sistema */}
      <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-5">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Modo Manutenção do Sistema
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Bloqueia temporariamente usuários comuns mantendo acesso completo para Admins
                </p>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              maintenanceEnabled
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-zinc-50 dark:bg-[#18181B] border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                Ativar Modo Manutenção
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                {maintenanceEnabled
                  ? 'Bloqueio ativo para usuários padrão'
                  : 'Sistema operando normalmente para todos'}
              </span>
            </div>

            <label className="inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                onChange={e => setMaintenanceEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-checked:bg-amber-500 rounded-full relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Mensagem de Manutenção Exibida aos Usuários
            </label>
            <textarea
              rows={4}
              value={maintenanceMessage}
              onChange={e => setMaintenanceMessage(e.target.value)}
              placeholder="Estamos realizando melhorias no banco de dados. Voltamos em alguns minutos."
              className="w-full p-3.5 bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
            <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              Administradores nunca são bloqueados pelo Modo Manutenção e continuam com o indicador
              discreto no topo da tela para desativá-lo quando desejarem.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveMaintenance}
          disabled={isSavingMaintenance}
          className={`w-full min-h-[46px] px-4 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
            maintenanceEnabled
              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
              : 'bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white border border-zinc-700'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>
            {isSavingMaintenance
              ? 'Aplicando configuração...'
              : maintenanceEnabled
              ? 'Confirmar Modo Manutenção'
              : 'Salvar Configuração de Manutenção'}
          </span>
        </button>
      </section>
    </div>
  );
};
