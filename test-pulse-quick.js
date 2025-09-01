// Script de test rapide pour les pulses
// Exécutez ce script dans la console du navigateur

console.log('🚀 Test rapide des pulses...');

async function quickPulseTest() {
  try {
    // 1. Vérifier l'utilisateur
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
      console.error('❌ Pas d\'utilisateur connecté');
      return;
    }
    console.log('✅ Utilisateur:', user.id);

    // 2. Trouver le couple
    const { data: couple } = await window.supabase
      .from('couples')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!couple) {
      console.error('❌ Pas de couple trouvé');
      return;
    }

    // 3. Déterminer le partenaire
    const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
    console.log('✅ Partenaire:', partnerId);

    // 4. Créer un pulse du partenaire vers l'utilisateur
    const { data: pulse, error } = await window.supabase
      .from('pulses')
      .insert({
        sender_id: partnerId,
        receiver_id: user.id,
        emoji: '💘',
        message: 'Test pulse rapide',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création pulse:', error);
      return;
    }

    console.log('✅ Pulse créé:', pulse);
    console.log('💡 Rechargez la page pour voir le pulse!');

    // 5. Vérifier immédiatement
    const { data: checkPulse } = await window.supabase
      .from('pulses')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (checkPulse) {
      console.log('✅ Pulse trouvé en base:', checkPulse);
    } else {
      console.log('❌ Pulse non trouvé en base');
    }

  } catch (error) {
    console.error('💥 Erreur:', error);
  }
}

// Fonction pour voir tous les pulses
async function showAllPulses() {
  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) return;

  const { data: pulses } = await window.supabase
    .from('pulses')
    .select('*')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  console.log('📋 Tous les pulses:', pulses);
}

// Exposer les fonctions
window.quickPulseTest = quickPulseTest;
window.showAllPulses = showAllPulses;

console.log('✅ Script chargé!');
console.log('💡 Utilisez: quickPulseTest() pour créer un pulse');
console.log('💡 Utilisez: showAllPulses() pour voir tous les pulses');
