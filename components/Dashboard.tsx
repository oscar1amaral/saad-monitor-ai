import React from 'react';
import { ProjectTimeline, Task, ColumnType } from '../types';
import { Activity, Rocket, Lightbulb, CalendarClock } from 'lucide-react';

interface DashboardProps {
  timeline: ProjectTimeline | null;
  tasks: Task[];
  insights: string[];
}

const Dashboard: React.FC<DashboardProps> = ({ timeline, tasks, insights }) => {
  
  // Calculate Progress
  const totalTasks = tasks.length;
  
  const devDoneCount = tasks.filter(t => 
    t.column === ColumnType.DEPLOY_DEV || t.column === ColumnType.DEPLOY_PROD
  ).length;

  const prodDoneCount = tasks.filter(t => 
    t.column === ColumnType.DEPLOY_PROD
  ).length;

  const devProgress = totalTasks === 0 ? 0 : Math.round((devDoneCount / totalTasks) * 100);
  const prodProgress = totalTasks === 0 ? 0 : Math.round((prodDoneCount / totalTasks) * 100);

  // Time Progress
  let timeProgress = 0;
  if (timeline) {
     // Simple linear assumption: Current Week / Total Weeks
     timeProgress = Math.min(100, Math.round((timeline.currentWeek / timeline.totalWeeks) * 100));
  }

  // Health Score Calculation (Mock Logic)
  // If actual progress (Dev) matches or exceeds time progress, score is high.
  let healthScore = 100;
  if (timeline && totalTasks > 0) {
    const delta = devProgress - timeProgress;
    if (delta < -20) healthScore = 60;
    else if (delta < -10) healthScore = 80;
    else if (delta < 0) healthScore = 90;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Time & Health Card */}
      <div className="bg-brand-surface p-6 rounded-xl border border-brand-light shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-gray-300 text-sm font-medium flex items-center gap-2">
              <CalendarClock size={16} /> Cronograma
            </h3>
            <p className="text-3xl font-bold text-white mt-2">
              {timeline ? `${timeline.totalWeeks} Semanas` : '--'}
            </p>
            <p className="text-xs text-brand-green mt-1">
              {timeline ? `Semana Atual: ${timeline.currentWeek}` : 'Prazo: --/--'}
            </p>
          </div>
          <div className={`flex flex-col items-end`}>
             <span className="text-xs text-gray-400 mb-1">SAÚDE DO PROJETO</span>
             <span className={`text-2xl font-black ${healthScore >= 90 ? 'text-brand-green' : healthScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
               {healthScore}
             </span>
          </div>
        </div>
        
        {/* Progress Bar for Time */}
        <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Tempo Decorrido</span>
                <span>{timeProgress}%</span>
            </div>
            <div className="w-full bg-brand-base h-2 rounded-full border border-brand-light/30">
                <div 
                    className="bg-brand-green h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${timeProgress}%` }}
                ></div>
            </div>
        </div>
      </div>

      {/* Deliveries Status Card */}
      <div className="bg-brand-surface p-6 rounded-xl border border-brand-light shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-gray-300 text-sm font-medium flex items-center gap-2">
            <Rocket size={16} /> Status de Entrega
          </h3>
        </div>
        
        <div className="space-y-6">
            <div>
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-gray-300">Progresso Dev</span>
                    <span className="text-xl font-bold text-white">{devProgress}%</span>
                </div>
                <div className="w-full bg-brand-base h-2 rounded-full border border-brand-light/30">
                    <div 
                        className="bg-blue-400 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${devProgress}%` }}
                    ></div>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-gray-300">Progresso Produção</span>
                    <span className="text-xl font-bold text-brand-green">{prodProgress}%</span>
                </div>
                <div className="w-full bg-brand-base h-2 rounded-full border border-brand-light/30">
                    <div 
                        className="bg-brand-green h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${prodProgress}%` }}
                    ></div>
                </div>
            </div>
        </div>
      </div>

      {/* AI Insights Card */}
      <div className="bg-brand-surface p-6 rounded-xl border border-brand-light shadow-lg relative">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-gray-300 text-sm font-medium flex items-center gap-2">
            <Lightbulb size={16} /> Insights IA
          </h3>
        </div>
        <div className="space-y-3">
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
               <div key={idx} className="pl-3 border-l-2 border-brand-green">
                  <p className="text-sm text-gray-200 italic">"{insight}"</p>
               </div>
            ))
          ) : (
            <div className="pl-3 border-l-2 border-brand-light">
                <p className="text-sm text-gray-400 italic">
                    Digite suas tarefas no chat para gerar o cronograma inicial e insights...
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;