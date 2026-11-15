import React from 'react';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
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
        aria-labelledby="terms-title"
      >
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="terms-title" className="text-base font-bold text-slate-900 dark:text-neutral-100">
                Termos de Uso
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Condições de uso do PitStop & Gestão Veicular
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
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300">
            <p className="font-semibold text-xs mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
              Transparência e Responsabilidade
            </p>
            <p className="text-xs leading-normal opacity-90">
              O PitStop é uma aplicação para monitoramento, cálculo e gestão de eficiência de combustível, despesas e manutenções veiculares. Ao utilizar a plataforma, você concorda com as diretrizes descritas a seguir.
            </p>
          </div>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              1. Finalidade do Aplicativo
            </h3>
            <p>
              O PitStop tem por objetivo auxiliar proprietários de automóveis e motocicletas a registrarem paradas de abastecimento, apurarem consumo médio real (km/L), custos por quilômetro (R$/km), despesas extras e cronogramas de calibragem e manutenção preventiva.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              2. Responsabilidade sobre os Dados Inseridos
            </h3>
            <p>
              A precisão dos indicadores, alertas de anomalia e projeções depende estritamente da veracidade dos dados lançados pelo usuário (como odômetro, litragem e tipo de combustível). O usuário é o único responsável pela integridade das informações cadastradas.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              3. Segurança no Trânsito (Uso Seguro)
            </h3>
            <p className="font-medium text-slate-800 dark:text-neutral-200">
              É terminantemente vedada a utilização do aplicativo enquanto você estiver conduzindo o veículo. Quaisquer registros ou consultas devem ser realizados com o veículo devidamente estacionado e em local seguro.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              4. Arquitetura Local-First (Armazenamento no Navegador)
            </h3>
            <p>
              Por padrão, seus veículos, históricos e registros são salvos localmente na memória do seu navegador (<code className="font-mono bg-slate-100 dark:bg-neutral-800 px-1 py-0.5 rounded">localStorage</code>). Recomendamos a utilização periódica da ferramenta de <strong>Exportar Backup JSON</strong> para garantir a posse e custódia segura do seu histórico.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              5. Caráter Informativo e Preditivo
            </h3>
            <p>
              As projeções de próximo abastecimento, radar de autonomia de estrada e alertas de calibragem de pneus são estimativas matemáticas calculadas com base em médias históricas. Elas não substituem a observação direta dos marcadores físicos do painel do veículo nem o manual do fabricante.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              6. Atualizações dos Termos
            </h3>
            <p>
              Estes termos podem ser atualizados para refletir melhorias no app ou conformidade legal. A versão vigente estará sempre acessível nas configurações e no rodapé do aplicativo.
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
                className="flex items-center gap-1.5 px-4 min-h-[44px] text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                Concordar e Continuar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 min-h-[44px] text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md active:scale-95"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
