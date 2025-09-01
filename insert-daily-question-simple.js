// Script simple pour insérer une question dans daily_questions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrgwsykeswhdtqwsyrbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ3dzZWtlc3doZHRxd3N5cmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzQ5NzQsImV4cCI6MjA1MTI1MDk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertDailyQuestion() {
  console.log('=== INSERTING DAILY QUESTION ===');
  
  try {
    // 1. Get the first couple
    const { data: couples } = await supabase
      .from('couples')
      .select('id')
      .limit(1);
    
    if (!couples || couples.length === 0) {
      console.log('❌ No couples found');
      return;
    }
    
    const coupleId = couples[0].id;
    console.log('✅ Using couple ID:', coupleId);
    
    // 2. Get or create a question
    let { data: questions } = await supabase
      .from('questions')
      .select('id')
      .limit(1);
    
    let questionId;
    
    if (!questions || questions.length === 0) {
      // Create a question
      const { data: newQuestion } = await supabase
        .from('questions')
        .insert({
          content: 'Quel est le moment le plus romantique que vous avez partagé ensemble ?',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      questionId = newQuestion.id;
      console.log('✅ Created question ID:', questionId);
    } else {
      questionId = questions[0].id;
      console.log('✅ Using existing question ID:', questionId);
    }
    
    // 3. Insert daily question for today
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Today:', today);
    
    const { data: dailyQuestion, error } = await supabase
      .from('daily_questions')
      .insert({
        couple_id: coupleId,
        question_id: questionId,
        scheduled_for: today,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        question:questions(content)
      `)
      .single();
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('✅ Success! Daily question created:');
    console.log('   Question:', dailyQuestion.question?.content);
    console.log('   Date:', dailyQuestion.scheduled_for);
    console.log('   ID:', dailyQuestion.id);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.insertDailyQuestion = insertDailyQuestion;
}

export { insertDailyQuestion };
