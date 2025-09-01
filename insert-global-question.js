// Script pour insérer une question globale
// Copiez ce code dans la console du navigateur

async function insertGlobalQuestion() {
  console.log('🌍 Inserting global question...');
  
  try {
    // 1. Create a question if needed
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
    
    // 2. Insert global question for today (couple_id = null)
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Today:', today);
    
    const { data: globalQuestion, error } = await supabase
      .from('daily_questions')
      .insert({
        couple_id: null, // This makes it a global question
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
    
    console.log('🎉 Success! Global question created:');
    console.log('   Question:', globalQuestion.question?.content);
    console.log('   Date:', globalQuestion.scheduled_for);
    console.log('   ID:', globalQuestion.id);
    console.log('   Global: Yes (couple_id = null)');
    
    // 3. Reload the page to see the change
    console.log('🔄 Reloading page...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Expose globally
window.insertGlobalQuestion = insertGlobalQuestion;

console.log('🚀 Run: insertGlobalQuestion() to create a global question');
