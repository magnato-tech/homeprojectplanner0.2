
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { User, Clock, HardHat, Hammer, Droplets, Zap, Paintbrush, ChevronRight, Package, X } from 'lucide-react';
import { TaskPart, Assignee } from '../types';

interface TaskCardProps {
  part: TaskPart;
  onEstimateChange: (taskId: string, newHours: number) => void;
  currentEstimate: number;
}

const getAssigneeColors = (assignee: Assignee) => {
  switch (assignee) {
    case 'Meg selv': return { text: 'text-slate-700', dot: 'bg-slate-500' };
    case 'Snekker': return { text: 'text-slate-700', dot: 'bg-blue-500' };
    case 'Rørlegger': return { text: 'text-slate-700', dot: 'bg-emerald-500' };
    case 'Elektriker': return { text: 'text-slate-700', dot: 'bg-violet-500' };
    case 'Maler': return { text: 'text-slate-700', dot: 'bg-rose-500' };
    default: return { text: 'text-slate-700', dot: 'bg-slate-500' };
  }
};

const getAssigneeIcon = (assignee: Assignee) => {
  switch (assignee) {
    case 'Meg selv': return <User size={16} />;
    case 'Snekker': return <HardHat size={16} />;
    case 'Rørlegger': return <Droplets size={16} />;
    case 'Elektriker': return <Zap size={16} />;
    case 'Maler': return <Paintbrush size={16} />;
    default: return <Hammer size={16} />;
  }
};

const formatCurrencyNok = (value: number) =>
  new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(value);

const TaskCard: React.FC<TaskCardProps> = ({ part, onEstimateChange, currentEstimate }) => {
  const colors = getAssigneeColors(part.assignee);
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false);
  const equipment = part.equipment ?? [];
  const equipmentCount = equipment.length;
  const equipmentTotal = useMemo(
    () => equipment.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [equipment]
  );
  
  return (
    <>
    <div className="group relative p-2.5 sm:p-3 rounded-md border border-slate-200 bg-white transition-colors duration-200 hover:border-slate-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
             <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
               {part.milestoneName}
             </span>
             <ChevronRight size={10} className="text-slate-300" />
             {part.totalParts > 1 && (
               <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-medium text-slate-500">
                 Del {part.partIndex} av {part.totalParts}
               </span>
             )}
          </div>
          <h4 className="text-sm font-semibold text-slate-800 leading-tight">
            {part.taskName}
          </h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 ${colors.text}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${colors.dot}`} />
              <span className="hidden sm:inline">{getAssigneeIcon(part.assignee)}</span>
              {part.assignee}
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
              <Clock size={12} className="opacity-50" />
              <span>{part.hoursSpent}t i dag</span>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
              aria-label="Åpne utstyr og materiell"
              title="Utstyr og materiell"
              onClick={() => setIsEquipmentOpen(true)}
            >
              <Package size={12} />
              <span>Utstyr{equipmentCount > 0 ? ` (${equipmentCount})` : ''}</span>
            </button>
          </div>
        </div>

        {/* Edit Estimate Zone (Only on the first slice of a task) */}
        <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200 md:pl-3">
          {part.partIndex === 1 ? (
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total estimat</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={currentEstimate}
                  onChange={(e) => onEstimateChange(part.taskId, parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded focus:ring-2 focus:ring-slate-300 focus:outline-none"
                />
                <span className="text-xs font-medium text-slate-500">timer</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] italic text-slate-400 font-medium">
              Fortsettelse fra {format(new Date(), 'd. MMM')}...
            </div>
          )}
        </div>
      </div>
    </div>
    {isEquipmentOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3">
        <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Utstyr og materiell
              </p>
              <h4 className="text-sm font-semibold text-slate-900">{part.taskName}</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsEquipmentOpen(false)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Lukk utstyrsliste"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[65vh] overflow-auto p-4">
            {equipmentCount === 0 ? (
              <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Ingen utstyrslinjer registrert ennå.
              </div>
            ) : (
              <>
                <div className="hidden sm:block">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Utstyr/materiell</th>
                        <th className="px-3 py-2 font-semibold">Enhet</th>
                        <th className="px-3 py-2 font-semibold text-right">Enhetspris</th>
                        <th className="px-3 py-2 font-semibold text-right">Antall</th>
                        <th className="px-3 py-2 font-semibold text-right">Sum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map((item) => {
                        const lineTotal = item.unitPrice * item.quantity;
                        return (
                          <tr key={item.id} className="border-t border-slate-100 text-slate-700">
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="px-3 py-2">{item.unit}</td>
                            <td className="px-3 py-2 text-right">{formatCurrencyNok(item.unitPrice)}</td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatCurrencyNok(lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden space-y-2">
                  {equipment.map((item) => {
                    const lineTotal = item.unitPrice * item.quantity;
                    return (
                      <div key={item.id} className="rounded border border-slate-200 p-3 text-xs">
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-slate-500">Enhet: {item.unit}</p>
                        <p className="text-slate-500">Enhetspris: {formatCurrencyNok(item.unitPrice)}</p>
                        <p className="text-slate-500">Antall: {item.quantity}</p>
                        <p className="mt-1 font-semibold text-slate-800">Sum: {formatCurrencyNok(lineTotal)}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sluttsum utstyr
            </span>
            <span className="text-sm font-semibold text-slate-900">{formatCurrencyNok(equipmentTotal)}</span>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default TaskCard;
