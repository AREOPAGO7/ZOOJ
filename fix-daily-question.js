// Script simple pour corriger la question du jour
// Copiez ce code dans la console du navigateur

async function fixDailyQuestion() {
  console.log('🔧 Fixing daily question...');
  
  try {
    // 1. Get your couple ID (replace with your actual couple ID)
    const coupleId = '0f2a1908-b008-42ee-a3ac-6066d7a8f995';
    console.log('👫 Using couple ID:', coupleId);
    
    // 2. Create a question if needed
    const { data: questions } = await supabase
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
    
    console.log('🎉 Success! Daily question created:');
    console.log('   Question:', dailyQuestion.question?.content);
    console.log('   Date:', dailyQuestion.scheduled_for);
    console.log('   ID:', dailyQuestion.id);
    
    // 4. Reload the page to see the change
    console.log('🔄 Reloading page...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Expose globally
window.fixDailyQuestion = fixDailyQuestion;

console.log('🚀 Run: fixDailyQuestion() to fix the daily question');
