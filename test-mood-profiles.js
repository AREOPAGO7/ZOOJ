// Script de test pour le système d'humeur basé sur la table profiles
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test du système d\'humeur avec table profiles...');

async function testMoodProfiles() {
  try {
    console.log('🚀 Test du système d\'humeur avec table profiles...');
    
    // Vérifier que Supabase est disponible
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase n\'est pas disponible dans le contexte global');
      return false;
    }
    
    // Test 1: Vérifier l'existence de la table profiles
    console.log('\n📊 Test 1: Vérification de la table profiles');
    try {
      const { data: tableCheck, error: tableError } = await window.supabase
        .from('profiles')
        .select('id, name, avatar_url, mood')
        .limit(1);
      
      if (tableError) {
        console.error('   ❌ Erreur lors de la vérification de la table profiles:', tableError);
        return false;
      } else {
        console.log('   ✅ Table profiles accessible');
        console.log('   📋 Colonnes disponibles:', Object.keys(tableCheck?.[0] || {}));
      }
    } catch (error) {
      console.error('   ❌ Erreur lors de la vérification de la table profiles:', error);
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
    
    // Test 3: Vérifier le profil de l'utilisateur
    console.log('\n👤 Test 3: Vérification du profil utilisateur');
    const { data: profile, error: profileError } = await window.supabase
      .from('profiles')
      .select('id, name, avatar_url, mood')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('   ❌ Erreur lors de la récupération du profil:', profileError);
      return false;
    }
    
    console.log('   ✅ Profil trouvé:', profile);
    console.log('   • Nom:', profile.name);
    console.log('   • Avatar:', profile.avatar_url ? 'Oui' : 'Non');
    console.log('   • Humeur actuelle:', profile.mood || 'neutre');
    
    // Test 4: Vérifier le couple de l'utilisateur
    console.log('\n💕 Test 4: Vérification du couple');
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
    
    // Test 5: Vérifier les profils du couple
    console.log('\n👥 Test 5: Vérification des profils du couple');
    const { data: coupleProfiles, error: coupleProfilesError } = await window.supabase
      .from('profiles')
      .select('id, name, avatar_url, mood')
      .in('id', [couple.user1_id, couple.user2_id]);
    
    if (coupleProfilesError) {
      console.error('   ❌ Erreur lors de la récupération des profils du couple:', coupleProfilesError);
      return false;
    }
    
    console.log(`   ✅ ${coupleProfiles?.length || 0} profils trouvés:`);
    if (coupleProfiles && coupleProfiles.length > 0) {
      coupleProfiles.forEach((profile, index) => {
        console.log(`     ${index + 1}. ${profile.name || 'Utilisateur'}: ${profile.mood || 'neutre'} (Avatar: ${profile.avatar_url ? 'Oui' : 'Non'})`);
      });
    }
    
    // Test 6: Tester la mise à jour d'une humeur
    console.log('\n➕ Test 6: Test de mise à jour d\'une humeur');
    const testMood = 'content';
    const { data: updatedProfile, error: updateError } = await window.supabase
      .from('profiles')
      .update({ mood: testMood })
      .eq('id', user.id)
      .select('id, name, mood')
      .single();
    
    if (updateError) {
      console.error('   ❌ Erreur lors de la mise à jour:', updateError);
    } else {
      console.log('   ✅ Humeur mise à jour avec succès:', updatedProfile);
    }
    
    // Test 7: Vérifier la mise à jour
    console.log('\n📋 Test 7: Vérification de la mise à jour');
    const { data: verifyProfile, error: verifyError } = await window.supabase
      .from('profiles')
      .select('id, name, mood')
      .eq('id', user.id)
      .single();
    
    if (verifyError) {
      console.error('   ❌ Erreur lors de la vérification:', verifyError);
    } else {
      console.log('   ✅ Humeur vérifiée:', verifyProfile.mood);
    }
    
    console.log('\n🎯 Test du système d\'humeur avec table profiles terminé avec succès!');
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
      .from('profiles')
      .update({ mood: moodType })
      .eq('id', user.id)
      .select('id, name, mood')
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

// Fonction pour afficher tous les profils du couple
async function showCoupleProfiles() {
  try {
    console.log('📋 Affichage des profils du couple...');
    
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
    
    // Récupérer les profils
    const { data: profiles, error } = await window.supabase
      .from('profiles')
      .select('id, name, avatar_url, mood')
      .in('id', [couple.user1_id, couple.user2_id]);
    
    if (error) {
      console.error('❌ Erreur lors de la récupération:', error);
      return false;
    }
    
    console.log(`📊 ${profiles?.length || 0} profils trouvés:`);
    if (profiles && profiles.length > 0) {
      profiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. ${profile.name || 'Utilisateur'}: ${profile.mood || 'neutre'} (Avatar: ${profile.avatar_url ? 'Oui' : 'Non'})`);
      });
    }
    
    return profiles;
    
  } catch (error) {
    console.error('💥 Erreur lors de l\'affichage:', error);
    return false;
  }
}

// Exposer les fonctions globalement pour les tests
window.testMoodProfiles = testMoodProfiles;
window.createTestMood = createTestMood;
window.showCoupleProfiles = showCoupleProfiles;

console.log('\n✅ Script de test du système d\'humeur avec table profiles chargé!');
console.log('Fonctions disponibles:');
console.log('  • testMoodProfiles() - Test complet du système d\'humeur avec table profiles');
console.log('  • createTestMood(moodType) - Créer une humeur de test');
console.log('  • showCoupleProfiles() - Afficher les profils du couple');
console.log('\n💡 Commencez par: testMoodProfiles()');
console.log('💡 Pour créer une humeur: createTestMood("joyeux")');
console.log('💡 Pour afficher les profils: showCoupleProfiles()');
