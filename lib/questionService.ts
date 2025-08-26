import { supabase } from './supabase';

export interface Question {
  id: string;
  content: string;
  created_at: string;
  scheduled_time: string;
}

export interface DailyQuestion {
  id: string;
  couple_id: string;
  question_id: string;
  scheduled_for: string;
  created_at: string;
  question?: Question;
}

export interface Answer {
  id: string;
  daily_question_id: string;
  user_id: string;
  answer_text: string;
  created_at: string;
}

export interface ChatThread {
  id: string;
  daily_question_id: string;
  couple_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  sender?: {
    name: string;
  };
}

export const questionService = {
  // Get today's question for a couple
  async getTodayQuestion(coupleId: string): Promise<{ data: DailyQuestion | null; error: any }> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(*)
      `)
      .eq('couple_id', coupleId)
      .eq('scheduled_for', today)
      .single();

    return { data, error };
  },

  // Get daily question for a specific question and couple (regardless of date)
  async getDailyQuestionForQuestion(coupleId: string, questionId: string): Promise<{ data: DailyQuestion | null; error: any }> {
    const { data, error } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(*)
      `)
      .eq('couple_id', coupleId)
      .eq('question_id', questionId)
      .order('scheduled_for', { ascending: false })
      .limit(1)
      .single();

    return { data, error };
  },

  // Get all questions for a couple with answers
  async getQuestionsWithAnswers(coupleId: string): Promise<{ data: any[]; error: any }> {
    const { data, error } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(*),
        answers:answers(*)
      `)
      .eq('couple_id', coupleId)
      .order('scheduled_for', { ascending: false });

    return { data: data || [], error };
  },

  // Get all questions from the questions table (for testing)
  async getAllQuestions(): Promise<{ data: any[]; error: any }> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  },

  // Submit an answer
  async submitAnswer(dailyQuestionId: string, userId: string, answerText: string): Promise<{ data: Answer | null; error: any }> {
    const { data, error } = await supabase
      .from('answers')
      .insert({
        daily_question_id: dailyQuestionId,
        user_id: userId,
        answer_text: answerText
      })
      .select()
      .single();

    return { data, error };
  },

  // Check if both partners have answered
  async checkBothAnswered(dailyQuestionId: string): Promise<{ data: boolean; error: any }> {
    const { data, error } = await supabase
      .from('answered_daily_questions')
      .select('both_answered')
      .eq('daily_question_id', dailyQuestionId)
      .single();

    return { data: data?.both_answered || false, error };
  },

  // Get or create chat thread for a daily question
  async getOrCreateChatThread(dailyQuestionId: string, coupleId: string): Promise<{ data: ChatThread | null; error: any }> {
    // Try to get existing thread
    let { data, error } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('daily_question_id', dailyQuestionId)
      .eq('couple_id', coupleId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Thread doesn't exist, create it
      const { data: newThread, error: createError } = await supabase
        .from('chat_threads')
        .insert({
          daily_question_id: dailyQuestionId,
          couple_id: coupleId
        })
        .select()
        .single();

      return { data: newThread, error: createError };
    }

    return { data, error };
  },

  // Get chat messages for a thread
  async getChatMessages(threadId: string): Promise<{ data: ChatMessage[]; error: any }> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles(name)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    return { data: data || [], error };
  },

  // Send a chat message
  async sendMessage(threadId: string, senderId: string, messageText: string): Promise<{ data: ChatMessage | null; error: any }> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: senderId,
        message_text: messageText
      })
      .select(`
        *,
        sender:profiles(name)
      `)
      .single();

    return { data, error };
  },

  // Get couple information
  async getCouple(userId: string): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('couples')
      .select(`
        *,
        user1:profiles!couples_user1_id_fkey(*),
        user2:profiles!couples_user2_id_fkey(*)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single();

    return { data, error };
  }
};
