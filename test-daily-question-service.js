// Script de test simple pour le service de notifications des questions quotidiennes
// Exécutez ce script dans la console du navigateur

console.log('🧪 Test simple du service de notifications des questions quotidiennes...');

// Fonction de test qui peut être appelée manuellement
async function testDailyQuestionNotifications() {
  try {
    console.log('🚀 Test manuel du service...');
    
    // Import dynamique du service (si disponible)
    let dailyQuestionNotificationService;
    
    try {
      // Essayer d'importer depuis le module
      const module = await import('./lib/dailyQuestionNotificationService.js');
      dailyQuestionNotificationService = module.dailyQuestionNotificationService;
      console.log('✅ Service importé avec succès');
    } catch (importError) {
      console.log('⚠️ Import du module échoué, utilisation de la version globale');
      // Si le module n'est pas disponible, on utilise la version globale
      dailyQuestionNotificationService = window.dailyQuestionNotificationService;
    }
    
    if (!dailyQuestionNotificationService) {
      console.error('❌ Service non disponible. Vérifiez que le fichier est chargé.');
      return;
    }
    
    // Exécuter la vérification
    console.log('🔍 Exécution de la vérification...');
    const result = await dailyQuestionNotificationService.checkNewDailyQuestionsAndNotify();
    
    // Afficher les résultats
    console.log('\n📊 Résultats du test:');
    console.log('   • Questions trouvées:', result.questionsFound);
    console.log('   • Notifications envoyées:', result.notificationsSent);
    console.log('   • Erreurs:', result.errors.length);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Erreurs:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (result.notificationsSent > 0) {
      console.log('\n🎉 Succès! Des notifications ont été envoyées.');
    } else if (result.questionsFound > 0) {
      console.log('\n📋 Questions trouvées mais pas de nouvelles notifications nécessaires.');
    } else {
      console.log('\n📭 Aucune nouvelle question quotidienne trouvée pour aujourd\'hui.');
    }
    
    return result;
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
    return null;
  }
}

// Fonction de test rapide
async function quickTest() {
  console.log('⚡ Test rapide...');
  const result = await testDailyQuestionNotifications();
  return result;
}

// Fonction pour vérifier la structure de la base de données
async function checkDatabaseStructure() {
  console.log('🏗️ Vérification de la structure de la base de données...');
  
  try {
    // Vérifier que Supabase est disponible
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase n\'est pas disponible dans le contexte global');
      return false;
    }
    
    console.log('✅ Supabase disponible');
    
    // Vérifier la table daily_questions
    const { data: dailyQuestions, error: dqError } = await window.supabase
      .from('daily_questions')
      .select('*')
      .limit(1);
    
    if (dqError) {
      console.error('❌ Erreur lors de l\'accès à daily_questions:', dqError);
      return false;
    }
    
    console.log('✅ Table daily_questions accessible');
    
    // Vérifier la table questions
    const { data: questions, error: qError } = await window.supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    if (qError) {
      console.error('❌ Erreur lors de l\'accès à questions:', qError);
      return false;
    }
    
    console.log('✅ Table questions accessible');
    
    // Vérifier la table couples
    const { data: couples, error: cError } = await window.supabase
      .from('couples')
      .select('*')
      .limit(1);
    
    if (cError) {
      console.error('❌ Erreur lors de l\'accès à couples:', cError);
      return false;
    }
    
    console.log('✅ Table couples accessible');
    
    // Vérifier la table notifications
    const { data: notifications, error: nError } = await window.supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (nError) {
      console.error('❌ Erreur lors de l\'accès à notifications:', nError);
      return false;
    }
    
    console.log('✅ Table notifications accessible');
    
    console.log('🎯 Structure de la base de données vérifiée avec succès!');
    return true;
    
  } catch (error) {
    console.error('💥 Erreur lors de la vérification de la structure:', error);
    return false;
  }
}

// Fonction pour créer une question de test
async function createTestQuestion() {
  console.log('❓ Création d\'une question de test...');
  
  try {
    // Créer une question dans la table questions
    const { data: question, error: qError } = await window.supabase
      .from('questions')
      .insert({
        content: 'Question de test: Comment s\'est passée votre journée ?',
        scheduled_time: '09:00:00'
      })
      .select()
      .single();
    
    if (qError) {
      console.error('❌ Erreur lors de la création de la question:', qError);
      return null;
    }
    
    console.log('✅ Question créée:', question);
    
    // Récupérer un couple existant
    const { data: couple, error: cError } = await window.supabase
      .from('couples')
      .select('id')
      .limit(1)
      .single();
    
    if (cError) {
      console.error('❌ Erreur lors de la récupération du couple:', cError);
      return null;
    }
    
    console.log('✅ Couple récupéré:', couple);
    
    // Créer une question quotidienne pour aujourd\'hui
    const { data: dailyQuestion, error: dqError } = await window.supabase
      .from('daily_questions')
      .insert({
        couple_id: couple.id,
        question_id: question.id,
        scheduled_for: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
    
    if (dqError) {
      console.error('❌ Erreur lors de la création de la question quotidienne:', dqError);
      return null;
    }
    
    console.log('✅ Question quotidienne créée:', dailyQuestion);
    console.log('🎯 Question de test créée avec succès!');
    
    return { question, dailyQuestion };
    
  } catch (error) {
    console.error('💥 Erreur lors de la création de la question de test:', error);
    return null;
  }
}

// Exposer les fonctions globalement pour les tests
window.testDailyQuestionNotifications = testDailyQuestionNotifications;
window.quickTest = quickTest;
window.checkDatabaseStructure = checkDatabaseStructure;
window.createTestQuestion = createTestQuestion;

console.log('\n✅ Script de test chargé!');
console.log('Fonctions disponibles:');
console.log('  • testDailyQuestionNotifications() - Test complet du service');
console.log('  • quickTest() - Test rapide');
console.log('  • checkDatabaseStructure() - Vérifier la structure de la DB');
console.log('  • createTestQuestion() - Créer une question de test');
console.log('\n💡 Commencez par: checkDatabaseStructure()');
