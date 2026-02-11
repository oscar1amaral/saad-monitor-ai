import React from 'react';
import { ColumnType, Task } from '../types';
import { MoreHorizontal, Settings, Trash2 } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newColumn: ColumnType) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

const COLUMNS = [
  ColumnType.TODO,
  ColumnType.DOING,
  ColumnType.TESTING,
  ColumnType.DEPLOY_DEV,
  ColumnType.DEPLOY_PROD,
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskMove, onEditTask, onDeleteTask }) => {

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, targetColumn: ColumnType) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onTaskMove(taskId, targetColumn);
    }
  };

  const getColumnColor = (col: ColumnType) => {
    switch (col) {
      case ColumnType.TODO: return 'border-brand-light';
      case ColumnType.DOING: return 'border-blue-400';
      case ColumnType.TESTING: return 'border-yellow-500';
      case ColumnType.DEPLOY_DEV: return 'border-indigo-400';
      case ColumnType.DEPLOY_PROD: return 'border-brand-green';
      default: return 'border-brand-light';
    }
  };

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex gap-4 min-w-[1200px] h-full pb-4">
        {COLUMNS.map((column) => (
          <div
            key={column}
            className="flex-1 bg-brand-surface/50 rounded-lg flex flex-col min-w-[220px] border border-brand-light/50"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
          >
            {/* Column Header */}
            <div className={`p-4 border-t-2 ${getColumnColor(column)} bg-brand-surface rounded-t-lg flex justify-between items-center sticky top-0 z-10`}>
              <h4 className="font-bold text-gray-100 text-sm uppercase tracking-wider">
                {column}
              </h4>
              <span className="text-xs bg-brand-base text-brand-green px-2 py-0.5 rounded-full border border-brand-light">
                {tasks.filter(t => t.column === column).length}
              </span>
            </div>

            {/* Tasks Area */}
            <div className="p-3 flex-1 space-y-3 overflow-y-auto">
              {tasks
                .filter((task) => task.column === column)
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-brand-light/20 p-4 rounded border border-brand-light hover:border-brand-green cursor-move hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono text-brand-green bg-brand-green/10 px-1.5 py-0.5 rounded">
                        {task.code}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditTask?.(task)}
                          className="text-gray-400 hover:text-brand-green p-1 rounded hover:bg-brand-green/10"
                          title="Editar Tarefa"
                        >
                          <Settings size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteTask?.(task.id)}
                          className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-red-500/10"
                          title="Excluir Tarefa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-100 text-sm font-medium leading-snug mb-2">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">
                        {task.category.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                ))}

              {tasks.filter(t => t.column === column).length === 0 && (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-brand-light/30 rounded opacity-50">
                  <span className="text-xs text-gray-500">Vazio</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;