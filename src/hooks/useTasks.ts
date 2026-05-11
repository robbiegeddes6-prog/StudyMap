import { useCallback, useState } from 'react';
import { Task, TaskType, Difficulty, Subject } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTasks = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = useCallback(
    async (
      name: string,
      subject: Subject,
      type: TaskType,
      difficulty: Difficulty,
      dueDate: string,
      estimatedHours: number,
      description?: string
    ): Promise<Task | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const now = new Date().toISOString();
        const taskData = {
          user_id: user.id,
          name,
          subject,
          type,
          difficulty,
          due_date: dueDate,
          estimated_hours: estimatedHours,
          description: description || '',
          completed: false,
          priority: difficulty, // Map difficulty to priority
          created_at: now,
          updated_at: now,
        };

        const { data, error: createError } = await supabase
          .from('assignments')
          .insert([taskData])
          .select()
          .single();

        if (createError) throw createError;

        // Map Supabase schema to our Task type
        const task: Task = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          subject: data.subject as Subject,
          type: data.type as TaskType,
          difficulty: data.difficulty as Difficulty,
          dueDate: data.due_date,
          estimatedHours: data.estimated_hours,
          completed: data.completed,
          description: data.description,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        return task;
      } catch (err) {
        const message = (err as Error)?.message || 'Failed to create task';
        setError(message);
        console.error('Error creating task:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>
    ): Promise<Task | null> => {
      setLoading(true);
      setError(null);

      try {
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        // Map our types to Supabase schema
        if (updates.name) updateData.name = updates.name;
        if (updates.subject) updateData.subject = updates.subject;
        if (updates.type) updateData.type = updates.type;
        if (updates.difficulty) {
          updateData.difficulty = updates.difficulty;
          updateData.priority = updates.difficulty;
        }
        if (updates.dueDate) updateData.due_date = updates.dueDate;
        if (updates.estimatedHours) updateData.estimated_hours = updates.estimatedHours;
        if (updates.completed !== undefined) updateData.completed = updates.completed;
        if (updates.description) updateData.description = updates.description;

        const { data, error: updateError } = await supabase
          .from('assignments')
          .update(updateData)
          .eq('id', taskId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Map back to our Task type
        const task: Task = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          subject: data.subject as Subject,
          type: data.type as TaskType,
          difficulty: data.difficulty as Difficulty,
          dueDate: data.due_date,
          estimatedHours: data.estimated_hours,
          completed: data.completed,
          description: data.description,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        return task;
      } catch (err) {
        const message = (err as Error)?.message || 'Failed to update task';
        setError(message);
        console.error('Error updating task:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Delete associated study sessions first
      await supabase
        .from('study_sessions')
        .delete()
        .eq('assignment_id', taskId);

      // Delete the task
      const { error: deleteError } = await supabase
        .from('assignments')
        .delete()
        .eq('id', taskId);

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      const message = (err as Error)?.message || 'Failed to delete task';
      setError(message);
      console.error('Error deleting task:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeTask = useCallback(
    async (taskId: string): Promise<Task | null> => {
      return updateTask(taskId, { completed: true });
    },
    [updateTask]
  );

  const getTasks = useCallback(
    async (filters?: {
      completed?: boolean;
      subject?: Subject;
      type?: TaskType;
    }): Promise<Task[]> => {
      if (!user) {
        setError('User not authenticated');
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('assignments')
          .select()
          .eq('user_id', user.id)
          .order('due_date', { ascending: true });

        if (filters?.completed !== undefined) {
          query = query.eq('completed', filters.completed);
        }

        if (filters?.subject) {
          query = query.eq('subject', filters.subject as string);
        }

        if (filters?.type) {
          query = query.eq('type', filters.type as string);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        // Map to our Task type
        const tasks: Task[] = (data || []).map((item: unknown) => {
          const taskItem = item as Record<string, unknown>;
          return {
          id: taskItem.id as string,
          userId: taskItem.user_id as string,
          name: taskItem.name as string,
          subject: taskItem.subject as Subject,
          type: taskItem.type as TaskType,
          difficulty: taskItem.difficulty as Difficulty,
          dueDate: taskItem.due_date as string,
          estimatedHours: taskItem.estimated_hours as number,
          completed: taskItem.completed as boolean,
          description: taskItem.description as string,
          createdAt: taskItem.created_at as string,
          updatedAt: taskItem.updated_at as string,
        }));

        return tasks;
      } catch (err) {
        const message = (err as Error)?.message || 'Failed to fetch tasks';
        setError(message);
        console.error('Error fetching tasks:', err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const getTaskById = useCallback(
    async (taskId: string): Promise<Task | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from('assignments')
          .select()
          .eq('id', taskId)
          .single();

        if (queryError) throw queryError;

        // Map to our Task type
        const task: Task = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          subject: data.subject as Subject,
          type: data.type as TaskType,
          difficulty: data.difficulty as Difficulty,
          dueDate: data.due_date,
          estimatedHours: data.estimated_hours,
          completed: data.completed,
          description: data.description,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        return task;
      } catch (err: any) {
        const message = err.message || 'Failed to fetch task';
        setError(message);
        console.error('Error fetching task:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    getTasks,
    getTaskById,
    loading,
    error,
  };
};
