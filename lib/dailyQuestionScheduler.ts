import { supabase } from './supabase';

export const dailyQuestionScheduler = {
  // Get or create today's question for a couple
  async getOrCreateTodayQuestion(coupleId: string): Promise<{ data: any; error: any }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if question already exists for today
    const { data: existingQuestion, error: checkError } = await supabase
      .from('daily_questions')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('scheduled_for', today)
      .single();

    if (existingQuestion) {
      return { data: existingQuestion, error: null };
    }

    // Get a random question
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);

    if (questionsError || !questions || questions.length === 0) {
      return { data: null, error: questionsError || 'No questions available' };
    }

    // Create daily question
    const { data: newDailyQuestion, error: createError } = await supabase
      .from('daily_questions')
      .insert({
        couple_id: coupleId,
        question_id: questions[0].id,
        scheduled_for: today
      })
      .select()
      .single();

    return { data: newDailyQuestion, error: createError };
  },

  // Initialize some sample questions
  async initializeSampleQuestions(): Promise<{ data: any; error: any }> {
    const sampleQuestions = [
      {
        content: "Les couples devraient ils partager leurs mots de passe?",
        scheduled_time: "08:00"
      },
      {
        content: "Quelle est votre plus grande peur dans la relation?",
        scheduled_time: "08:00"
      },
      {
        content: "Si vous pouviez voyager n'importe où ensemble, où iriez-vous?",
        scheduled_time: "08:00"
      },
      {
        content: "Quel est votre souvenir préféré de notre relation?",
        scheduled_time: "08:00"
      },
      {
        content: "Quelle est la qualité que vous admirez le plus chez votre partenaire?",
        scheduled_time: "08:00"
      },
      {
        content: "Si vous pouviez changer une chose dans notre relation, ce serait quoi?",
        scheduled_time: "08:00"
      },
      {
        content: "Quel est votre rêve le plus fou que vous aimeriez réaliser ensemble?",
        scheduled_time: "08:00"
      },
      {
        content: "Quelle est la chose la plus romantique que votre partenaire a faite pour vous?",
        scheduled_time: "08:00"
      },
      {
        content: "Si vous deviez décrire notre relation en trois mots, lesquels choisiriez-vous?",
        scheduled_time: "08:00"
      },
      {
        content: "Quel est le moment où vous vous êtes senti le plus connecté à votre partenaire?",
        scheduled_time: "08:00"
      }
    ];

    const { data, error } = await supabase
      .from('questions')
      .insert(sampleQuestions)
      .select();

    return { data, error };
  },

  // Get today's question with full details
  async getTodayQuestionWithDetails(coupleId: string): Promise<{ data: any; error: any }> {
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
  }
};
