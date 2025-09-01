// Script de test pour déboguer la question du jour
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrgwsykeswhdtqwsyrbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ3dzZWtlc3doZHRxd3N5cmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzQ5NzQsImV4cCI6MjA1MTI1MDk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDailyQuestions() {
  console.log('=== DEBUG DAILY QUESTIONS ===');
  
  // 1. Check what questions exist
  console.log('\n1. Checking questions table:');
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .limit(5);
  
  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
  } else {
    console.log('Questions found:', questions);
  }
  
  // 2. Check what daily_questions exist
  console.log('\n2. Checking daily_questions table:');
  const { data: dailyQuestions, error: dailyError } = await supabase
    .from('daily_questions')
    .select('*')
    .limit(5);
  
  if (dailyError) {
    console.error('Error fetching daily_questions:', dailyError);
  } else {
    console.log('Daily questions found:', dailyQuestions);
  }
  
  // 3. Check couples
  console.log('\n3. Checking couples table:');
  const { data: couples, error: couplesError } = await supabase
    .from('couples')
    .select('*')
    .limit(5);
  
  if (couplesError) {
    console.error('Error fetching couples:', couplesError);
  } else {
    console.log('Couples found:', couples);
  }
  
  // 4. Check today's date format
  const today = new Date().toISOString().split('T')[0];
  console.log('\n4. Today\'s date format:', today);
  
  // 5. Try to find a specific couple's daily questions
  if (couples && couples.length > 0) {
    const coupleId = couples[0].id;
    console.log('\n5. Checking daily questions for couple:', coupleId);
    
    const { data: coupleQuestions, error: coupleError } = await supabase
      .from('daily_questions')
      .select(`
        *,
        question:questions(*)
      `)
      .eq('couple_id', coupleId);
    
    if (coupleError) {
      console.error('Error fetching couple questions:', coupleError);
    } else {
      console.log('Couple questions:', coupleQuestions);
    }
  }
}

// Expose function globally for browser console
if (typeof window !== 'undefined') {
  window.debugDailyQuestions = debugDailyQuestions;
}

export { debugDailyQuestions };
