// Script de test pour vérifier l'affichage des pulses
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test de l\'affichage des pulses...');

async function testPulseDisplay() {
  try {
    console.log('🚀 Test de l\'affichage des pulses...');
    
    // Vérifier que Supabase est disponible
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase n\'est pas disponible dans le contexte global');
      return false;
    }
    
    // Test 1: Vérifier l'utilisateur actuel
    console.log('\n👤 Test 1: Vérification de l\'utilisateur actuel');
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('   ❌ Aucun utilisateur connecté:', userError);
      return false;
    }
    
    console.log('   ✅ Utilisateur connecté:', user.id);
    
    // Test 2: Vérifier le couple
    console.log('\n💕 Test 2: Vérification du couple');
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
    
    // Test 3: Créer un pulse de test non lu
    console.log('\n➕ Test 3: Création d\'un pulse de test non lu');
    const receiverId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
    
    const { data: testPulse, error: createError } = await window.supabase
      .from('pulses')
      .insert({
        sender_id: receiverId, // Le partenaire envoie le pulse
        receiver_id: user.id,  // L'utilisateur actuel reçoit
        emoji: '🌸',
        message: 'Test pulse pour vérifier l\'affichage',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_read: false
      })
      .select()
      .single();
    
    if (createError) {
      console.error('   ❌ Erreur lors de la création du pulse:', createError);
    } else {
      console.log('   ✅ Pulse de test créé:', testPulse);
    }
    
    // Test 4: Vérifier que le pulse est visible
    console.log('\n👁️ Test 4: Vérification de la visibilité du pulse');
    const { data: visiblePulse, error: fetchError } = await window.supabase
      .from('pulses')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('is_read', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (fetchError) {
      console.error('   ❌ Erreur lors de la récupération:', fetchError);
    } else {
      console.log('   ✅ Pulse visible trouvé:', visiblePulse);
    }
    
    // Test 5: Simuler le service getLatestReceivedPulse
    console.log('\n🔍 Test 5: Simulation du service getLatestReceivedPulse');
    const { data: latestPulse, error: latestError } = await window.supabase
      .from('pulses')
      .select(`
        *,
        sender:profiles!pulses_sender_id_fkey(name, profile_picture)
      `)
      .eq('receiver_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (latestError && latestError.code !== 'PGRST116') {
      console.error('   ❌ Erreur lors de la récupération du dernier pulse:', latestError);
    } else if (latestPulse) {
      console.log('   ✅ Dernier pulse reçu:', latestPulse);
      console.log('   📋 Détails:');
      console.log('     - Emoji:', latestPulse.emoji);
      console.log('     - Message:', latestPulse.message);
      console.log('     - Lu:', latestPulse.is_read);
      console.log('     - Expire:', latestPulse.expires_at);
      console.log('     - Expéditeur:', latestPulse.sender?.name || 'Inconnu');
    } else {
      console.log('   ℹ️ Aucun pulse reçu trouvé');
    }
    
    console.log('\n🎯 Test de l\'affichage des pulses terminé!');
    console.log('\n💡 Instructions:');
    console.log('   1. Rechargez la page d\'accueil');
    console.log('   2. Le pulse devrait apparaître en haut de l\'écran');
    console.log('   3. Appuyez sur le pulse pour le marquer comme lu');
    
    return true;
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
    return false;
  }
}

// Fonction pour créer un pulse de test
async function createTestPulseForDisplay() {
  try {
    console.log('💌 Création d\'un pulse de test pour l\'affichage...');
    
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
    
    // Le partenaire envoie le pulse à l'utilisateur actuel
    const receiverId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
    
    const { data, error } = await window.supabase
      .from('pulses')
      .insert({
        sender_id: receiverId,
        receiver_id: user.id,
        emoji: '🌸',
        message: 'Pulse de test pour vérifier l\'affichage',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_read: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur lors de la création:', error);
      return false;
    }
    
    console.log('✅ Pulse de test créé avec succès:', data);
    console.log('💡 Rechargez maintenant la page pour voir le pulse!');
    return data;
    
  } catch (error) {
    console.error('💥 Erreur lors de la création:', error);
    return false;
  }
}

// Fonction pour nettoyer les pulses de test
async function cleanupTestPulses() {
  try {
    console.log('🧹 Nettoyage des pulses de test...');
    
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ Aucun utilisateur connecté');
      return false;
    }
    
    const { data, error } = await window.supabase
      .from('pulses')
      .delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .like('message', '%test%');
    
    if (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      return false;
    }
    
    console.log('✅ Pulses de test supprimés');
    return data;
    
  } catch (error) {
    console.error('💥 Erreur lors du nettoyage:', error);
    return false;
  }
}

// Exposer les fonctions globalement pour les tests
window.testPulseDisplay = testPulseDisplay;
window.createTestPulseForDisplay = createTestPulseForDisplay;
window.cleanupTestPulses = cleanupTestPulses;

console.log('\n✅ Script de test de l\'affichage des pulses chargé!');
console.log('Fonctions disponibles:');
console.log('  • testPulseDisplay() - Test complet de l\'affichage');
console.log('  • createTestPulseForDisplay() - Créer un pulse de test');
console.log('  • cleanupTestPulses() - Nettoyer les pulses de test');
console.log('\n💡 Commencez par: testPulseDisplay()');
console.log('💡 Pour créer un pulse: createTestPulseForDisplay()');
