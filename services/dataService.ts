import { supabase } from './supabase';
import { Project, Task, ProjectTimeline, ChatMessage, ColumnType, ProjectStatus } from '../types';

export const dataService = {
    async getProjects(): Promise<Project[]> {
        const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select(`
        *,
        tasks (*),
        timelines (*),
        chat_messages (*)
      `)
            .order('created_at', { ascending: false });

        if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            return [];
        }

        return projectsData.map((p: any) => {
            // Support both array and object responses for joins
            const timelinesArray = Array.isArray(p.timelines) ? p.timelines : (p.timelines ? [p.timelines] : []);
            const timelineData = timelinesArray.length > 0 ? timelinesArray[0] : null;

            return {
                id: p.id,
                name: p.name,
                description: p.description || '',
                createdAt: new Date(p.created_at),
                status: p.status as ProjectStatus,
                insights: p.insights || [],
                tasks: (p.tasks || []).map((t: any) => ({
                    id: t.id,
                    code: t.code,
                    title: t.title,
                    category: t.category,
                    description: t.description || '',
                    column: t.column as ColumnType,
                    squad: t.squad as any,
                })),
                timeline: timelineData ? {
                    startDate: timelineData.start_date,
                    endDate: timelineData.end_date,
                    totalWeeks: timelineData.total_weeks,
                    current_week: timelineData.current_week, // Fix mapping if it's current_week or currentWeek
                    currentWeek: timelineData.current_week || timelineData.currentWeek,
                    progressMessage: timelineData.progress_message || '',
                } : null,
                chatHistory: (p.chat_messages || [])
                    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map((m: any) => ({
                        id: m.id,
                        role: m.role as 'user' | 'ai',
                        content: m.content,
                        timestamp: new Date(m.timestamp),
                    })),
            };
        });
    },

    async createProject(project: Partial<Project>): Promise<string | null> {
        const { data, error } = await supabase
            .from('projects')
            .insert({
                name: project.name,
                description: project.description,
                status: project.status || 'active',
                insights: project.insights || []
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            return null;
        }
        return data.id;
    },

    async deleteProject(projectId: string): Promise<boolean> {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            console.error('Error deleting project:', error);
            return false;
        }
        return true;
    },

    async updateProjectStatus(projectId: string, status: ProjectStatus): Promise<boolean> {
        const { error } = await supabase
            .from('projects')
            .update({ status })
            .eq('id', projectId);

        if (error) {
            console.error('Error updating project status:', error);
            return false;
        }
        return true;
    },

    async updateProject(projectId: string, updates: { name?: string; description?: string }): Promise<boolean> {
        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId);

        if (error) {
            console.error('Error updating project:', error);
            return false;
        }
        return true;
    },

    async upsertTask(projectId: string, task: Task): Promise<boolean> {
        const { error } = await supabase
            .from('tasks')
            .upsert({
                id: task.id,
                project_id: projectId,
                code: task.code,
                title: task.title,
                category: task.category,
                description: task.description,
                column: task.column,
                squad: task.squad
            });

        if (error) {
            console.error('Error upserting task:', error);
            return false;
        }
        return true;
    },

    async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
        const { error } = await supabase
            .from('tasks')
            .update({
                code: updates.code,
                title: updates.title,
                category: updates.category,
                description: updates.description,
                column: updates.column,
                squad: updates.squad
            })
            .eq('id', taskId);

        if (error) {
            console.error('Error updating task:', error);
            return false;
        }
        return true;
    },

    async deleteTask(taskId: string): Promise<boolean> {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting task:', error);
            return false;
        }
        return true;
    },

    async saveTasks(projectId: string, tasks: Task[]): Promise<boolean> {
        const tasksToInsert = tasks.map(t => ({
            id: t.id,
            project_id: projectId,
            code: t.code,
            title: t.title,
            category: t.category,
            description: t.description,
            column: t.column,
            squad: t.squad
        }));

        const { error } = await supabase
            .from('tasks')
            .upsert(tasksToInsert);

        if (error) {
            console.error('Error saving tasks:', error);
            return false;
        }
        return true;
    },

    async addChatMessage(projectId: string, message: ChatMessage): Promise<boolean> {
        const { error } = await supabase
            .from('chat_messages')
            .insert({
                id: message.id,
                project_id: projectId,
                role: message.role,
                content: message.content,
                timestamp: message.timestamp.toISOString()
            });

        if (error) {
            console.error('Error adding chat message:', error);
            return false;
        }
        return true;
    },

    async updateTimeline(projectId: string, timeline: ProjectTimeline): Promise<boolean> {
        const { error } = await supabase
            .from('timelines')
            .upsert({
                project_id: projectId,
                start_date: timeline.startDate,
                end_date: timeline.endDate,
                total_weeks: timeline.totalWeeks,
                current_week: timeline.currentWeek,
                progress_message: timeline.progressMessage
            }, { onConflict: 'project_id' });

        if (error) {
            console.error('Error updating timeline:', error);
            return false;
        }
        return true;
    },

    async updateProjectInsights(projectId: string, insights: string[]): Promise<boolean> {
        const { error } = await supabase
            .from('projects')
            .update({ insights })
            .eq('id', projectId);

        if (error) {
            console.error('Error updating project insights:', error);
            return false;
        }
        return true;
    }
};
