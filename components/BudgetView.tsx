import React from 'react';
import { Assignee, BudgetActuals } from '../types';

interface BudgetBreakdown {
  laborEstimate: number;
  materialEstimate: number;
  rentalEstimate: number;
  excludedEquipmentEstimate: number;
  totalEstimate: number;
  laborByAssignee: Record<Assignee, number>;
}

interface BudgetViewProps {
  laborRates: Record<Assignee, number>;
  onLaborRateChange: (assignee: Assignee, value: number) => void;
  actuals: BudgetActuals;
  onActualChange: (key: keyof BudgetActuals, value: number) => void;
  breakdown: BudgetBreakdown;
}

const formatNok = (value: number) =>
  new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(value);

const getVariance = (actual: number, estimate: number) => {
  const diff = actual - estimate;
  const percent = estimate > 0 ? (diff / estimate) * 100 : 0;
  return { diff, percent };
};

const BudgetView: React.FC<BudgetViewProps> = ({
  laborRates,
  onLaborRateChange,
  actuals,
  onActualChange,
  breakdown,
}) => {
  const totalActual = actuals.labor + actuals.material + actuals.rental;
  const totalVariance = getVariance(totalActual, breakdown.totalEstimate);
  const laborVariance = getVariance(actuals.labor, breakdown.laborEstimate);
  const materialVariance = getVariance(actuals.material, breakdown.materialEstimate);
  const rentalVariance = getVariance(actuals.rental, breakdown.rentalEstimate);
  const professionalAssignees: Assignee[] = ['Snekker', 'Rørlegger', 'Elektriker', 'Maler'];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-slate-900">Budsjettoversikt</h2>
        <p className="text-xs text-slate-500 mt-1">
          Utstyr holdes utenfor budsjettet. Kun materiell, leie og fagpersonell summeres.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Estimert arbeid</p>
          <p className="text-lg font-semibold text-slate-900">{formatNok(breakdown.laborEstimate)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Estimert materiell</p>
          <p className="text-lg font-semibold text-slate-900">{formatNok(breakdown.materialEstimate)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Estimert leie</p>
          <p className="text-lg font-semibold text-slate-900">{formatNok(breakdown.rentalEstimate)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total estimert</p>
          <p className="text-lg font-semibold text-slate-900">{formatNok(breakdown.totalEstimate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Timesatser fagpersonell</h3>
          <div className="space-y-2">
            {professionalAssignees.map((assignee) => (
              <div key={assignee} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">{assignee}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={laborRates[assignee]}
                    onChange={(e) => onLaborRateChange(assignee, parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <span className="text-xs text-slate-500">kr/time</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Registrer faktiske kostnader</h3>
          <div className="space-y-2">
            {([
              ['labor', 'Faktisk arbeid'],
              ['material', 'Faktisk materiell'],
              ['rental', 'Faktisk leie'],
            ] as Array<[keyof BudgetActuals, string]>).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={actuals[key]}
                    onChange={(e) => onActualChange(key, parseInt(e.target.value, 10) || 0)}
                    className="w-28 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <span className="text-xs text-slate-500">kr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-4 overflow-auto">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Avvik (faktisk vs estimert)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3 font-semibold">Kategori</th>
              <th className="py-2 pr-3 font-semibold text-right">Estimert</th>
              <th className="py-2 pr-3 font-semibold text-right">Faktisk</th>
              <th className="py-2 pr-3 font-semibold text-right">Avvik (kr)</th>
              <th className="py-2 font-semibold text-right">Avvik (%)</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-3">Arbeid</td>
              <td className="py-2 pr-3 text-right">{formatNok(breakdown.laborEstimate)}</td>
              <td className="py-2 pr-3 text-right">{formatNok(actuals.labor)}</td>
              <td className="py-2 pr-3 text-right">{formatNok(laborVariance.diff)}</td>
              <td className="py-2 text-right">{laborVariance.percent.toFixed(1)}%</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-3">Materiell</td>
              <td className="py-2 pr-3 text-right">{formatNok(breakdown.materialEstimate)}</td>
              <td className="py-2 pr-3 text-right">{formatNok(actuals.material)}</td>
              <td className="py-2 pr-3 text-right">{formatNok(materialVariance.diff)}</td>
              <td className="py-2 text-right">{materialVariance.percent.toFixed(1)}%</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-3">Leie utstyr</td>
              <td className="py-2 pr-3 text-right">{formatNok(breakdown.rentalEstimate)}</td>
              <td className="py-2 pr-3 text-right">{formatNok(actuals.rental)}</td>
              <td className="py-2 pr-3 text-right">{formatNok(rentalVariance.diff)}</td>
              <td className="py-2 text-right">{rentalVariance.percent.toFixed(1)}%</td>
            </tr>
            <tr className="font-semibold">
              <td className="py-2 pr-3">Total</td>
              <td className="py-2 pr-3 text-right">{formatNok(breakdown.totalEstimate)}</td>
              <td className="py-2 pr-3 text-right">{formatNok(totalActual)}</td>
              <td className="py-2 pr-3 text-right">{formatNok(totalVariance.diff)}</td>
              <td className="py-2 text-right">{totalVariance.percent.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
        <p className="text-xs text-slate-500">
          Holdt utenfor budsjett: engangsutstyr/verktøy ({formatNok(breakdown.excludedEquipmentEstimate)}).
        </p>
      </div>
    </div>
  );
};

export default BudgetView;
