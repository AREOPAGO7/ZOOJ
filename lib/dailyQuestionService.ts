import { supabase } from './supabase'

export interface DailyQuestion {
  id: string
  couple_id: string | null
  question_id: string
  scheduled_for: string
  created_at: string
}

export interface Question {
  id: string
  content: string
  scheduled_time: string
  created_at: string
}

export const dailyQuestionService = {
  // Create a daily question
  async createDailyQuestion(data: {
    couple_id: string | null
    question_id: string
    scheduled_for: string
  }): Promise<{ data: DailyQuestion | null; error: any }> {
    const { data, error } = await supabase
      .from('daily_questions')
      .insert(data)
      .select()
      .single()

    return { data, error }
  },

  // Get daily questions for a couple
  async getDailyQuestions(coupleId: string): Promise<{ data: DailyQuestion[] | null; error: any }> {
    const { data, error } = await supabase
      .from('daily_questions')
      .select('*')
      .eq('couple_id', coupleId)
      .order('scheduled_for', { ascending: false })

    return { data, error }
  },

  // Get questions
  async getQuestions(): Promise<{ data: Question[] | null; error: any }> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })

    return { data, error }
  }
}
