// Script de test pour le système d'humeur
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test du système d\'humeur...');

// Fonction de test qui peut être appelée manuellement
async function testMoodSystem() {
  try {
    console.log('🚀 Test du système d\'humeur...');
    
    // Vérifier que Supabase est disponible
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase n\'est pas disponible dans le contexte global');
      return false;
    }
    
    // Test 1: Vérifier l'existence de la table user_moods
    console.log('\n📊 Test 1: Vérification de la table user_moods');
    try {
      const { data: tableCheck, error: tableError } = await window.supabase
        .from('user_moods')
        .select('count')
        .limit(1);
      
      if (tableError) {
        console.error('   ❌ Erreur lors de la vérification de la table:', tableError);
        console.log('   💡 Exécutez le script SQL: setup-user-moods-table.sql');
        return false;
      } else {
        console.log('   ✅ Table user_moods accessible');
      }
    } catch (error) {
      console.error('   ❌ Erreur lors de la vérification de la table:', error);
      return false;
    }
    
    // Test 2: Vérifier l'utilisateur actuel
    console.log('\n👤 Test 2: Vérification de l\'utilisateur actuel');
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('   ❌ Aucun utilisateur connecté:', userError);
      return false;
    }
    
    console.log('   ✅ Utilisateur connecté:', user.id);
    
    // Test 3: Vérifier le couple de l'utilisateur
    console.log('\n💕 Test 3: Vérification du couple');
    const { data: couple, error: coupleError } = await window.supabase
      .from('couples')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();
    
    if (coupleError || !couple) {
      console.error('   ❌ Aucun couple trouvé:', coupleError);
      return false;
    }
    
    console.log('   ✅ Couple trouvé:', couple);
    
    // Test 4: Vérifier les humeurs existantes
    console.log('\n😊 Test 4: Vérification des humeurs existantes');
    const { data: existingMoods, error: moodsError } = await window.supabase
      .from('user_moods')
      .select('*')
      .in('user_id', [couple.user1_id, couple.user2_id])
      .order('created_at', { ascending: false });
    
    if (moodsError) {
      console.error('   ❌ Erreur lors de la récupération des humeurs:', moodsError);
    } else {
      console.log(`   ✅ ${existingMoods?.length || 0} humeurs trouvées`);
      if (existingMoods && existingMoods.length > 0) {
        existingMoods.forEach((mood, index) => {
          console.log(`     ${index + 1}. Utilisateur: ${mood.user_id}, Humeur: ${mood.mood_type}, Créé: ${mood.created_at}`);
        });
      }
    }
    
    // Test 5: Tester l'insertion d'une humeur
    console.log('\n➕ Test 5: Test d\'insertion d\'une humeur');
    const testMood = 'content';
    const { data: newMood, error: insertError } = await window.supabase
      .from('user_moods')
      .insert({
        user_id: user.id,
        mood_type: testMood,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('   ❌ Erreur lors de l\'insertion:', insertError);
    } else {
      console.log('   ✅ Humeur insérée avec succès:', newMood);
    }
    
    // Test 6: Vérifier les humeurs après insertion
    console.log('\n📋 Test 6: Vérification des humeurs après insertion');
    const { data: updatedMoods, error: updatedMoodsError } = await window.supabase
      .from('user_moods')
      .select('*')
      .in('user_id', [couple.user1_id, couple.user2_id])
      .order('created_at', { ascending: false });
    
    if (updatedMoodsError) {
      console.error('   ❌ Erreur lors de la récupération des humeurs mises à jour:', updatedMoodsError);
    } else {
      console.log(`   ✅ ${updatedMoods?.length || 0} humeurs trouvées après insertion`);
    }
    
    console.log('\n🎯 Test du système d\'humeur terminé avec succès!');
    return true;
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
    return false;
  }
}

// Fonction pour créer une humeur de test
async function createTestMood(moodType = 'joyeux') {
  try {
    console.log(`😊 Création d'une humeur de test: ${moodType}`);
    
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ Aucun utilisateur connecté');
      return false;
    }
    
    const { data, error } = await window.supabase
      .from('user_moods')
      .insert({
        user_id: user.id,
        mood_type: moodType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur lors de la création:', error);
      return false;
    }
    
    console.log('✅ Humeur créée avec succès:', data);
    return data;
    
  } catch (error) {
    console.error('💥 Erreur lors de la création:', error);
    return false;
  }
}

// Fonction pour afficher toutes les humeurs
async function showAllMoods() {
  try {
    console.log('📋 Affichage de toutes les humeurs...');
    
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ Aucun utilisateur connecté');
      return false;
    }
    
    // Trouver le couple
    const { data: couple } = await window.supabase
      .from('couples')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();
    
    if (!couple) {
      console.error('❌ Aucun couple trouvé');
      return false;
    }
    
    // Récupérer les humeurs
    const { data: moods, error } = await window.supabase
      .from('user_moods')
      .select(`
        *,
        profiles!inner(
          name,
          avatar_url
        )
      `)
      .in('user_id', [couple.user1_id, couple.user2_id])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur lors de la récupération:', error);
      return false;
    }
    
    console.log(`📊 ${moods?.length || 0} humeurs trouvées:`);
    if (moods && moods.length > 0) {
      moods.forEach((mood, index) => {
        console.log(`  ${index + 1}. ${mood.profiles?.name || 'Utilisateur'}: ${mood.mood_type} (${mood.created_at})`);
      });
    }
    
    return moods;
    
  } catch (error) {
    console.error('💥 Erreur lors de l\'affichage:', error);
    return false;
  }
}

// Exposer les fonctions globalement pour les tests
window.testMoodSystem = testMoodSystem;
window.createTestMood = createTestMood;
window.showAllMoods = showAllMoods;

console.log('\n✅ Script de test du système d\'humeur chargé!');
console.log('Fonctions disponibles:');
console.log('  • testMoodSystem() - Test complet du système d\'humeur');
console.log('  • createTestMood(moodType) - Créer une humeur de test');
console.log('  • showAllMoods() - Afficher toutes les humeurs');
console.log('\n💡 Commencez par: testMoodSystem()');
console.log('💡 Pour créer une humeur: createTestMood("joyeux")');
console.log('💡 Pour afficher les humeurs: showAllMoods()');
