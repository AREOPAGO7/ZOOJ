// Script pour insérer une question de test
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrgwsykeswhdtqwsyrbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ3dzZWtlc3doZHRxd3N5cmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzQ5NzQsImV4cCI6MjA1MTI1MDk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestDailyQuestion() {
  console.log('=== INSERTING TEST DAILY QUESTION ===');
  
  try {
    // 1. First, check if we have any couples
    console.log('\n1. Checking couples...');
    const { data: couples, error: couplesError } = await supabase
      .from('couples')
      .select('*')
      .limit(1);
    
    if (couplesError) {
      console.error('Error fetching couples:', couplesError);
      return;
    }
    
    if (!couples || couples.length === 0) {
      console.log('No couples found. Please create a couple first.');
      return;
    }
    
    const coupleId = couples[0].id;
    console.log('Using couple ID:', coupleId);
    
    // 2. Check if we have any questions
    console.log('\n2. Checking questions...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return;
    }
    
    let questionId;
    
    if (!questions || questions.length === 0) {
      // 3. Create a test question if none exists
      console.log('\n3. Creating test question...');
      const { data: newQuestion, error: createError } = await supabase
        .from('questions')
        .insert({
          content: 'Quel est le moment le plus romantique que vous avez partagé ensemble ?',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating question:', createError);
        return;
      }
      
      questionId = newQuestion.id;
      console.log('Created question with ID:', questionId);
    } else {
      questionId = questions[0].id;
      console.log('Using existing question ID:', questionId);
    }
    
    // 4. Create daily question for today
    console.log('\n4. Creating daily question for today...');
    const today = new Date().toISOString().split('T')[0];
    
    const { data: dailyQuestion, error: dailyError } = await supabase
      .from('daily_questions')
      .insert({
        couple_id: coupleId,
        question_id: questionId,
        scheduled_for: today,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        question:questions(*)
      `)
      .single();
    
    if (dailyError) {
      console.error('Error creating daily question:', dailyError);
      return;
    }
    
    console.log('Successfully created daily question:', dailyQuestion);
    console.log('Question content:', dailyQuestion.question?.content);
    console.log('Scheduled for:', dailyQuestion.scheduled_for);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Expose function globally for browser console
if (typeof window !== 'undefined') {
  window.insertTestDailyQuestion = insertTestDailyQuestion;
}

export { insertTestDailyQuestion };
