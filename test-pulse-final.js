// Script de test final pour les pulses
// Exécutez ce script dans la console du navigateur

console.log('🎯 Test final des pulses...');

async function testPulseFinal() {
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

    // 4. Nettoyer les anciens pulses de test
    console.log('🧹 Nettoyage des anciens pulses de test...');
    await window.supabase
      .from('pulses')
      .delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .like('message', '%test%');

    // 5. Créer un pulse de test
    console.log('💌 Création d\'un pulse de test...');
    const { data: pulse, error } = await window.supabase
      .from('pulses')
      .insert({
        sender_id: partnerId,
        receiver_id: user.id,
        emoji: '💘',
        message: 'Test pulse final',
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

    // 6. Vérifier que le pulse est visible
    console.log('👁️ Vérification de la visibilité...');
    const { data: visiblePulse } = await window.supabase
      .from('pulses')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (visiblePulse) {
      console.log('✅ Pulse visible trouvé:', visiblePulse);
      console.log('🎉 Le système de pulses fonctionne correctement!');
      console.log('💡 Rechargez la page pour voir le pulse apparaître');
    } else {
      console.log('❌ Pulse non trouvé');
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

// Fonction pour nettoyer tous les pulses
async function cleanupAllPulses() {
  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await window.supabase
    .from('pulses')
    .delete()
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

  if (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } else {
    console.log('✅ Tous les pulses supprimés');
  }
}

// Exposer les fonctions
window.testPulseFinal = testPulseFinal;
window.showAllPulses = showAllPulses;
window.cleanupAllPulses = cleanupAllPulses;

console.log('✅ Script final chargé!');
console.log('💡 Utilisez: testPulseFinal() pour tester le système complet');
console.log('💡 Utilisez: showAllPulses() pour voir tous les pulses');
console.log('💡 Utilisez: cleanupAllPulses() pour nettoyer tous les pulses');
