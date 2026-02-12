export enum ColumnType {
  TODO = 'A Fazer',
  DOING = 'Fazendo',
  TESTING = 'Testes',
  DEPLOY_DEV = 'Deploy Dev',
  DEPLOY_PROD = 'Deploy Prod',
}

export interface Task {
  id: string;
  code: string; // e.g., RN-001.1
  title: string;
  category: string; // e.g., RN-001 Definição
  description?: string;
  column: ColumnType;
  squad?: 'UX/UI' | 'Backend' | 'Frontend' | 'Geral';
  completed_at?: string; // ISO Date String (deprecated, use hmlg_at/prod_at)
  hmlg_at?: string; // ISO Date String - when entered DEPLOY_DEV or TESTING
  prod_at?: string; // ISO Date String - when entered DEPLOY_PROD
}

export interface ProjectTimeline {
  startDate: string; // ISO Date
  endDate: string;   // ISO Date
  totalWeeks: number;
  currentWeek: number;
  progressMessage?: string;
}

export interface AIAnalysisResult {
  tasks: Task[];
  timeline?: ProjectTimeline;
  insights: string[];
  reply: string; // The AI's conversational response
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export type ProjectStatus = 'active' | 'completed' | 'paused';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  status: ProjectStatus;
  tasks: Task[];
  timeline: ProjectTimeline | null;
  insights: string[];
  chatHistory: ChatMessage[];
}