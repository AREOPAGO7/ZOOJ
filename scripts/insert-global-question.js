const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertGlobalQuestion(questionId, scheduledFor = null) {
  try {
    console.log('Inserting global question...');
    
    const scheduledDate = scheduledFor || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_questions')
      .insert({
        question_id: questionId,
        couple_id: null, // Global question - available to all users
        scheduled_for: scheduledDate
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting global question:', error);
      return;
    }

    console.log('✅ Global question inserted successfully:', data);
    console.log('📅 Scheduled for:', scheduledDate);
    console.log('🌍 Available to all users (couple_id: null)');
    
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function listAvailableQuestions() {
  try {
    console.log('\n📋 Available questions from questions table:');
    
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, content, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
      return;
    }

    questions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q.id}`);
      console.log(`   Content: ${q.content.substring(0, 80)}${q.content.length > 80 ? '...' : ''}`);
      console.log(`   Created: ${q.created_at}`);
      console.log('');
    });

    return questions;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔧 Global Question Insertion Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node insert-global-question.js <question_id> [scheduled_date]');
    console.log('  node insert-global-question.js --list');
    console.log('');
    console.log('Examples:');
    console.log('  node insert-global-question.js 123e4567-e89b-12d3-a456-426614174000');
    console.log('  node insert-global-question.js 123e4567-e89b-12d3-a456-426614174000 2024-01-15');
    console.log('  node insert-global-question.js --list');
    console.log('');
    
    // Show available questions
    await listAvailableQuestions();
    return;
  }

  if (args[0] === '--list') {
    await listAvailableQuestions();
    return;
  }

  const questionId = args[0];
  const scheduledFor = args[1] || null;

  console.log('🚀 Inserting global question...');
  console.log('Question ID:', questionId);
  console.log('Scheduled for:', scheduledFor || 'Today');
  console.log('');

  await insertGlobalQuestion(questionId, scheduledFor);
}

main().catch(console.error);
