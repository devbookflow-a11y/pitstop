import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  DollarSign,
  Calendar,
  Gauge,
  Repeat,
  AlertCircle,
  Tag
} from 'lucide-react';
import { ExtraExpense, ExpenseCategory, ExpenseRecurrence } from '../types';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<ExtraExpense, 'id'> | ExtraExpense) => void;
  vehicleId: string;
  currentVehicleOdometer?: number;
  initialExpense?: ExtraExpense | null;
}

export const EXPENSE_CATEGORIES: {
  id: ExpenseCategory;
  label: string;
  icon: string;
  badgeClass: string;
}[] = [
  {
    id: 'ipva_impostos',
    label: 'IPVA / Impostos',
    icon: '🏛️',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    id: 'seguro',
    label: 'Seguro',
    icon: '🛡️',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  {
    id: 'licenciamento_taxas',
    label: 'Licenciamento / Taxas',
    icon: '📄',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'estacionamento_pedagio',
    label: 'Estacionamento / Pedágio',
    icon: '🅿️',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  {
    id: 'lavagem_estetica',
    label: 'Lavagem / Estética',
    icon: '🧼',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  },
  {
    id: 'multas',
    label: 'Multas',
    icon: '⚠️',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  {
    id: 'outros',
    label: 'Outros',
    icon: '🏷️',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
];

export const EXPENSE_RECURRENCES: {
  id: ExpenseRecurrence;
  label: string;
}[] = [
  { id: 'unica', label: 'Única / Pontual' },
  { id: 'mensal', label: 'Recorrente Mensal' },
  { id: 'anual', label: 'Recorrente Anual' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicleId,
  currentVehicleOdometer = 0,
  initialExpense,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('ipva_impostos');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState<number | ''>(currentVehicleOdometer || '');
  const [recurrence, setRecurrence] = useState<ExpenseRecurrence>('unica');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (initialExpense) {
        setCategory(initialExpense.category);
        setDescription(initialExpense.description);
        setAmount(initialExpense.amount ? initialExpense.amount.toString() : '');
        setDate(initialExpense.date);
        setOdometer(initialExpense.odometer !== undefined ? initialExpense.odometer : '');
        setRecurrence(initialExpense.recurrence || 'unica');
        setNotes(initialExpense.notes || '');
      } else {
        setCategory('estacionamento_pedagio');
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().slice(0, 10));
        setOdometer(currentVehicleOdometer || '');
        setRecurrence('unica');
        setNotes('');
      }
    }
  }, [isOpen, initialExpense, currentVehicleOdometer]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setErrorMsg('Por favor, informe uma descrição para a despesa.');
      return;
    }

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('O valor da despesa deve ser maior que zero (R$).');
      return;
    }

    if (!date) {
      setErrorMsg('Informe a data da despesa.');
      return;
    }

    const expensePayload: Omit<ExtraExpense, 'id'> | ExtraExpense = {
      ...(initialExpense ? { id: initialExpense.id } : {}),
      vehicleId,
      date,
      category,
      description: description.trim(),
      amount: parsedAmount,
      odometer: typeof odometer === 'number' && odometer > 0 ? odometer : undefined,
      recurrence,
      notes: notes.trim() || undefined,
    };

    onSave(expensePayload);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl transition-all scale-100 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mb-3 sm:hidden" />
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight">
                {initialExpense ? 'Editar Despesa Extra' : 'Nova Despesa Extra'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Gastos não-combustível (IPVA, Seguro, Pedágio, Estética)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Category Select Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-2">
              Categoria da Despesa
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-2.5 min-h-[44px] rounded-xl text-xs font-medium border text-left transition-all active:scale-95 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 text-slate-700 dark:text-neutral-300 hover:border-slate-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Descrição do Gasto
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Parcela 1/3 IPVA 2026, Renovação Seguro Auto..."
              className="w-full min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Amount and Date (2 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
                Valor Total (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3.5 min-h-[44px] text-base sm:text-sm font-mono-numbers font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
                Data do Pagamento
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3.5 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Odometer and Recurrence (2 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
                Hodômetro (km - Opcional)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={odometer}
                  onChange={e => setOdometer(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Ex: 45000"
                  className="w-full px-3.5 pr-10 min-h-[44px] text-base sm:text-sm font-mono-numbers bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                  km
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
                Recorrência
              </label>
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as ExpenseRecurrence)}
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
              >
                {EXPENSE_RECURRENCES.map(rec => (
                  <option key={rec.id} value={rec.id}>
                    {rec.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Observações / Detalhes (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Nota fiscal nº 1234, franquia reduzida, 3x sem juros..."
              className="w-full min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 min-h-[44px] text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 min-h-[44px] text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>{initialExpense ? 'Salvar Alterações' : 'Cadastrar Despesa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
