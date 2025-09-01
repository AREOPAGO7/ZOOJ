// Script de test pour vérifier le système de cache des notifications d'événements
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test du système de cache des notifications d\'événements...');

// Fonction de test qui peut être appelée manuellement
async function testEventNotificationCache() {
  try {
    console.log('🚀 Test du système de cache...');
    
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
    
    // Test 1: Vérifier le statut initial du cache
    console.log('\n📊 Test 1: Statut initial du cache');
    const initialCacheStatus = eventNotificationService.getCacheStatus();
    console.log('   • Taille du cache:', initialCacheStatus.size);
    console.log('   • Entrées:', initialCacheStatus.entries);
    
    // Test 2: Première vérification des événements
    console.log('\n🔍 Test 2: Première vérification des événements');
    console.log('Exécution de checkTomorrowEventsAndNotify()...');
    const firstResult = await eventNotificationService.checkTomorrowEventsAndNotify();
    
    console.log('   • Première exécution:');
    console.log('     - Événements trouvés:', firstResult.eventsFound);
    console.log('     - Notifications envoyées:', firstResult.notificationsSent);
    console.log('     - Erreurs:', firstResult.errors.length);
    
    // Test 3: Vérifier le cache après la première exécution
    console.log('\n📋 Test 3: Cache après première exécution');
    const cacheAfterFirst = eventNotificationService.getCacheStatus();
    console.log('   • Taille du cache:', cacheAfterFirst.size);
    console.log('   • Entrées:', cacheAfterFirst.entries);
    
    // Test 4: Deuxième vérification (devrait utiliser le cache)
    console.log('\n🔄 Test 4: Deuxième vérification (devrait utiliser le cache)');
    console.log('Exécution de checkTomorrowEventsAndNotify() une deuxième fois...');
    const secondResult = await eventNotificationService.checkTomorrowEventsAndNotify();
    
    console.log('   • Deuxième exécution:');
    console.log('     - Événements trouvés:', secondResult.eventsFound);
    console.log('     - Notifications envoyées:', secondResult.notificationsSent);
    console.log('     - Erreurs:', secondResult.errors.length);
    
    // Test 5: Vérifier que le cache a été utilisé
    console.log('\n✅ Test 5: Vérification de l\'utilisation du cache');
    if (secondResult.notificationsSent === 0 && firstResult.notificationsSent > 0) {
      console.log('   ✅ SUCCÈS: Le cache a fonctionné!');
      console.log('   • Première exécution:', firstResult.notificationsSent, 'notifications envoyées');
      console.log('   • Deuxième exécution:', secondResult.notificationsSent, 'notifications envoyées');
      console.log('   • Les notifications n\'ont pas été recréées grâce au cache');
    } else if (firstResult.notificationsSent === 0) {
      console.log('   📭 Aucune notification envoyée lors de la première exécution');
      console.log('   • Cela peut être normal s\'il n\'y a pas d\'événements demain');
    } else {
      console.log('   ⚠️ Le cache pourrait ne pas fonctionner correctement');
      console.log('   • Vérifiez les logs pour plus de détails');
    }
    
    // Test 6: Statut final du cache
    console.log('\n📊 Test 6: Statut final du cache');
    const finalCacheStatus = eventNotificationService.getCacheStatus();
    console.log('   • Taille du cache:', finalCacheStatus.size);
    console.log('   • Entrées:', finalCacheStatus.entries);
    
    // Test 7: Nettoyer le cache
    console.log('\n🧹 Test 7: Nettoyage du cache');
    eventNotificationService.clearCache();
    const cacheAfterClear = eventNotificationService.getCacheStatus();
    console.log('   • Cache après nettoyage:', cacheAfterClear.size, 'entrées');
    
    return {
      firstResult,
      secondResult,
      cacheStatus: finalCacheStatus,
      cacheWorking: secondResult.notificationsSent === 0 && firstResult.notificationsSent > 0
    };
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
    return null;
  }
}

// Fonction pour vérifier le statut du cache
async function checkCacheStatus() {
  try {
    console.log('📋 Vérification du statut du cache...');
    
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
    
    const cacheStatus = eventNotificationService.getCacheStatus();
    console.log('   • Taille du cache:', cacheStatus.size);
    console.log('   • Entrées:', cacheStatus.entries);
    
    return cacheStatus;
    
  } catch (error) {
    console.error('💥 Erreur lors de la vérification du cache:', error);
    return null;
  }
}

// Fonction pour nettoyer le cache
async function clearCache() {
  try {
    console.log('🧹 Nettoyage du cache...');
    
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
    
    eventNotificationService.clearCache();
    console.log('✅ Cache nettoyé avec succès');
    
  } catch (error) {
    console.error('💥 Erreur lors du nettoyage du cache:', error);
  }
}

// Fonction pour tester la prévention des doublons
async function testDuplicatePrevention() {
  try {
    console.log('🛡️ Test de la prévention des doublons...');
    
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
    
    // Exécuter plusieurs fois de suite
    console.log('   • Exécution 1...');
    const result1 = await eventNotificationService.checkTomorrowEventsAndNotify();
    
    console.log('   • Exécution 2...');
    const result2 = await eventNotificationService.checkTomorrowEventsAndNotify();
    
    console.log('   • Exécution 3...');
    const result3 = await eventNotificationService.checkTomorrowEventsAndNotify();
    
    console.log('\n📊 Résultats:');
    console.log('   • Exécution 1:', result1.notificationsSent, 'notifications');
    console.log('   • Exécution 2:', result2.notificationsSent, 'notifications');
    console.log('   • Exécution 3:', result3.notificationsSent, 'notifications');
    
    const totalNotifications = result1.notificationsSent + result2.notificationsSent + result3.notificationsSent;
    const uniqueNotifications = result1.notificationsSent;
    
    if (totalNotifications === uniqueNotifications) {
      console.log('✅ SUCCÈS: Aucune notification en double!');
    } else {
      console.log('⚠️ ATTENTION: Des notifications en double ont été détectées');
    }
    
    return { result1, result2, result3, totalNotifications, uniqueNotifications };
    
  } catch (error) {
    console.error('💥 Erreur lors du test de prévention des doublons:', error);
    return null;
  }
}

// Exposer les fonctions globalement pour les tests
window.testEventNotificationCache = testEventNotificationCache;
window.checkCacheStatus = checkCacheStatus;
window.clearCache = clearCache;
window.testDuplicatePrevention = testDuplicatePrevention;

console.log('\n✅ Script de test du cache chargé!');
console.log('Fonctions disponibles:');
console.log('  • testEventNotificationCache() - Test complet du système de cache');
console.log('  • checkCacheStatus() - Vérifier le statut du cache');
console.log('  • clearCache() - Nettoyer le cache');
console.log('  • testDuplicatePrevention() - Tester la prévention des doublons');
console.log('\n💡 Commencez par: testEventNotificationCache()');
console.log('💡 Pour vérifier le cache: checkCacheStatus()');
console.log('💡 Pour nettoyer le cache: clearCache()');
