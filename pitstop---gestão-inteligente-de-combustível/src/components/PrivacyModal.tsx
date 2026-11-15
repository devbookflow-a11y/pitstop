import React from 'react';
import { X, Lock, CheckCircle2, MapPin, Database, EyeOff } from 'lucide-react';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[92dvh] sm:max-h-[85vh] bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-neutral-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
      >
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-title" className="text-base font-bold text-slate-900 dark:text-neutral-100">
                Política de Privacidade
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Como tratamos e protegemos suas informações veiculares
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300">
            <p className="font-semibold text-xs mb-1 flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-emerald-500 shrink-0" />
              Compromisso de Zero Rastreamento e Zero Venda de Dados
            </p>
            <p className="text-xs leading-normal opacity-90">
              Sua privacidade é inviolável. Seus dados de combustível, quilometragem, rotas e custos pertencem única e exclusivamente a você.
            </p>
          </div>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-500" />
              1. Armazenamento Local e Soberania dos Dados
            </h3>
            <p>
              O PitStop adota a filosofia <em>Local-First / Offline-First</em>. Seus veículos, hodômetros, custos, recibos e manutenções são gravados diretamente no armazenamento privado do seu navegador web (<code className="font-mono bg-slate-100 dark:bg-neutral-800 px-1 py-0.5 rounded">localStorage</code>), permanecendo no seu dispositivo físico.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-500" />
              2. Uso da Geolocalização (GPS)
            </h3>
            <p>
              O recurso de <strong>Detecção de Posto Próximo</strong> utiliza a API de Geolocalização do navegador (<code className="font-mono bg-slate-100 dark:bg-neutral-800 px-1 py-0.5 rounded">navigator.geolocation</code>) pontualmente apenas no momento em que você clica no botão de localização.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-neutral-400">
              <li>O app <strong>não realiza rastreamento contínuo em segundo plano</strong>.</li>
              <li>O cálculo de proximidade com os postos é executado matematicamente no próprio aparelho através da fórmula de Haversine.</li>
              <li>As coordenadas nunca são transmitidas a terceiros ou corretores de dados.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              3. Ausência de Publicidade Invasiva e Cookies Rastreadores
            </h3>
            <p>
              Não utilizamos cookies de terceiros para publicidade direcionada, nem instalamos pixels de telemetria invasiva ou scripts de analytics que monitorem seu comportamento fora da aplicação.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              4. Portabilidade e Direito à Exclusão (LGPD)
            </h3>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD):
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-neutral-400">
              <li><strong>Portabilidade Total:</strong> Você pode a qualquer instante exportar 100% dos seus dados em formato aberto padrão JSON ou relatórios em planilha CSV.</li>
              <li><strong>Direito ao Esquecimento:</strong> Você pode apagar todos os registros acumulados através do botão <em>"Reset de Fábrica"</em> localizado nas Configurações, limpando permanentemente todas as chaves do armazenamento local.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              5. Contato e Dúvidas
            </h3>
            <p>
              Caso tenha dúvidas sobre como suas informações são tratadas ou queira fornecer sugestões, a seção de configurações disponibiliza links rápidos de suporte e auditoria de dados.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60">
          {showAcceptButton && onAccept ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 min-h-[44px] text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-xl transition-all active:scale-95"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 min-h-[44px] text-xs font-bold text-neutral-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all shadow-md active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                Concordar e Continuar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 min-h-[44px] text-xs font-bold text-neutral-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all shadow-md active:scale-95"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
