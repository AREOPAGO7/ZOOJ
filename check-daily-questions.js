// Script pour vérifier le contenu de daily_questions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrgwsykeswhdtqwsyrbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ3dzZWtlc3doZHRxd3N5cmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzQ5NzQsImV4cCI6MjA1MTI1MDk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDailyQuestions() {
  console.log('=== CHECKING DAILY_QUESTIONS TABLE ===');
  
  try {
    // 1. Check all daily_questions
    const { data: dailyQuestions, error } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(content),
        couple:couples(id)
      `)
      .order('scheduled_for', { ascending: false });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('📊 Total daily questions:', dailyQuestions?.length || 0);
    
    if (dailyQuestions && dailyQuestions.length > 0) {
      console.log('\n📋 Daily questions found:');
      dailyQuestions.forEach((dq, index) => {
        console.log(`\n${index + 1}. ID: ${dq.id}`);
        console.log(`   Question: ${dq.question?.content || 'N/A'}`);
        console.log(`   Scheduled for: ${dq.scheduled_for}`);
        console.log(`   Couple ID: ${dq.couple_id}`);
        console.log(`   Created: ${dq.created_at}`);
      });
    } else {
      console.log('❌ No daily questions found');
    }
    
    // 2. Check today's date
    const today = new Date().toISOString().split('T')[0];
    console.log('\n📅 Today\'s date:', today);
    
    // 3. Check if there's a question for today
    const { data: todayQuestion } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(content)
      `)
      .eq('scheduled_for', today);
    
    if (todayQuestion && todayQuestion.length > 0) {
      console.log('✅ Found question for today!');
      todayQuestion.forEach((dq, index) => {
        console.log(`   ${index + 1}. ${dq.question?.content}`);
      });
    } else {
      console.log('❌ No question found for today');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.checkDailyQuestions = checkDailyQuestions;
}

export { checkDailyQuestions };
