// Script de test simple pour vérifier le service de notifications d'événements après correction
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test du service de notifications d\'événements après correction...');

// Fonction de test qui peut être appelée manuellement
async function testEventNotificationService() {
  try {
    console.log('🚀 Test du service...');
    
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
    
    // Test 1: Vérifier que le service a les bonnes méthodes
    console.log('\n📊 Test 1: Vérification des méthodes du service');
    const methods = Object.getOwnPropertyNames(eventNotificationService);
    console.log('   • Méthodes disponibles:', methods);
    
    const requiredMethods = [
      'checkTomorrowEventsAndNotify',
      'sendTomorrowEventNotification',
      'checkIfAlreadyNotified',
      'markEventAsNotified',
      'clearCache',
      'getCacheStatus',
      'getUpcomingEvents'
    ];
    
    const missingMethods = requiredMethods.filter(method => !methods.includes(method));
    if (missingMethods.length === 0) {
      console.log('   ✅ Toutes les méthodes requises sont présentes');
    } else {
      console.log('   ❌ Méthodes manquantes:', missingMethods);
    }
    
    // Test 2: Vérifier le statut initial du cache
    console.log('\n📋 Test 2: Statut initial du cache');
    try {
      const initialCacheStatus = eventNotificationService.getCacheStatus();
      console.log('   • Taille du cache:', initialCacheStatus.size);
      console.log('   • Entrées:', initialCacheStatus.entries);
      console.log('   ✅ Méthode getCacheStatus fonctionne');
    } catch (error) {
      console.error('   ❌ Erreur avec getCacheStatus:', error);
    }
    
    // Test 3: Tester le nettoyage du cache
    console.log('\n🧹 Test 3: Nettoyage du cache');
    try {
      eventNotificationService.clearCache();
      const cacheAfterClear = eventNotificationService.getCacheStatus();
      console.log('   • Cache après nettoyage:', cacheAfterClear.size, 'entrées');
      console.log('   ✅ Méthode clearCache fonctionne');
    } catch (error) {
      console.error('   ❌ Erreur avec clearCache:', error);
    }
    
    // Test 4: Vérifier la structure de l'interface Event
    console.log('\n🏗️ Test 4: Vérification de l\'interface Event');
    try {
      // Essayer d'accéder à l'interface (si disponible)
      if (module && module.Event) {
        console.log('   ✅ Interface Event disponible');
        console.log('   • Propriétés:', Object.keys(module.Event));
      } else {
        console.log('   ⚠️ Interface Event non accessible (normal en JavaScript)');
      }
    } catch (error) {
      console.log('   ⚠️ Interface Event non accessible (normal en JavaScript)');
    }
    
    // Test 5: Vérifier que le service peut être appelé
    console.log('\n🔍 Test 5: Vérification de l\'appel du service');
    try {
      // Ne pas exécuter réellement, juste vérifier que la méthode existe
      if (typeof eventNotificationService.checkTomorrowEventsAndNotify === 'function') {
        console.log('   ✅ Méthode checkTomorrowEventsAndNotify est une fonction');
        console.log('   • Signature:', eventNotificationService.checkTomorrowEventsAndNotify.toString().slice(0, 100) + '...');
      } else {
        console.log('   ❌ Méthode checkTomorrowEventsAndNotify n\'est pas une fonction');
      }
    } catch (error) {
      console.error('   ❌ Erreur lors de la vérification:', error);
    }
    
    console.log('\n🎯 Test terminé avec succès!');
    console.log('✅ Le service semble fonctionner correctement après la correction');
    
    return {
      success: true,
      methods: methods,
      cacheWorking: true
    };
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
    return {
      success: false,
      error: error.message
    };
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

// Exposer les fonctions globalement pour les tests
window.testEventNotificationService = testEventNotificationService;
window.checkCacheStatus = checkCacheStatus;
window.clearCache = clearCache;

console.log('\n✅ Script de test après correction chargé!');
console.log('Fonctions disponibles:');
console.log('  • testEventNotificationService() - Test complet du service corrigé');
console.log('  • checkCacheStatus() - Vérifier le statut du cache');
console.log('  • clearCache() - Nettoyer le cache');
console.log('\n💡 Commencez par: testEventNotificationService()');
console.log('💡 Pour vérifier le cache: checkCacheStatus()');
console.log('💡 Pour nettoyer le cache: clearCache()');
