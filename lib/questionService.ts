import { supabase } from './supabase';

export interface Question {
  id: string;
  content: string;
  content_en?: string;
  content_ar?: string;
  content_ma?: string;
  created_at: string;
  scheduled_time: string;
}

export interface DailyQuestion {
  id: string;
  couple_id: string;
  question_id: string;
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

// Helper function to get the correct content field based on language
export const getQuestionContent = (question: any, language: string): string => {
  // Default to French if no language specified
  if (!language) language = 'fr';
  
  switch (language) {
    case 'en':
      return question.content_en || question.content;
    case 'ar':
      return question.content_ar || question.content;
    case 'ma':
      return question.content_ma || question.content;
    case 'fr':
    default:
      return question.content;
  }
};

export const questionService = {
  // Get today's question for a couple
  async getTodayQuestion(coupleId: string): Promise<{ data: DailyQuestion | null; error: any }> {
    const today = new Date().toISOString().split('T')[0];
    
    // First, try to get a couple-specific question for today
    const { data: coupleQuestion, error: coupleError } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(id, content, content_en, content_ar, content_ma, created_at, scheduled_time)
      `)
      .eq('couple_id', coupleId)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .limit(1);

    if (coupleQuestion && coupleQuestion.length > 0) {
      return { data: coupleQuestion[0], error: null };
    }

    // If no couple-specific question, try to get a global question for today
    const { data: globalQuestion, error: globalError } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(id, content, content_en, content_ar, content_ma, created_at, scheduled_time)
      `)
      .is('couple_id', null)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .limit(1);

    if (globalQuestion && globalQuestion.length > 0) {
      return { data: globalQuestion[0], error: null };
    }

    // If no question for today, try to get the most recent global question
    const { data: recentGlobalQuestion, error: recentError } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(id, content, content_en, content_ar, content_ma, created_at, scheduled_time)
      `)
      .is('couple_id', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentGlobalQuestion && recentGlobalQuestion.length > 0) {
      return { data: recentGlobalQuestion[0], error: null };
    }

    return { data: null, error: null };
  },

  // Get daily question for a specific question and couple (regardless of date)
  async getDailyQuestionForQuestion(coupleId: string, questionId: string): Promise<{ data: DailyQuestion | null; error: any }> {
    const { data, error } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(id, content, content_en, content_ar, content_ma, created_at, scheduled_time)
      `)
      .eq('couple_id', coupleId)
      .eq('question_id', questionId)
      .order('created_at', { ascending: false })
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
        question:questions(id, content, content_en, content_ar, content_ma, created_at, scheduled_time),
        answers:answers(*)
      `)
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  },

  // Get all questions from the questions table (for testing)
  async getAllQuestions(): Promise<{ data: any[]; error: any }> {
    const { data, error } = await supabase
      .from('questions')
      .select('id, content, content_en, content_ar, content_ma, created_at, scheduled_time')
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
