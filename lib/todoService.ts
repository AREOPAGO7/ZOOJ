import { supabase } from './supabase';

export interface Todo {
  id: string;
  couple_id: string;
  title: string;
  description?: string;
  due_date?: string;
  time?: string;
  priority: 'urgent' | 'normal' | 'peut_attendre';
  status: 'a_faire' | 'en_cours' | 'termine';
  created_at: string;
}

export interface CreateTodoData {
  couple_id: string;
  title: string;
  description?: string;
  due_date?: string;
  time?: string;
  priority: 'urgent' | 'normal' | 'peut_attendre';
  status?: 'a_faire' | 'en_cours' | 'termine';
}

export interface UpdateTodoData {
  title?: string;
  description?: string;
  due_date?: string;
  time?: string;
  priority?: 'urgent' | 'normal' | 'peut_attendre';
  status?: 'a_faire' | 'en_cours' | 'termine';
}

export const todoService = {
  // Get all todos for a couple
  async getTodos(coupleId: string): Promise<{ data: Todo[] | null; error: any }> {
    const { data, error } = await supabase
      .from('calendar_todos')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // Get a single todo by ID
  async getTodo(todoId: string): Promise<{ data: Todo | null; error: any }> {
    const { data, error } = await supabase
      .from('calendar_todos')
      .select('*')
      .eq('id', todoId)
      .single();

    return { data, error };
  },

  // Create a new todo
  async createTodo(todoData: CreateTodoData): Promise<{ data: Todo | null; error: any }> {
    const { data, error } = await supabase
      .from('calendar_todos')
      .insert(todoData)
      .select()
      .single();

    return { data, error };
  },

  // Update a todo
  async updateTodo(todoId: string, updateData: UpdateTodoData): Promise<{ data: Todo | null; error: any }> {
    const { data, error } = await supabase
      .from('calendar_todos')
      .update(updateData)
      .eq('id', todoId)
      .select()
      .single();

    return { data, error };
  },

  // Delete a todo
  async deleteTodo(todoId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('calendar_todos')
      .delete()
      .eq('id', todoId);

    return { error };
  },

  // Get todos by status
  async getTodosByStatus(coupleId: string, status: 'a_faire' | 'en_cours' | 'termine'): Promise<{ data: Todo[] | null; error: any }> {
    const { data, error } = await supabase
      .from('calendar_todos')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // Get todos by priority
  async getTodosByPriority(coupleId: string, priority: 'urgent' | 'normal' | 'peut_attendre'): Promise<{ data: Todo[] | null; error: any }> {
    const { data, error } = await supabase
      .from('calendar_todos')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('priority', priority)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // Get overdue todos
  async getOverdueTodos(coupleId: string): Promise<{ data: Todo[] | null; error: any }> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('calendar_todos')
      .select('*')
      .eq('couple_id', coupleId)
      .lt('due_date', today)
      .neq('status', 'termine')
      .order('due_date', { ascending: true });

    return { data, error };
  },

  // Get todos due today
  async getTodosDueToday(coupleId: string): Promise<{ data: Todo[] | null; error: any }> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('calendar_todos')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('due_date', today)
      .neq('status', 'termine')
      .order('priority', { ascending: false });

    return { data, error };
  }
};
