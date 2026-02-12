import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Layers, Settings, Menu, Plus, Folder, FolderOpen, Trash2, X, ArrowLeft, Clock, CheckCircle2, PlayCircle, PauseCircle, Search, Sparkles, BarChart3 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import AnalysisDashboard from './components/AnalysisDashboard';
import Chat from './components/Chat';
import { Task, ProjectTimeline, ChatMessage, ColumnType, Project, ProjectStatus } from './types';
import { analyzeProjectInput } from './services/geminiService';
import { dataService } from './services/dataService';

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deliveries' | 'settings'>('dashboard');
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'analysis'>('list');

  // Lista de Projetos
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const [editingProject, setEditingProject] = useState<{ id: string, name: string, description: string } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // --- Initial Load ---
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      const data = await dataService.getProjects();
      setProjects(data);
      setIsLoading(false);
    };
    fetchProjects();
  }, []);

  // --- Derived State ---
  const activeProject = projects.find(p => p.id === activeProjectId);

  // --- Helper Functions ---
  const calculateProgress = (tasks: Task[]) => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.column === ColumnType.DEPLOY_PROD).length;
    return Math.round((done / tasks.length) * 100);
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'completed': return 'text-brand-green bg-brand-green/10 border-brand-green/20';
      case 'paused': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'Em Andamento';
      case 'completed': return 'Concluído';
      case 'paused': return 'Pausado';
    }
  };

  // --- Handlers ---

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const projectId = crypto.randomUUID();
    const newProject: Project = {
      id: projectId,
      name: newProjectName,
      description: newProjectDesc,
      createdAt: new Date(),
      status: 'active',
      tasks: [],
      timeline: null,
      insights: [],
      chatHistory: [{
        id: crypto.randomUUID(),
        role: 'ai',
        content: `Olá! Vamos começar o planejamento do projeto "${newProjectName}".Me informe as Regras de Negócio e o prazo.`,
        timestamp: new Date()
      }]
    };

    const successId = await dataService.createProject(newProject);
    if (!successId) {
      alert("Erro ao criar projeto no banco de dados.");
      return;
    }

    const savedProject: Project = {
      ...newProject,
      id: successId
    };

    // Save initial AI message
    await dataService.addChatMessage(successId, savedProject.chatHistory[0]);

    setProjects([savedProject, ...projects]);
    setActiveProjectId(successId);
    setViewMode('details');
    setIsModalOpen(false);
    setNewProjectName('');
    setNewProjectDesc('');
  };

  const handleOpenProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setViewMode('details');
    setActiveTab('dashboard');
  };

  const handleBackToHome = () => {
    setViewMode('list');
    setActiveProjectId(null);
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este projeto?")) {
      const success = await dataService.deleteProject(projectId);
      if (success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (activeProjectId === projectId) {
          handleBackToHome();
        }
      } else {
        alert("Erro ao excluir projeto.");
      }
    }
  };

  const handleToggleStatus = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const newStatus = project.status === 'completed' ? 'active' : 'completed' as ProjectStatus;
    const success = await dataService.updateProjectStatus(project.id, newStatus);
    if (success) {
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: newStatus } : p));
    } else {
      alert("Erro ao atualizar status.");
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.name.trim()) return;

    const success = await dataService.updateProject(editingProject.id, {
      name: editingProject.name,
      description: editingProject.description
    });

    if (success) {
      setProjects(prev => prev.map(p =>
        p.id === editingProject.id
          ? { ...p, name: editingProject.name, description: editingProject.description }
          : p
      ));
      setIsEditProjectModalOpen(false);
      setEditingProject(null);
    } else {
      alert("Erro ao atualizar projeto.");
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditTaskModalOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !activeProjectId) return;

    const success = await dataService.updateTask(editingTask.id, editingTask);
    if (success) {
      setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === editingTask.id ? editingTask : t)
        };
      }));
      setIsEditTaskModalOpen(false);
      setEditingTask(null);
    } else {
      alert("Erro ao atualizar tarefa.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeProjectId) return;
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      const success = await dataService.deleteTask(taskId);
      if (success) {
        setProjects(prev => prev.map(p => {
          if (p.id !== activeProjectId) return p;
          return {
            ...p,
            tasks: p.tasks.filter(t => t.id !== taskId)
          };
        }));
      } else {
        alert("Erro ao excluir tarefa.");
      }
    }
  };

  const handleTaskMove = async (taskId: string, newColumn: ColumnType) => {
    if (!activeProjectId) return;

    // Optimistic update
    setProjects(prevProjects =>
      prevProjects.map(proj => {
        if (proj.id !== activeProjectId) return proj;
        return {
          ...proj,
          tasks: proj.tasks.map(t => {
            if (t.id !== taskId) return t;
            const isCompleted =
              newColumn === ColumnType.DEPLOY_DEV ||
              newColumn === ColumnType.TESTING ||
              newColumn === ColumnType.DEPLOY_PROD;

            return {
              ...t,
              column: newColumn,
              completed_at: isCompleted ? (t.completed_at || new Date().toISOString()) : undefined
            };
          })
        };
      })
    );

    const task = activeProject?.tasks.find(t => t.id === taskId);
    if (task) {
      const isCompleted =
        newColumn === ColumnType.DEPLOY_DEV ||
        newColumn === ColumnType.TESTING ||
        newColumn === ColumnType.DEPLOY_PROD;

      const updatedTask = {
        ...task,
        column: newColumn,
        completed_at: isCompleted ? (task.completed_at || new Date().toISOString()) : undefined
      };

      await dataService.upsertTask(activeProjectId, updatedTask);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeProject || !activeProjectId) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    // Save User message
    await dataService.addChatMessage(activeProjectId, userMsg);

    const updatedHistory = [...activeProject.chatHistory, userMsg];

    setProjects(prev => prev.map(p =>
      p.id === activeProjectId ? { ...p, chatHistory: updatedHistory } : p
    ));

    setIsChatLoading(true);

    try {
      const result = await analyzeProjectInput(
        text,
        updatedHistory,
        new Date().toISOString().split('T')[0]
      );

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: result.reply,
        timestamp: new Date(),
      };

      // Save AI message
      await dataService.addChatMessage(activeProjectId, aiMsg);

      // Save tasks
      if (result.tasks.length > 0) {
        await dataService.saveTasks(activeProjectId, result.tasks);
      }

      // Save timeline
      if (result.timeline) {
        await dataService.updateTimeline(activeProjectId, result.timeline);
      }

      // Save insights
      if (result.insights.length > 0) {
        await dataService.updateProjectInsights(activeProjectId, result.insights);
      }

      setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;

        const newTasks = result.tasks.length > 0 ? [...p.tasks, ...result.tasks] : p.tasks;
        const newTimeline = result.timeline ? result.timeline : p.timeline;
        const newInsights = result.insights.length > 0 ? result.insights : p.insights;

        return {
          ...p,
          tasks: newTasks,
          timeline: newTimeline,
          insights: newInsights,
          chatHistory: [...updatedHistory, aiMsg]
        };
      }));

    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Desculpe, tive um problema ao processar isso. Tente novamente.",
        timestamp: new Date(),
      };

      await dataService.addChatMessage(activeProjectId, errorMsg);

      setProjects(prev => prev.map(p =>
        p.id === activeProjectId
          ? { ...p, chatHistory: [...p.chatHistory, errorMsg] }
          : p
      ));
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- Render Contents ---

  const renderProjectCard = (proj: Project) => {
    const progress = calculateProgress(proj.tasks);

    return (
      <div
        key={proj.id}
        onClick={() => handleOpenProject(proj.id)}
        className="group bg-brand-surface border border-brand-light rounded-xl p-6 cursor-pointer hover:border-brand-green/50 hover:shadow-lg hover:shadow-brand-green/5 transition-all relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 ${getStatusColor(proj.status)}`}>
            {proj.status === 'active' && <PlayCircle size={12} />}
            {proj.status === 'completed' && <CheckCircle2 size={12} />}
            {proj.status === 'paused' && <PauseCircle size={12} />}
            {getStatusLabel(proj.status)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => handleToggleStatus(e, proj)}
              title={proj.status === 'completed' ? "Reabrir" : "Concluir"}
              className="p-1.5 text-gray-500 hover:text-brand-green rounded-md hover:bg-brand-light/30 transition-colors z-10"
            >
              <CheckCircle2 size={16} />
            </button>
            <button
              onClick={(e) => handleDeleteProject(e, proj.id)}
              className="p-1.5 text-gray-500 hover:text-red-400 rounded-md hover:bg-brand-light/30 transition-colors z-10"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-green transition-colors">{proj.name}</h3>
        <p className="text-gray-400 text-sm mb-6 line-clamp-2 h-10">{proj.description || "Sem descrição definida."}</p>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-300">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-brand-base h-2 rounded-full border border-brand-light/30">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${proj.status === 'completed' ? 'bg-brand-green' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-brand-light flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock size={12} /> {new Date(proj.createdAt).toLocaleDateString()}</span>
          <span className="bg-brand-light px-2 py-1 rounded text-gray-300">{proj.tasks.length} Tarefas</span>
        </div>
      </div>
    );
  }

  const renderProjectList = () => (
    <div className="max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Meus Projetos</h2>
          <p className="text-gray-400">Visão geral e monitoramento de progresso</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-green hover:bg-brand-green-hover text-brand-base px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-brand-green/20"
        >
          <Plus size={18} /> Novo Projeto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[400px] bg-brand-surface/30 rounded-xl border border-dashed border-brand-light">
          <FolderOpen size={48} className="text-brand-light mb-4" />
          <p className="text-gray-400 mb-4">Nenhum projeto encontrado.</p>
          <button onClick={() => setIsModalOpen(true)} className="text-brand-green font-bold hover:underline">
            Criar meu primeiro projeto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(renderProjectCard)}
        </div>
      )}
    </div>
  );

  const renderDeliveriesList = () => {
    const completedProjects = projects.filter(p => p.status === 'completed');

    return (
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Entregas Concluídas</h2>
          <p className="text-gray-400">Histórico de projetos finalizados</p>
        </div>

        {completedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] bg-brand-surface/30 rounded-xl border border-dashed border-brand-light">
            <CheckCircle2 size={48} className="text-brand-light mb-4" />
            <p className="text-gray-400">Nenhum projeto concluído ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedProjects.map(renderProjectCard)}
          </div>
        )}
      </div>
    );
  }

  const renderProjectDetail = () => {
    if (!activeProject) return null;

    return (
      <div className="max-w-[1600px] mx-auto h-full flex flex-col">
        {/* Project Header */}
        <div className="mb-6 flex items-start justify-between border-b border-brand-light pb-4">
          <div>
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-1 text-gray-400 hover:text-white mb-2 text-sm transition-colors"
            >
              <ArrowLeft size={14} /> Voltar para Projetos
            </button>
            <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              {activeProject.name}
              <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(activeProject.status)}`}>
                {getStatusLabel(activeProject.status)}
              </span>
            </h2>
            <p className="text-gray-400">
              {activeProject.description || "Sem descrição"}
              {activeProject.timeline ? ` • Semana ${activeProject.timeline.currentWeek} de ${activeProject.timeline.totalWeeks}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <button
              onClick={() => setViewMode(viewMode === 'analysis' ? 'details' : 'analysis')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${viewMode === 'analysis'
                ? 'bg-brand-green text-brand-base border-brand-green shadow-lg shadow-brand-green/20'
                : 'bg-brand-green/10 text-brand-green border-brand-green/20 hover:bg-brand-green/20'
                }`}
            >
              <BarChart3 size={14} /> {viewMode === 'analysis' ? 'Ver Kanban' : 'ANALISAR'}
            </button>
            <button
              onClick={() => {
                setEditingProject({ id: activeProject.id, name: activeProject.name, description: activeProject.description });
                setIsEditProjectModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-light text-gray-300 border border-brand-light rounded-lg hover:text-white hover:border-brand-green/50 transition-all text-sm font-medium"
            >
              <Settings size={14} /> Editar Projeto
            </button>
            <button
              onClick={(e) => handleDeleteProject(e, activeProject.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all text-sm font-medium"
            >
              <Trash2 size={14} /> Excluir Projeto
            </button>
            <span className="text-xs text-brand-green bg-brand-green/10 px-2 py-1 rounded border border-brand-green/20">
              {activeProject.tasks.length} Tarefas Totais
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 pt-2 pb-8">
          {viewMode === 'analysis' ? (
            <AnalysisDashboard
              timeline={activeProject.timeline}
              tasks={activeProject.tasks}
              insights={activeProject.insights}
            />
          ) : (
            <>
              <Dashboard
                timeline={activeProject.timeline}
                tasks={activeProject.tasks}
                insights={activeProject.insights}
              />

              <div className="mb-4 mt-8 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Quadro Kanban</h3>
              </div>

              <div className="min-h-[400px]">
                <KanbanBoard
                  tasks={activeProject.tasks}
                  onTaskMove={handleTaskMove}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // --- Main Layout ---
  return (
    <div className="flex h-screen bg-brand-base text-brand-text font-sans selection:bg-brand-green/30">

      {/* Left Sidebar */}
      <aside className="w-64 bg-brand-surface border-r border-brand-light flex flex-col hidden md:flex shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            SAD <span className="text-brand-green font-light text-sm">Monitor</span>
          </h1>
        </div>

        {/* Global Navigation */}
        <div className="px-4 mb-6 space-y-2">
          <button
            onClick={() => { setActiveTab('dashboard'); handleBackToHome(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard'
              ? 'bg-brand-green text-brand-base shadow-lg shadow-brand-green/20 font-bold'
              : 'text-gray-400 hover:bg-brand-light/30 hover:text-white'
              }`}
          >
            <LayoutDashboard size={18} />
            Painel Geral
          </button>
          <button
            onClick={() => { setActiveTab('deliveries'); handleBackToHome(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'deliveries'
              ? 'bg-brand-green text-brand-base font-bold'
              : 'text-gray-400 hover:bg-brand-light/30 hover:text-white'
              }`}
          >
            <Layers size={18} />
            Todas Entregas
          </button>
        </div>

        {/* Quick Projects List (Optional Sidebar) */}
        <div className="flex-1 px-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Acesso Rápido</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-brand-green hover:text-white transition-colors"
              title="Novo Projeto"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-1">
            {projects.filter(p => p.status === 'active').map(proj => (
              <div
                key={proj.id}
                onClick={() => handleOpenProject(proj.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${activeProjectId === proj.id && (viewMode === 'details' || viewMode === 'analysis')
                  ? 'bg-brand-light border border-brand-green/30 text-white'
                  : 'text-gray-400 hover:bg-brand-light/20 hover:text-gray-200'
                  }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {activeProjectId === proj.id ? <FolderOpen size={16} className="text-brand-green" /> : <Folder size={16} />}
                  <span className="text-sm font-medium truncate max-w-[140px]">{proj.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-brand-light mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center font-bold text-brand-green">
              AD
            </div>
            <div>
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-gray-500">admin@saad.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Top Header Mobile Only */}
        <div className="md:hidden bg-brand-surface p-4 border-b border-brand-light flex justify-between items-center">
          <span className="font-bold text-white">SAAD Monitor</span>
          <Menu className="text-gray-400" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-8 relative">

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">Carregando seus projetos...</p>
            </div>
          ) : (
            <>
              {/* Logic Switcher */}
              {activeTab === 'dashboard' && viewMode === 'list' && renderProjectList()}
              {activeTab === 'deliveries' && renderDeliveriesList()}
              {(viewMode === 'details' || viewMode === 'analysis') && activeProject && (
                <div className="flex flex-1 overflow-hidden relative">
                  {/* Main Content */}
                  <div className={`flex-1 overflow-y-auto transition-all duration-300 ${isChatCollapsed ? 'mr-0' : 'mr-[350px]'}`}>
                    {renderProjectDetail()}
                  </div>

                  {/* Chat Panel */}
                  <div className={`absolute right-0 top-0 h-full transition-all duration-300 ease-in-out ${isChatCollapsed ? 'w-0 opacity-0 invisible' : 'w-[350px] opacity-100 visible'}`}>
                    {activeProject && (
                      <aside className="border-l border-brand-light h-full bg-brand-surface shadow-2xl z-20 shrink-0">
                        <Chat
                          messages={activeProject.chatHistory}
                          onSendMessage={handleSendMessage}
                          isLoading={isChatLoading}
                          isCollapsed={isChatCollapsed}
                          onToggleCollapse={() => setIsChatCollapsed(!isChatCollapsed)}
                        />
                      </aside>
                    )}
                  </div>

                  {/* Expand Button (when collapsed) */}
                  {isChatCollapsed && activeProject && (
                    <button
                      onClick={() => setIsChatCollapsed(false)}
                      className="absolute right-4 top-4 bg-brand-green text-brand-base p-2 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
                      title="Expandir Chat"
                    >
                      <Sparkles size={20} />
                    </button>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-light p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FolderOpen className="text-brand-green" /> Novo Projeto
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Projeto</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex: App de Delivery V2"
                  className="w-full bg-brand-base border border-brand-light rounded-lg p-2 text-white focus:ring-2 focus:ring-brand-green outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descrição Curta</label>
                <input
                  type="text"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Ex: Refatoração do backend..."
                  className="w-full bg-brand-base border border-brand-light rounded-lg p-2 text-white focus:ring-2 focus:ring-brand-green outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white mr-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 bg-brand-green hover:bg-brand-green-hover text-brand-base font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditProjectModalOpen && editingProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-light p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsEditProjectModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="text-brand-green" /> Editar Projeto
            </h3>

            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Projeto</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full bg-brand-base border border-brand-light rounded-lg p-2 text-white focus:ring-2 focus:ring-brand-green outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                <textarea
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full bg-brand-base border border-brand-light rounded-lg p-2 text-white focus:ring-2 focus:ring-brand-green outline-none h-24 resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProjectModalOpen(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white mr-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editingProject.name.trim()}
                  className="px-4 py-2 bg-brand-green hover:bg-brand-green-hover text-brand-base font-bold rounded-lg transition-colors shadow-lg shadow-brand-green/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditTaskModalOpen && editingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-light p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsEditTaskModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="text-brand-green" /> Editar Tarefa
            </h3>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Código</label>
                  <input
                    type="text"
                    value={editingTask.code}
                    onChange={(e) => setEditingTask({ ...editingTask, code: e.target.value })}
                    className="w-full bg-brand-base border border-brand-light rounded-lg p-2 text-white focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Título</label>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full bg-brand-base border border-brand-light rounded-lg p-2 text-white focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={editingTask.category}
                    onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                    className="w-full bg-brand-base border border-brand-light rounded-lg p-2 text-white focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Squad</label>
                  <select
                    value={editingTask.squad || 'Geral'}
                    onChange={(e) => setEditingTask({ ...editingTask, squad: e.target.value as any })}
                    className="w-full bg-brand-base border border-brand-light rounded-lg p-2 text-white focus:ring-2 focus:ring-brand-green outline-none"
                  >
                    <option value="UX/UI">UX/UI</option>
                    <option value="Backend">Backend</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full bg-brand-base border border-brand-light rounded-lg p-2 text-white focus:ring-2 focus:ring-brand-green outline-none h-32 resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditTaskModalOpen(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white mr-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-green hover:bg-brand-green-hover text-brand-base font-bold rounded-lg transition-colors shadow-lg shadow-brand-green/20"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;