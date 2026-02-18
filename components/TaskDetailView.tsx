import React, { useState, useCallback } from 'react';
import { X, Plus, Trash2, ChevronDown, Lock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Task, Assignee, EquipmentItem, EquipmentCategory } from '../types';

interface TaskDetailViewProps {
  task: Task;
  milestoneName: string;
  assigneeOptions: Assignee[];
  scheduledDate?: Date;
  isConflicted?: boolean;
  isTimedConflict?: boolean;
  conflictingAppointmentTime?: string;
  pinnedHasNoTime?: boolean;
  onSave: (updatedTask: Task) => void;
  onClose: () => void;
}

const toDateInputValue = (date: Date) => format(date, 'yyyy-MM-dd');

// Parses "yyyy-MM-dd" as LOCAL midnight — avoids UTC timezone offset bug.
const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  material: 'Materiell',
  rental: 'Leie',
  equipment: 'Eget utstyr',
};

const formatNok = (value: number) =>
  new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(value);

const newEmptyItem = (): EquipmentItem => ({
  id: crypto.randomUUID(),
  name: '',
  unit: 'stk',
  unitPrice: 0,
  quantity: 1,
  category: 'material',
});

const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  task,
  milestoneName,
  assigneeOptions,
  scheduledDate,
  isConflicted = false,
  isTimedConflict = false,
  conflictingAppointmentTime,
  pinnedHasNoTime = false,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(task.name);
  const [estimateHours, setEstimateHours] = useState(task.estimateHours);
  const [assignee, setAssignee] = useState<Assignee>(task.assignee);
  const [completed, setCompleted] = useState(task.completed ?? false);
  const [startTime, setStartTime] = useState(task.startTime ?? '');
  const [notes, setNotes] = useState(task.notes ?? '');
  const [equipment, setEquipment] = useState<EquipmentItem[]>(task.equipment ?? []);
  const [isNotesOpen, setIsNotesOpen] = useState(!!(task.notes));

  // Hard-date (pinned appointment) state.
  const [isHardDate, setIsHardDate] = useState(!!task.hardStartDate);
  const [hardDateStr, setHardDateStr] = useState<string>(
    task.hardStartDate
      ? toDateInputValue(task.hardStartDate)
      : scheduledDate
      ? toDateInputValue(scheduledDate)
      : ''
  );

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    // Auto-pin when a specific start time is entered for the first time.
    if (value && !isHardDate) {
      setIsHardDate(true);
      if (!hardDateStr && scheduledDate) setHardDateStr(toDateInputValue(scheduledDate));
    }
  };

  const handleAddRow = useCallback(() => {
    setEquipment(prev => [...prev, newEmptyItem()]);
  }, []);

  const handleDeleteRow = useCallback((id: string) => {
    setEquipment(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleItemChange = useCallback(
    <K extends keyof EquipmentItem>(id: string, field: K, value: EquipmentItem[K]) => {
      setEquipment(prev =>
        prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const handleSave = () => {
    const hardStartDate =
      isHardDate && hardDateStr ? parseLocalDate(hardDateStr) : undefined;
    onSave({
      ...task,
      name: name.trim() || task.name,
      estimateHours: Math.max(1, estimateHours),
      assignee,
      completed,
      startTime: startTime || undefined,
      notes: notes.trim() || undefined,
      equipment,
      hardStartDate,
    });
  };

  const isPro = assignee !== 'Meg selv';

  const materialTotal = equipment
    .filter(i => i.category !== 'equipment')
    .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const grandTotal = equipment.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="flex h-full w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-lg sm:border sm:border-slate-200">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1 pr-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {milestoneName}
            </p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border-0 p-0 text-base font-semibold text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-0"
              placeholder="Oppgavenavn"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Lukk"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Konflikt-banner — nivå 2 (dato-konflikt) */}
          {isConflicted && (
            <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Oppgaven strekker seg forbi avtaledagen.</span>{' '}
                Vurder å jobbe ekstra timer, be om hjelp, eller flytte avtaledatoen. Timene er ikke kuttet — du bestemmer selv løsningen.
              </p>
            </div>
          )}

          {/* Konflikt-banner — nivå 1 (tidspunkt-konflikt samme dag) */}
          {!isConflicted && isTimedConflict && (
            <div className="flex items-start gap-2 border-b border-yellow-200 bg-yellow-50 px-4 py-3 sm:px-5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-yellow-500" />
              <p className="text-xs text-yellow-800">
                <span className="font-semibold">Avtalen starter kl. {conflictingAppointmentTime} samme dag.</span>{' '}
                Sjekk at denne oppgaven rekker å bli ferdig før avtaletidspunktet.
              </p>
            </div>
          )}

          {/* Oppgaveinfo */}
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Oppgaveinfo
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Ansvarlig (type)</label>
                <select
                  value={assignee}
                  onChange={e => setAssignee(e.target.value as Assignee)}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {assigneeOptions.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Estimat (timer)</label>
                <input
                  type="number"
                  min="1"
                  value={estimateHours}
                  onChange={e => setEstimateHours(parseInt(e.target.value) || 1)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Starter kl.</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => handleStartTimeChange(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={e => setCompleted(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  Ferdig
                </label>
              </div>
            </div>
          </div>

          {/* Avtale — fast dato */}
          <div className={`border-b border-slate-100 px-4 py-3 sm:px-5 ${isHardDate ? 'bg-slate-50' : isPro ? 'bg-amber-50' : ''}`}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Toggle */}
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isHardDate}
                  onChange={e => setIsHardDate(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-700"
                />
                <span className={`font-semibold ${isHardDate ? 'text-slate-800' : isPro ? 'text-amber-700' : 'text-slate-600'}`}>
                  {isHardDate ? (
                    <span className="flex items-center gap-1"><Lock size={13} /> Fast avtale</span>
                  ) : isPro ? (
                    <span className="flex items-center gap-1"><AlertTriangle size={13} className="text-amber-500" /> Bekreft som fast avtale</span>
                  ) : (
                    'Fast avtale (valgfritt)'
                  )}
                </span>
              </label>

              {/* Datofelt — synlig kun når pinnet */}
              {isHardDate && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={hardDateStr}
                    onChange={e => setHardDateStr(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  {startTime && (
                    <span className="text-sm text-slate-500">kl. {startTime}</span>
                  )}
                </div>
              )}

              {/* Forklaringstekst */}
              <p className="w-full text-[11px] text-slate-400">
                {isHardDate
                  ? 'Oppgaven er låst til valgt dato og flyttes ikke automatisk av systemet.'
                  : isPro
                  ? 'Fagpersonoppgaver kan bli flyttet automatisk. Kryss av for å låse datoen når avtalen er bekreftet.'
                  : 'Kryss av for å låse oppgaven til en bestemt dato som ikke kan flyttes automatisk.'}
              </p>

              {/* Hint: mangler klokkeslett på fast avtale */}
              {isHardDate && !startTime && (
                <div className="flex w-full items-start gap-1.5 rounded bg-slate-100 px-3 py-2">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-slate-400" />
                  <p className="text-[11px] text-slate-500">
                    Klokkeslett er ikke satt. Uten klokkeslett kan systemet ikke varsle om oppgaver som strekker seg inn i avtalevinduet samme dag.
                    Sett «Starter kl.» i feltene over for bedre konfliktdeteksjon.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Utstyr og materiell */}
          <div className="px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Utstyr og materiell
              </p>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Plus size={12} />
                Legg til rad
              </button>
            </div>

            {equipment.length === 0 ? (
              <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-400">
                Ingen utstyr eller materiell registrert ennå.
                <br />
                Trykk «Legg til rad» for å starte.
              </div>
            ) : (
              <>
                {/* Desktop: tabell */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <th className="px-2 py-2">Navn</th>
                        <th className="w-20 px-2 py-2">Enhet</th>
                        <th className="w-24 px-2 py-2 text-right">Enhetspris</th>
                        <th className="w-16 px-2 py-2 text-right">Antall</th>
                        <th className="w-28 px-2 py-2">Kategori</th>
                        <th className="w-20 px-2 py-2 text-right">Sum</th>
                        <th className="w-8 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {equipment.map(item => {
                        const lineTotal = item.unitPrice * item.quantity;
                        return (
                          <tr key={item.id} className="group">
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                                placeholder="Beskrivelse"
                                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-800 focus:border-slate-300 focus:bg-white focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-800 focus:border-slate-300 focus:bg-white focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min="0"
                                value={item.unitPrice}
                                onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-xs text-slate-800 focus:border-slate-300 focus:bg-white focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-xs text-slate-800 focus:border-slate-300 focus:bg-white focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={item.category ?? 'material'}
                                onChange={e => handleItemChange(item.id, 'category', e.target.value as EquipmentCategory)}
                                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-700 focus:border-slate-300 focus:bg-white focus:outline-none"
                              >
                                {(Object.keys(CATEGORY_LABELS) as EquipmentCategory[]).map(cat => (
                                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold text-slate-700">
                              {formatNok(lineTotal)}
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(item.id)}
                                className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                                aria-label="Slett rad"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobil: kortliste */}
                <div className="space-y-3 sm:hidden">
                  {equipment.map(item => {
                    const lineTotal = item.unitPrice * item.quantity;
                    return (
                      <div key={item.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                            placeholder="Beskrivelse"
                            className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(item.id)}
                            className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            aria-label="Slett"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-0.5 block text-[10px] font-semibold text-slate-400">Enhet</label>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] font-semibold text-slate-400">Antall</label>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] font-semibold text-slate-400">Enhetspris (kr)</label>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] font-semibold text-slate-400">Kategori</label>
                            <select
                              value={item.category ?? 'material'}
                              onChange={e => handleItemChange(item.id, 'category', e.target.value as EquipmentCategory)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                            >
                              {(Object.keys(CATEGORY_LABELS) as EquipmentCategory[]).map(cat => (
                                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mt-2 text-right text-xs font-semibold text-slate-700">
                          Sum: {formatNok(lineTotal)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotaler */}
                <div className="mt-3 space-y-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Materiell og leie</span>
                    <span className="font-semibold text-slate-700">{formatNok(materialTotal)}</span>
                  </div>
                  {grandTotal !== materialTotal && (
                    <div className="flex justify-between text-slate-400">
                      <span>Eget utstyr (holdes utenfor budsjett)</span>
                      <span className="font-medium">{formatNok(grandTotal - materialTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-800">
                    <span>Totalt</span>
                    <span>{formatNok(grandTotal)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notater og huskeliste — kollapsbar */}
          <div className="border-t border-slate-100 px-4 sm:px-5">
            <button
              type="button"
              onClick={() => setIsNotesOpen(prev => !prev)}
              className="flex w-full items-center justify-between py-3 text-left"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Notater og huskeliste
                {notes.trim() && (
                  <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                    •
                  </span>
                )}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${isNotesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isNotesOpen && (
              <div className="pb-4">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={5}
                  placeholder={`Deltakere og kontakter:\nPer Olsen: 992 34 567\nKjetil: 918 22 111\n\nHuskeliste:\n- Hansker til alle x4\n- Pizza bestilles kl. 12\n- Betongskjærer returneres innen 16:00`}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Lagre
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailView;
