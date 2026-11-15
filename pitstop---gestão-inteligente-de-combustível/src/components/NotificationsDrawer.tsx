import React, { useRef, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Disc,
  Fuel,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { AppNotification } from '../types';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onNotificationClick: (notif: AppNotification) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onNotificationClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(isOpen);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'tire':
        return <Disc className="w-4 h-4 text-sky-500" />;
      case 'fuel':
        return <Fuel className="w-4 h-4 text-amber-500" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-emerald-500" />;
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getSeverityBg = (severity: AppNotification['severity'], read: boolean) => {
    if (read) return 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 opacity-75';
    switch (severity) {
      case 'urgent':
        return 'bg-red-50/60 dark:bg-red-950/20 border-red-300 dark:border-red-900/50';
      case 'warning':
        return 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/50';
      case 'info':
      default:
        return 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-300 dark:border-sky-900/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end animate-in fade-in duration-150">
      <div
        ref={containerRef}
        className="w-full sm:max-w-md bg-white dark:bg-neutral-900 max-h-[88dvh] sm:max-h-full sm:h-full rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-neutral-800 shadow-2xl flex flex-col text-slate-900 dark:text-neutral-100 pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
      >
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50/80 dark:bg-neutral-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                  Central de Alertas
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-500 text-white animate-pulse">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Monitoramento ativo da sua telemetria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl text-slate-500 hover:text-amber-600 dark:text-neutral-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors text-xs flex items-center justify-center gap-1 active:scale-95"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Lidas</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
              aria-label="Fechar painel de notificações"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-400 mb-3">
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-neutral-300">
                Nenhum alerta pendente
              </p>
              <p className="text-xs text-slate-500 dark:text-neutral-500 mt-1 max-w-xs">
                Seu veículo está com a telemetria em dia! Avisaremos assim que houver calibragem, manutenção ou autonomia a monitorar.
              </p>
            </div>
          ) : (
            notifications.map(notif => (
              <button
                key={notif.id}
                type="button"
                onClick={() => {
                  onNotificationClick(notif);
                  onClose();
                }}
                className={`w-full text-left p-3.5 min-h-[44px] rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-[0.99] group ${getSeverityBg(
                  notif.severity,
                  notif.read
                )}`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 flex-1">
                    <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shrink-0 shadow-xs mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-2 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{notif.date}</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/60 text-center">
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Alertas em tempo real com base no hodômetro e histórico veicular
          </p>
        </div>
      </div>
    </div>
  );
};
