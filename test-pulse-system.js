// Script de test pour le système de pulse
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test du système de pulse...');

async function testPulseSystem() {
  try {
    console.log('🚀 Test du système de pulse...');
    
    // Vérifier que Supabase est disponible
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase n\'est pas disponible dans le contexte global');
      return false;
    }
    
    // Test 1: Vérifier l'existence de la table pulses
    console.log('\n📊 Test 1: Vérification de la table pulses');
    try {
      const { data: tableCheck, error: tableError } = await window.supabase
        .from('pulses')
        .select('id, sender_id, receiver_id, emoji, message, created_at, expires_at, is_read')
        .limit(1);
      
      if (tableError) {
        console.error('   ❌ Erreur lors de la vérification de la table pulses:', tableError);
        return false;
      } else {
        console.log('   ✅ Table pulses accessible');
        console.log('   📋 Colonnes disponibles:', Object.keys(tableCheck?.[0] || {}));
      }
    } catch (error) {
      console.error('   ❌ Erreur lors de la vérification de la table pulses:', error);
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
    
    // Test 4: Envoyer un pulse de test
    console.log('\n➕ Test 4: Envoi d\'un pulse de test');
    const testEmoji = '🌸';
    const { data: sentPulse, error: sendError } = await window.supabase
      .from('pulses')
      .insert({
        sender_id: user.id,
        receiver_id: couple.user1_id === user.id ? couple.user2_id : couple.user1_id,
        emoji: testEmoji,
        message: 'Test pulse',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (sendError) {
      console.error('   ❌ Erreur lors de l\'envoi du pulse:', sendError);
    } else {
      console.log('   ✅ Pulse envoyé avec succès:', sentPulse);
    }
    
    // Test 5: Récupérer les pulses de l'utilisateur
    console.log('\n📋 Test 5: Récupération des pulses');
    const { data: userPulses, error: pulsesError } = await window.supabase
      .from('pulses')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (pulsesError) {
      console.error('   ❌ Erreur lors de la récupération des pulses:', pulsesError);
    } else {
      console.log(`   ✅ ${userPulses?.length || 0} pulses trouvés:`);
      if (userPulses && userPulses.length > 0) {
        userPulses.forEach((pulse, index) => {
          console.log(`     ${index + 1}. ${pulse.emoji} - ${pulse.message || 'Pas de message'} (${pulse.is_read ? 'Lu' : 'Non lu'})`);
        });
      }
    }
    
    // Test 6: Marquer un pulse comme lu
    if (userPulses && userPulses.length > 0) {
      console.log('\n👁️ Test 6: Marquage d\'un pulse comme lu');
      const pulseToMark = userPulses.find(p => p.receiver_id === user.id && !p.is_read);
      
      if (pulseToMark) {
        const { data: markedPulse, error: markError } = await window.supabase
          .from('pulses')
          .update({ is_read: true })
          .eq('id', pulseToMark.id)
          .eq('receiver_id', user.id)
          .select()
          .single();
        
        if (markError) {
          console.error('   ❌ Erreur lors du marquage:', markError);
        } else {
          console.log('   ✅ Pulse marqué comme lu:', markedPulse);
        }
      } else {
        console.log('   ℹ️ Aucun pulse non lu trouvé à marquer');
      }
    }
    
    console.log('\n🎯 Test du système de pulse terminé avec succès!');
    return true;
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
    return false;
  }
}

// Fonction pour envoyer un pulse de test
async function sendTestPulse(emoji = '🌸') {
  try {
    console.log(`💌 Envoi d'un pulse de test: ${emoji}`);
    
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
    
    // Déterminer le destinataire
    const receiverId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
    
    // Envoyer le pulse
    const { data, error } = await window.supabase
      .from('pulses')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        emoji,
        message: `Pulse de test: ${emoji}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur lors de l\'envoi:', error);
      return false;
    }
    
    console.log('✅ Pulse envoyé avec succès:', data);
    return data;
    
  } catch (error) {
    console.error('💥 Erreur lors de l\'envoi:', error);
    return false;
  }
}

// Fonction pour afficher tous les pulses
async function showAllPulses() {
  try {
    console.log('📋 Affichage de tous les pulses...');
    
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ Aucun utilisateur connecté');
      return false;
    }
    
    const { data: pulses, error } = await window.supabase
      .from('pulses')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur lors de la récupération:', error);
      return false;
    }
    
    console.log(`📊 ${pulses?.length || 0} pulses trouvés:`);
    if (pulses && pulses.length > 0) {
      pulses.forEach((pulse, index) => {
        const type = pulse.sender_id === user.id ? 'Envoyé' : 'Reçu';
        const status = pulse.is_read ? 'Lu' : 'Non lu';
        console.log(`  ${index + 1}. ${pulse.emoji} - ${type} - ${status} - ${pulse.message || 'Pas de message'}`);
      });
    }
    
    return pulses;
    
  } catch (error) {
    console.error('💥 Erreur lors de l\'affichage:', error);
    return false;
  }
}

// Exposer les fonctions globalement pour les tests
window.testPulseSystem = testPulseSystem;
window.sendTestPulse = sendTestPulse;
window.showAllPulses = showAllPulses;

console.log('\n✅ Script de test du système de pulse chargé!');
console.log('Fonctions disponibles:');
console.log('  • testPulseSystem() - Test complet du système de pulse');
console.log('  • sendTestPulse(emoji) - Envoyer un pulse de test');
console.log('  • showAllPulses() - Afficher tous les pulses');
console.log('\n💡 Commencez par: testPulseSystem()');
console.log('💡 Pour envoyer un pulse: sendTestPulse("🌸")');
console.log('💡 Pour afficher les pulses: showAllPulses()');
