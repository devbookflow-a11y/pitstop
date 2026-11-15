import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Car,
  Plus,
  LayoutDashboard,
  Navigation2,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  locationHint: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClasses: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'garage',
    title: 'Garagem & Frota',
    subtitle: 'Configure seu veículo e acompanhe a manutenção',
    description:
      'Comece cadastrando seu veículo com hodômetro atual, capacidade do tanque, combustíveis aceitos e pressões recomendadas dos pneus (PSI).',
    highlights: [
      'Gerencie múltiplos veículos e alterne entre eles no Painel',
      'Controle revisões preventivas por quilometragem e despesas extras',
      'Consulte o Histórico de Calibragens dos pneus sempre que precisar',
    ],
    locationHint: 'Aba Garagem & Dados no menu principal',
    icon: Car,
    accentClasses: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
  },
  {
    id: 'quick-add',
    title: 'Botão + de Registros Rápidos',
    subtitle: 'Lance abastecimentos e despesas em segundos',
    description:
      'Use o botão flutuante + no canto inferior direito para registrar abastecimentos completos ou parciais, despesas extras e calibragens rápidas.',
    highlights: [
      'Informe litragem, preço por litro, posto e se completou o tanque',
      'Marque se calibrou os pneus no mesmo abastecimento',
      'Registre IPVA, seguro, pedágios ou lavagens para compor o TCO real',
    ],
    locationHint: 'Botão flutuante + no canto inferior direito da tela',
    icon: Plus,
    accentClasses: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  },
  {
    id: 'dashboard-radar',
    title: 'Painel & Radar Preditivo',
    subtitle: 'Consumo real, custos por km e autonomia inteligente',
    description:
      'O Painel calcula sua média real tanque a tanque (km/L), o custo por quilômetro (R$/km) e avisa antes do combustível acabar.',
    highlights: [
      'Radar de Próximo Abastecimento com data e km estimados',
      'Monitoramento de calibragem por dias e abastecimentos',
      'Alerta automático de queda anormal de rendimento (> 15%)',
    ],
    locationHint: 'Aba Painel (tela inicial do PitStop)',
    icon: LayoutDashboard,
    accentClasses: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
  },
  {
    id: 'road-flex',
    title: 'Estrada & Calculadora Flex',
    subtitle: 'Linha do tempo visual e decisão inteligente na bomba',
    description:
      'Revise cada parada na linha do tempo da Estrada e use a Calculadora Flex para comparar Etanol vs. Gasolina com base no rendimento real do seu carro.',
    highlights: [
      'Histórico cronológico com rendimento calculado entre tanques cheios',
      'Comparação Flex personalizada além da regra genérica dos 70%',
      'Ranking real de eficiência (km/L) por posto e bandeira',
    ],
    locationHint: 'Abas Estrada e Flex no menu de navegação',
    icon: Navigation2,
    accentClasses: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  },
  {
    id: 'reports-cloud',
    title: 'Relatórios & Nuvem Supabase',
    subtitle: 'Custo Total de Propriedade e dados seguros em qualquer aparelho',
    description:
      'Acompanhe a evolução de gastos em Relatórios e conte com sincronização automática na nuvem para acessar sua garagem no celular ou desktop.',
    highlights: [
      'Visão consolidada de TCO: combustível, manutenções e despesas extras',
      'Exportação para impressão/PDF e backup portátil em JSON',
      'Sincronização em nuvem vinculada à sua conta Supabase',
    ],
    locationHint: 'Aba Relatórios e menu Configurações → Nuvem Supabase',
    icon: FileBarChart,
    accentClasses: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
  },
];

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const currentStep = TOUR_STEPS[stepIndex];
  const StepIcon = currentStep.icon;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setStepIndex(prev => Math.min(totalSteps - 1, prev + 1));
    }
  }, [isLastStep, onComplete, totalSteps]);

  const handlePrev = useCallback(() => {
    setStepIndex(prev => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 pt-4 pb-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-500 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
                Tour Guiado · Passo {stepIndex + 1} de {totalSteps}
              </span>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Primeiros passos no PitStop
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar tour guiado"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Progress Bar (clickable steps) */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-5 gap-1.5" role="tablist" aria-label="Passos do tour">
            {TOUR_STEPS.map((step, idx) => {
              const isActive = idx === stepIndex;
              const isCompleted = idx < stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Ir para passo ${idx + 1}: ${step.title}`}
                  onClick={() => setStepIndex(idx)}
                  className="py-1.5 group focus:outline-none"
                >
                  <span
                    className={`block h-1.5 w-full rounded-full transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-500'
                        : isCompleted
                        ? 'bg-emerald-500'
                        : 'bg-zinc-200 dark:bg-zinc-800 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${currentStep.accentClasses}`}
            >
              <StepIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0 space-y-1">
              <h2
                id="guided-tour-title"
                className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white leading-snug"
              >
                {currentStep.title}
              </h2>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {currentStep.subtitle}
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {currentStep.description}
          </p>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
            <ul className="space-y-2">
              {currentStep.highlights.map(item => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
              Onde acessar: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{currentStep.locationHint}</span>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-5 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors active:scale-95 whitespace-nowrap"
          >
            Pular tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="min-h-[44px] px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1 transition-all active:scale-95 whitespace-nowrap"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95 whitespace-nowrap"
            >
              <span>{isLastStep ? 'Concluir Tour' : 'Próximo'}</span>
              {isLastStep ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
