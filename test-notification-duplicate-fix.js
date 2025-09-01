// Script de test pour vérifier la nouvelle logique de prévention des doublons
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test de la nouvelle logique de prévention des doublons...');

// Fonction de test qui peut être appelée manuellement
async function testNotificationDuplicateFix() {
  try {
    console.log('🚀 Test de la nouvelle logique...');
    
    // Import dynamique du service (si disponible)
    let eventNotificationService;
    
    try {
      // Essayer d'importer depuis le module
      const module = await import('./lib/eventNotificationService.js');
      eventNotificationService = module.eventNotificationService;
      console.log('✅ Service importé avec succès');
    } catch (importError) {
      console.log('⚠️ Import du module échoué, utilisation de la version globale');
      // Si le module n'est pas disponible, on utilise la version globale
      eventNotificationService = window.eventNotificationService;
    }
    
    if (!eventNotificationService) {
      console.error('❌ Service non disponible. Vérifiez que le fichier est chargé.');
      return;
    }
    
    // Test 1: Nettoyer le cache pour commencer proprement
    console.log('\n🧹 Test 1: Nettoyage du cache');
    eventNotificationService.clearCache();
    console.log('   ✅ Cache nettoyé');
    
    // Test 2: Vérifier le statut initial du cache
    console.log('\n📋 Test 2: Statut initial du cache');
    const initialCacheStatus = eventNotificationService.getCacheStatus();
    console.log('   • Taille du cache:', initialCacheStatus.size);
    console.log('   • Entrées:', initialCacheStatus.entries);
    
    // Test 3: Première exécution (devrait envoyer des notifications si des événements existent)
    console.log('\n🔍 Test 3: Première exécution');
    console.log('Exécution de checkTomorrowEventsAndNotify()...');
    const firstResult = await eventNotificationService.checkTomorrowEventsAndNotify();
    
    console.log('   • Première exécution:');
    console.log('     - Événements trouvés:', firstResult.eventsFound);
    console.log('     - Notifications envoyées:', firstResult.notificationsSent);
    console.log('     - Erreurs:', firstResult.errors.length);
    
    // Test 4: Vérifier le cache après la première exécution
    console.log('\n📋 Test 4: Cache après première exécution');
    const cacheAfterFirst = eventNotificationService.getCacheStatus();
    console.log('   • Taille du cache:', cacheAfterFirst.size);
    console.log('   • Entrées:', cacheAfterFirst.entries);
    
    // Test 5: Deuxième exécution (devrait utiliser le cache et ne pas envoyer de notifications)
    console.log('\n🔄 Test 5: Deuxième exécution');
    console.log('Exécution de checkTomorrowEventsAndNotify() une deuxième fois...');
    const secondResult = await eventNotificationService.checkTomorrowEventsAndNotify();
    
    console.log('   • Deuxième exécution:');
    console.log('     - Événements trouvés:', secondResult.eventsFound);
    console.log('     - Notifications envoyées:', secondResult.notificationsSent);
    console.log('     - Erreurs:', secondResult.errors.length);
    
    // Test 6: Troisième exécution (pour être sûr)
    console.log('\n🔄 Test 6: Troisième exécution');
    console.log('Exécution de checkTomorrowEventsAndNotify() une troisième fois...');
    const thirdResult = await eventNotificationService.checkTomorrowEventsAndNotify();
    
    console.log('   • Troisième exécution:');
    console.log('     - Événements trouvés:', thirdResult.eventsFound);
    console.log('     - Notifications envoyées:', thirdResult.notificationsSent);
    console.log('     - Erreurs:', thirdResult.errors.length);
    
    // Test 7: Vérifier que le cache a été utilisé
    console.log('\n✅ Test 7: Vérification de l\'utilisation du cache');
    const totalNotifications = firstResult.notificationsSent + secondResult.notificationsSent + thirdResult.notificationsSent;
    const uniqueNotifications = firstResult.notificationsSent;
    
    if (totalNotifications === uniqueNotifications && firstResult.notificationsSent > 0) {
      console.log('   ✅ SUCCÈS: Le cache a fonctionné!');
      console.log('   • Première exécution:', firstResult.notificationsSent, 'notifications envoyées');
      console.log('   • Deuxième exécution:', secondResult.notificationsSent, 'notifications envoyées');
      console.log('   • Troisième exécution:', thirdResult.notificationsSent, 'notifications envoyées');
      console.log('   • Total:', totalNotifications, 'notifications (aucune en double)');
      console.log('   • Les notifications n\'ont pas été recréées grâce au cache');
    } else if (firstResult.notificationsSent === 0) {
      console.log('   📭 Aucune notification envoyée lors de la première exécution');
      console.log('   • Cela peut être normal s\'il n\'y a pas d\'événements demain');
    } else {
      console.log('   ⚠️ Le cache pourrait ne pas fonctionner correctement');
      console.log('   • Vérifiez les logs pour plus de détails');
    }
    
    // Test 8: Statut final du cache
    console.log('\n📊 Test 8: Statut final du cache');
    const finalCacheStatus = eventNotificationService.getCacheStatus();
    console.log('   • Taille du cache:', finalCacheStatus.size);
    console.log('   • Entrées:', finalCacheStatus.entries);
    
    return {
      firstResult,
      secondResult,
      thirdResult,
      totalNotifications,
      uniqueNotifications,
      cacheStatus: finalCacheStatus,
      cacheWorking: totalNotifications === uniqueNotifications && firstResult.notificationsSent > 0
    };
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
    return null;
  }
}

// Fonction pour tester la vérification manuelle d'un événement spécifique
async function testSpecificEventCheck(eventId) {
  try {
    console.log(`🔍 Test de vérification pour l'événement spécifique: ${eventId}`);
    
    let eventNotificationService;
    try {
      const module = await import('./lib/eventNotificationService.js');
      eventNotificationService = module.eventNotificationService;
    } catch (importError) {
      eventNotificationService = window.eventNotificationService;
    }
    
    if (!eventNotificationService) {
      console.error('❌ Service non disponible');
      return;
    }
    
    // Test de la fonction checkIfAlreadyNotified pour un événement spécifique
    const result = await eventNotificationService.checkIfAlreadyNotified(eventId, 'tomorrow_reminder');
    
    console.log(`   • Événement ${eventId}: ${result ? 'Déjà notifié' : 'Pas encore notifié'}`);
    
    return result;
    
  } catch (error) {
    console.error('💥 Erreur lors du test spécifique:', error);
    return null;
  }
}

// Fonction pour vérifier les notifications existantes dans la base de données
async function checkExistingNotifications() {
  try {
    console.log('📋 Vérification des notifications existantes dans la base de données...');
    
    // Vérifier que Supabase est disponible
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase n\'est pas disponible dans le contexte global');
      return false;
    }
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`   • Date d'aujourd'hui: ${today}`);
    
    // Récupérer toutes les notifications d'événements d'aujourd'hui
    const { data: notifications, error } = await window.supabase
      .from('notifications')
      .select('id, title, message, data, created_at')
      .eq('type', 'event')
      .gte('created_at', today)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur lors de la récupération des notifications:', error);
      return false;
    }
    
    console.log(`   • Nombre de notifications d'événements aujourd'hui: ${notifications?.length || 0}`);
    
    if (notifications && notifications.length > 0) {
      console.log('   • Détails des notifications:');
      notifications.forEach((notification, index) => {
        console.log(`     ${index + 1}. ID: ${notification.id}`);
        console.log(`        Titre: ${notification.title}`);
        console.log(`        Données:`, notification.data);
        console.log(`        Créé: ${notification.created_at}`);
        console.log('');
      });
    }
    
    return notifications;
    
  } catch (error) {
    console.error('💥 Erreur lors de la vérification des notifications:', error);
    return null;
  }
}

// Exposer les fonctions globalement pour les tests
window.testNotificationDuplicateFix = testNotificationDuplicateFix;
window.testSpecificEventCheck = testSpecificEventCheck;
window.checkExistingNotifications = checkExistingNotifications;

console.log('\n✅ Script de test de prévention des doublons chargé!');
console.log('Fonctions disponibles:');
console.log('  • testNotificationDuplicateFix() - Test complet de la nouvelle logique');
console.log('  • testSpecificEventCheck(eventId) - Test pour un événement spécifique');
console.log('  • checkExistingNotifications() - Vérifier les notifications existantes');
console.log('\n💡 Commencez par: testNotificationDuplicateFix()');
console.log('💡 Pour vérifier les notifications existantes: checkExistingNotifications()');
console.log('💡 Pour tester un événement spécifique: testSpecificEventCheck("EVENT_ID")');
