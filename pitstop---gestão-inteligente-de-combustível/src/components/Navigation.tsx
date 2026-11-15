import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Navigation2,
  Scale,
  Car,
  Plus,
  Fuel,
  FileBarChart,
  Receipt,
  ShieldCheck,
  X
} from 'lucide-react';

export type NavTab = 'dashboard' | 'road' | 'flex' | 'reports' | 'garage' | 'admin';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenFuelModal: () => void;
  onOpenExpenseModal: () => void;
  isAdmin?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenFuelModal,
  onOpenExpenseModal,
  isAdmin = false,
}) => {
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const fabMenuRef = useRef<HTMLDivElement>(null);

  const baseTabs = [
    { id: 'dashboard', label: 'Painel', shortLabel: 'Painel', icon: LayoutDashboard },
    { id: 'road', label: 'Estrada', shortLabel: 'Estrada', icon: Navigation2 },
    { id: 'flex', label: 'Calculadora Flex & Postos', shortLabel: 'Flex', icon: Scale },
    { id: 'reports', label: 'Relatórios', shortLabel: 'Relatórios', icon: FileBarChart },
    { id: 'garage', label: 'Garagem & Dados', shortLabel: 'Garagem', icon: Car },
  ];

  const tabs = isAdmin
    ? [
        ...baseTabs,
        { id: 'admin', label: 'Admin / Gestão SaaS', shortLabel: 'Admin', icon: ShieldCheck },
      ]
    : baseTabs;

  // Close speed dial on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabMenuRef.current && !fabMenuRef.current.contains(event.target as Node)) {
        setIsFabMenuOpen(false);
      }
    };
    if (isFabMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFabMenuOpen]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFabMenuOpen) {
        setIsFabMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFabMenuOpen]);

  return (
    <>
      {/* Desktop Horizontal Sub-Navigation Tab Bar (lg+) */}
      <nav className="hidden lg:flex lg:mt-[calc(3.75rem+max(0.75rem,env(safe-area-inset-top)))] items-center justify-between border-b border-slate-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/40 px-6 py-2 transition-colors print:hidden">
        <div className="max-w-7xl mx-auto w-full flex items-center gap-1.5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id as NavTab)}
                className={`flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-xs font-semibold transition-all active:scale-95 whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-neutral-700/60'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800/40'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-neutral-400'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile & Tablet Fixed Translucent Bottom Navigation Bar (< 1024px) */}
      <nav
        aria-label="Navegação principal"
        className={`lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border-t border-slate-200 dark:border-neutral-800 px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] grid ${
          isAdmin ? 'grid-cols-6' : 'grid-cols-5'
        } items-center gap-0.5 transition-colors print:hidden`}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id as NavTab)}
              className={`flex flex-col items-center justify-center min-h-[48px] px-0.5 rounded-xl transition-all active:scale-95 ${
                active
                  ? tab.id === 'admin'
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="text-[11px] font-semibold leading-tight truncate max-w-full">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Speed Dial Container & Floating Action Button (FAB) */}
      {currentTab !== 'admin' && (
      <div
        ref={fabMenuRef}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-8 right-4 md:right-8 z-40 print:hidden"
      >
        {/* Speed Dial Options Menu */}
        {isFabMenuOpen && (
          <div className="absolute bottom-16 right-0 mb-2 w-64 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsFabMenuOpen(false);
                onOpenFuelModal();
              }}
              className="w-full min-h-[48px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-neutral-200 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-all active:scale-95 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-sm leading-tight">Novo Abastecimento</span>
                <span className="text-xs font-normal text-slate-500 dark:text-neutral-400 block">
                  Litragem, preço e posto
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsFabMenuOpen(false);
                onOpenExpenseModal();
              }}
              className="w-full min-h-[48px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-neutral-200 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-all active:scale-95 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-sm leading-tight">Nova Despesa Extra</span>
                <span className="text-xs font-normal text-slate-500 dark:text-neutral-400 block">
                  IPVA, seguro, pedágio, etc.
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Primary Circular Icon-Only FAB Button */}
        <button
          type="button"
          onClick={() => setIsFabMenuOpen(prev => !prev)}
          aria-label={isFabMenuOpen ? 'Fechar menu de ações' : 'Novo Registro'}
          aria-expanded={isFabMenuOpen}
          title="Novo Registro"
          className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-xl shadow-amber-500/30 active:scale-95 transition-all group"
        >
          {isFabMenuOpen ? (
            <X className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" />
          ) : (
            <Plus className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" />
          )}
        </button>
      </div>
      )}
    </>
  );
};
