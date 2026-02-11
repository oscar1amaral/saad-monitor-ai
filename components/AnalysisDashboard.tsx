import React from 'react';
import { ProjectTimeline, Task, ColumnType } from '../types';
import { Activity, ShieldAlert, BarChart3, TrendingUp, TrendingDown, Users, Target } from 'lucide-react';

interface AnalysisDashboardProps {
    timeline: ProjectTimeline | null;
    tasks: Task[];
    insights: string[];
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ timeline, tasks, insights }) => {

    // 1. Calculate Squad Progress
    const squads = ['UX/UI', 'Backend', 'Frontend', 'Geral'] as const;

    const squadMetrics = squads.map(squad => {
        const squadTasks = tasks.filter(t => t.squad === squad || (!t.squad && squad === 'Geral'));
        const total = squadTasks.length;
        // Count as "done" for squad health if it's in Dev, Testing or Prod (as requested by user for Dev Progress)
        const done = squadTasks.filter(t =>
            t.column === ColumnType.DEPLOY_DEV ||
            t.column === ColumnType.TESTING ||
            t.column === ColumnType.DEPLOY_PROD
        ).length;
        const progress = total === 0 ? 0 : Math.round((done / total) * 100);
        return { squad, total, done, progress };
    });

    // 2. Global Progress (Based on the same "Dev+Test+Prod" logic for consistent dashboard feedback)
    const totalTasks = tasks.length;
    const globalDone = tasks.filter(t =>
        t.column === ColumnType.DEPLOY_DEV ||
        t.column === ColumnType.TESTING ||
        t.column === ColumnType.DEPLOY_PROD
    ).length;
    const globalProgress = totalTasks === 0 ? 0 : Math.round((globalDone / totalTasks) * 100);

    // 3. Expected Progress (Drift)
    let expectedProgress = 0;
    if (timeline) {
        expectedProgress = Math.min(100, Math.round((timeline.currentWeek / timeline.totalWeeks) * 100));
    }

    const drift = globalProgress - expectedProgress;
    const isLagging = drift < -10;
    const isAtRisk = drift < 0 && drift >= -10;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Health by Squad Card */}
                <div className="bg-brand-surface p-6 rounded-xl border border-brand-light shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Users size={18} className="text-brand-green" /> Saúde por Squad
                        </h3>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest">Granularidade</span>
                    </div>

                    <div className="space-y-5">
                        {squadMetrics.map(m => (
                            <div key={m.squad}>
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-200">{m.squad}</span>
                                        <span className="text-[10px] text-gray-500 bg-brand-base px-1.5 py-0.5 rounded border border-brand-light">
                                            {m.done}/{m.total} tasks
                                        </span>
                                    </div>
                                    <span className={`text-sm font-bold ${m.progress >= 80 ? 'text-brand-green' : m.progress >= 40 ? 'text-blue-400' : 'text-gray-400'}`}>
                                        {m.progress}%
                                    </span>
                                </div>
                                <div className="w-full bg-brand-base h-2 rounded-full overflow-hidden border border-brand-light/20">
                                    <div
                                        className={`h-full transition-all duration-700 ease-out ${m.squad === 'UX/UI' ? 'bg-pink-500' :
                                            m.squad === 'Backend' ? 'bg-blue-400' :
                                                m.squad === 'Frontend' ? 'bg-yellow-500' : 'bg-brand-green'
                                            }`}
                                        style={{ width: `${m.progress}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Drift & Milestone Card */}
                <div className="bg-brand-surface p-6 rounded-xl border border-brand-light shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Activity size={18} className="text-brand-green" /> Indicador de Drift
                        </h3>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${drift >= 0 ? 'bg-brand-green/10 text-brand-green' :
                            isLagging ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                            }`}>
                            {drift >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {drift > 0 ? 'Adiantado' : drift < 0 ? 'Atrasado' : 'No Prazo'}
                        </div>
                    </div>

                    <div className="space-y-8 py-4">
                        <div className="relative pt-4">
                            <div className="flex justify-between text-xs text-gray-400 mb-3 font-mono">
                                <span>INÍCIO</span>
                                <span>DATA ATUAL (W{timeline?.currentWeek})</span>
                                <span>FIM</span>
                            </div>

                            <div className="w-full bg-brand-base h-4 rounded-full border border-brand-light/30 relative">
                                {/* Real Progress */}
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${drift >= 0 ? 'bg-brand-green' : isLagging ? 'bg-red-500' : 'bg-yellow-500'
                                        }`}
                                    style={{ width: `${globalProgress}%` }}
                                />

                                {/* Expected Marker (Vertical Line) */}
                                <div
                                    className="absolute top-[-8px] h-[32px] w-[2px] bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.5)] z-10 transition-all duration-500"
                                    style={{ left: `${expectedProgress}%` }}
                                >
                                    <div className="absolute top-[-18px] left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-brand-light/80 px-1 rounded whitespace-nowrap">
                                        ESPERADO: {expectedProgress}%
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <div className="bg-brand-base/50 p-3 rounded-lg border border-brand-light/20">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status Real</p>
                                    <p className="text-xl font-black text-white">{globalProgress}%</p>
                                </div>
                                <div className="bg-brand-base/50 p-3 rounded-lg border border-brand-light/20">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Desvio (Drift)</p>
                                    <p className={`text-xl font-black ${drift >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
                                        {drift > 0 ? '+' : ''}{drift}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Critical Insights Panel */}
            <div className={`p-6 rounded-xl border transition-all duration-500 ${isLagging ? 'bg-red-900/10 border-red-500/30' : 'bg-brand-surface border-brand-light shadow-lg'
                }`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Target size={18} className={isLagging ? 'text-red-500' : 'text-brand-green'} />
                        Plano de Mitigação & Insights IA
                    </h3>
                    {isLagging && (
                        <div className="flex items-center gap-2 text-red-500 animate-pulse">
                            <ShieldAlert size={16} />
                            <span className="text-xs font-black uppercase">Crítico: Projeto em Atraso</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map((insight, idx) => (
                        <div key={idx} className={`p-4 rounded-lg flex gap-3 ${isLagging ? 'bg-red-500/5 border border-red-500/10' : 'bg-brand-base/30 border border-brand-light/20'
                            }`}>
                            <div className={`shrink-0 w-1.5 h-full rounded-full ${isLagging ? 'bg-red-500' : 'bg-brand-green'}`} />
                            <p className="text-sm text-gray-300 italic leading-relaxed">
                                {insight}
                            </p>
                        </div>
                    ))}
                    {insights.length === 0 && (
                        <p className="text-sm text-gray-500 italic px-4">Aguardando novos dados para análise profunda...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisDashboard;
