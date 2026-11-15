import React, { useState, useEffect } from 'react';
import { X, Wrench, AlertCircle } from 'lucide-react';
import { MaintenanceItem } from '../types';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<MaintenanceItem, 'id'> | MaintenanceItem) => void;
  vehicleId: string;
  currentVehicleOdometer: number;
  initialItem?: MaintenanceItem | null;
}

const CATEGORIES: { id: MaintenanceItem['category']; label: string }[] = [
  { id: 'oleo', label: '🛢️ Óleo e Filtro' },
  { id: 'filtros', label: '💨 Filtro de Ar / Cabine' },
  { id: 'pneus', label: '🛞 Pneus e Alinhamento' },
  { id: 'freios', label: '🛑 Pastilhas e Fluido Freio' },
  { id: 'ignicao', label: '⚡ Velas de Ignição' },
  { id: 'correias', label: '⛓️ Correias e Transmissão' },
  { id: 'geral', label: '🔧 Revisão Geral' },
];

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicleId,
  currentVehicleOdometer,
  initialItem,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MaintenanceItem['category']>('oleo');
  const [intervalKm, setIntervalKm] = useState<number | ''>(10000);
  const [lastDoneOdometer, setLastDoneOdometer] = useState<number | ''>(currentVehicleOdometer);
  const [lastDoneDate, setLastDoneDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (initialItem) {
        setTitle(initialItem.title);
        setCategory(initialItem.category);
        setIntervalKm(initialItem.intervalKm);
        setLastDoneOdometer(initialItem.lastDoneOdometer);
        setLastDoneDate(initialItem.lastDoneDate);
        setNotes(initialItem.notes || '');
      } else {
        setTitle('Troca de Óleo e Filtro');
        setCategory('oleo');
        setIntervalKm(10000);
        setLastDoneOdometer(currentVehicleOdometer);
        setLastDoneDate(new Date().toISOString().slice(0, 10));
        setNotes('');
      }
    }
  }, [isOpen, initialItem, currentVehicleOdometer]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Informe o nome da manutenção.');
      return;
    }
    const intVal = typeof intervalKm === 'number' ? intervalKm : parseFloat(intervalKm as string);
    const lastOdo = typeof lastDoneOdometer === 'number' ? lastDoneOdometer : parseFloat(lastDoneOdometer as string);

    if (isNaN(intVal) || intVal <= 0) {
      setErrorMsg('Informe um intervalo de km válido.');
      return;
    }
    if (isNaN(lastOdo) || lastOdo < 0) {
      setErrorMsg('Informe o hodômetro da última realização.');
      return;
    }

    if (initialItem) {
      onSave({
        ...initialItem,
        title: title.trim(),
        category,
        intervalKm: Math.round(intVal),
        lastDoneOdometer: Math.round(lastOdo),
        lastDoneDate,
        notes: notes.trim(),
      });
    } else {
      onSave({
        vehicleId,
        title: title.trim(),
        category,
        intervalKm: Math.round(intVal),
        lastDoneOdometer: Math.round(lastOdo),
        lastDoneDate,
        notes: notes.trim(),
      });
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[92dvh] pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-colors">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {initialItem ? 'Editar Lembrete' : 'Novo Alerta de Manutenção'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-neutral-100 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
              Título da Manutenção
            </label>
            <input
              type="text"
              placeholder="ex: Troca de Óleo e Filtro"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as MaintenanceItem['category'])}
              className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Intervalo (km)
              </label>
              <input
                type="number"
                placeholder="ex: 10000"
                value={intervalKm}
                onChange={e => setIntervalKm(e.target.value === '' ? '' : parseFloat(e.target.value))}
                required
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Último Feito em (km)
              </label>
              <input
                type="number"
                placeholder="ex: 40000"
                value={lastDoneOdometer}
                onChange={e => setLastDoneOdometer(e.target.value === '' ? '' : parseFloat(e.target.value))}
                required
                className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 font-mono-numbers focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
              Data da Última Realização
            </label>
            <input
              type="date"
              value={lastDoneDate}
              onChange={e => setLastDoneDate(e.target.value)}
              required
              className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
              Observações / Especificações (opcional)
            </label>
            <input
              type="text"
              placeholder="ex: 0W-20 API SP sintético"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 min-h-[44px] text-base sm:text-sm bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 min-h-[44px] text-xs font-medium text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-xl transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 min-h-[44px] text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all active:scale-95"
            >
              Salvar Lembrete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
