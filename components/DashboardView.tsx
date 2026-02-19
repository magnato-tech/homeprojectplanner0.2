import React, { useState } from 'react';
import { Hammer, Plus, Pencil, Trash2, ChevronRight, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Project } from '../types';

interface DashboardViewProps {
  projects: Project[];
  onOpenProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
}

const getProjectDateRange = (project: Project): string => {
  const dates: Date[] = project.milestones
    .flatMap(m => m.tasks)
    .flatMap(t => t.hardStartDate ? [t.hardStartDate] : []);
  if (project.milestones.some(m => m.startDate)) {
    const starts = project.milestones.filter(m => m.startDate).map(m => m.startDate as Date);
    dates.push(...starts);
  }
  if (dates.length === 0) return '';
  const min = new Date(Math.min(...dates.map(d => d.getTime())));
  const max = new Date(Math.max(...dates.map(d => d.getTime())));
  if (min.getTime() === max.getTime()) return format(min, 'd. MMM yyyy', { locale: nb });
  return `${format(min, 'd. MMM', { locale: nb })} – ${format(max, 'd. MMM yyyy', { locale: nb })}`;
};

const getProjectProgress = (project: Project) => {
  const total = project.milestones.flatMap(m => m.tasks).reduce((s, t) => s + t.estimateHours, 0);
  const done = project.milestones.flatMap(m => m.tasks).filter(t => t.completed).reduce((s, t) => s + t.estimateHours, 0);
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
};

const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onOpenProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
}) => {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateProject(newName.trim());
    setNewName('');
    setShowNewForm(false);
  };

  const commitRename = (id: string) => {
    if (renameValue.trim()) onRenameProject(id, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 text-white shrink-0">
            <Hammer size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Prosjektplanlegger</h1>
            <p className="text-[11px] text-slate-400">Hobbyprosjekter med smart tidsplanlegging</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Dine prosjekter
            {projects.length > 0 && (
              <span className="ml-2 text-slate-400 font-normal normal-case">({projects.length})</span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => { setShowNewForm(true); setNewName(''); }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus size={13} />
            Nytt prosjekt
          </button>
        </div>

        {/* New project inline form */}
        {showNewForm && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-2">Navn på nytt prosjekt</p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewForm(false); }}
                placeholder="F.eks. Baderomsrenovering 2026"
                className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="rounded border border-slate-800 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
              >
                Opprett
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && !showNewForm && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <FolderOpen size={40} className="text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500 mb-1">Ingen prosjekter ennå</p>
            <p className="text-xs text-slate-400 mb-4">Klikk «Nytt prosjekt» for å komme i gang</p>
            <button
              type="button"
              onClick={() => { setShowNewForm(true); setNewName(''); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Plus size={13} />
              Nytt prosjekt
            </button>
          </div>
        )}

        {/* Project cards grid */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => {
              const { total, done, pct } = getProjectProgress(project);
              const dateRange = getProjectDateRange(project);
              const taskCount = project.milestones.flatMap(m => m.tasks).length;
              const doneCount = project.milestones.flatMap(m => m.tasks).filter(t => t.completed).length;

              return (
                <div
                  key={project.id}
                  className="group relative flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150"
                >
                  {/* Card body — clickable to open */}
                  <button
                    type="button"
                    onClick={() => onOpenProject(project.id)}
                    className="flex-1 text-left p-4"
                  >
                    {renamingId === project.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(project.id)}
                        onKeyDown={e => {
                          e.stopPropagation();
                          if (e.key === 'Enter') commitRename(project.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 mb-2"
                      />
                    ) : (
                      <h3 className="text-sm font-bold text-slate-800 mb-1 truncate pr-12">{project.name}</h3>
                    )}
                    <p className="text-[11px] text-slate-400 mb-3">
                      {project.milestones.length} milepæler
                      {dateRange && <> · {dateRange}</>}
                    </p>

                    {/* Progress bar */}
                    <div className="mb-1.5">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{doneCount}/{taskCount} oppgaver</span>
                      <span className="font-semibold text-slate-500">{pct}%</span>
                    </div>
                    {total > 0 && (
                      <p className="text-[10px] text-slate-300 mt-0.5">{done}/{total}t fullført</p>
                    )}
                  </button>

                  {/* Open arrow */}
                  <div className="absolute top-4 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setRenamingId(project.id); setRenameValue(project.name); }}
                      className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Gi nytt navn"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        if (window.confirm(`Slett prosjektet "${project.name}"? Dette kan ikke angres.`)) {
                          onDeleteProject(project.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="Slett prosjekt"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Footer: created date */}
                  <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-300">
                      Opprettet {format(new Date(project.createdAt), 'd. MMM yyyy', { locale: nb })}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenProject(project.id)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                    >
                      Åpne <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardView;
