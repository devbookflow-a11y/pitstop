import React from 'react';

interface FooterProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTerms, onOpenPrivacy }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-10 print:hidden">
      <div className="border-t border-slate-200/80 dark:border-neutral-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-neutral-400">
        {/* Brand, Version & Copyright */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-2">
            <img
              src="/icon-192x192.png"
              alt="Logo PitStop"
              className="w-5 h-5 rounded-md object-cover ring-1 ring-slate-200 dark:ring-neutral-700 shrink-0"
            />
            <span className="font-bold text-slate-800 dark:text-neutral-200 tracking-tight">
              PitStop
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-300 dark:text-neutral-700">
            •
          </span>
          <span>v1.5.0 • Gestão Inteligente de Combustível</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-neutral-700">
            •
          </span>
          <span>© {currentYear} PitStop</span>
        </div>

        {/* Legal Links */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenTerms}
            className="min-h-[44px] px-3 rounded-xl font-medium text-slate-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-neutral-800/60 transition-colors active:scale-95"
          >
            Termos de Uso
          </button>
          <span aria-hidden="true" className="text-slate-300 dark:text-neutral-700">
            ·
          </span>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="min-h-[44px] px-3 rounded-xl font-medium text-slate-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-neutral-800/60 transition-colors active:scale-95"
          >
            Política de Privacidade
          </button>
        </div>
      </div>
    </footer>
  );
};
