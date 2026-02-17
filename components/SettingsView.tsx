import React from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { ProjectConfig } from '../types';
import { Calendar, ArrowRightLeft, Activity, AlertTriangle } from 'lucide-react';

interface SettingsViewProps {
  config: ProjectConfig;
  onUpdateStartDate: (date: Date) => void;
  onUpdateCapacity: (day: number, hours: number) => void;
  scheduleLength: number;
  lastScheduleDate: Date | null;
  onResetStoredData: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateStartDate,
  onUpdateCapacity,
  scheduleLength,
  lastScheduleDate,
  onResetStoredData,
}) => {
  const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];

  return (
    <div className="p-6 space-y-8">
      {/* Start Date Config */}
      <div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          <Calendar size={14} /> Prosjektstart
        </label>
        <input 
          type="date"
          value={format(config.startDate, 'yyyy-MM-dd')}
          onChange={(e) => onUpdateStartDate(new Date(e.target.value))}
          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Capacity Config */}
      <div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          <ArrowRightLeft size={14} /> Daglig Kapasitet
        </label>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className={day === 0 || day === 6 ? 'text-slate-400' : 'text-slate-700'}>
                  {dayNames[day]}
                </span>
                <span className="text-indigo-600">{config.dayCapacities[day]}t</span>
              </div>
              <input 
                type="range"
                min="0"
                max="16"
                value={config.dayCapacities[day]}
                onChange={(e) => onUpdateCapacity(day, parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Activity size={14} /> Prognose
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-indigo-700/70">Sluttdato:</span>
            <span className="font-bold text-indigo-900">
              {lastScheduleDate ? format(lastScheduleDate, 'd. MMM', { locale: nb }) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-indigo-700/70">Arbeidsdager:</span>
            <span className="font-bold text-indigo-900">{scheduleLength} dager</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-800">
          <AlertTriangle size={14} /> Fare sone
        </h4>
        <p className="mb-3 text-xs text-rose-700">
          Nullstiller lagrede prosjektdata fra nettleseren. Dette kan ikke angres.
        </p>
        <button
          type="button"
          onClick={onResetStoredData}
          className="w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          Nullstill lagrede data
        </button>
      </div>
    </div>
  );
};

export default SettingsView;