#!/usr/bin/env node

/**
 * Script d'exécution automatique pour les notifications des questions quotidiennes
 * 
 * Ce script peut être exécuté :
 * - Manuellement depuis la ligne de commande
 * - Automatiquement via un cron job
 * - Depuis une tâche planifiée
 * - Depuis l'interface utilisateur
 * 
 * Usage:
 * node scripts/run-daily-question-notifications.js
 * 
 * Ou depuis le code:
 * import { dailyQuestionNotificationService } from './lib/dailyQuestionNotificationService'
 * const result = await dailyQuestionNotificationService.manualCheck()
 */

import { dailyQuestionNotificationService } from '../lib/dailyQuestionNotificationService.js'

async function main() {
  console.log('🚀 Démarrage du script de notifications des questions quotidiennes...')
  console.log('⏰', new Date().toLocaleString('fr-FR'))
  
  try {
    // Exécuter la vérification des nouvelles questions quotidiennes
    const result = await dailyQuestionNotificationService.checkNewDailyQuestionsAndNotify()
    
    // Afficher le résumé des résultats
    console.log('\n📊 Résumé de l\'exécution:')
    console.log(`   • Questions trouvées: ${result.questionsFound}`)
    console.log(`   • Notifications envoyées: ${result.notificationsSent}`)
    console.log(`   • Erreurs: ${result.errors.length}`)
    
    if (result.errors.length > 0) {
      console.log('\n❌ Erreurs rencontrées:')
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }
    
    if (result.notificationsSent > 0) {
      console.log('\n✅ Succès!')
      console.log(`   ${result.notificationsSent} notifications ont été envoyées avec succès.`)
    } else if (result.questionsFound > 0) {
      console.log('\n📋 Informations:')
      console.log(`   ${result.questionsFound} questions trouvées mais aucune nouvelle notification nécessaire.`)
    } else {
      console.log('\n📭 Aucune action:')
      console.log('   Aucune nouvelle question quotidienne trouvée pour aujourd\'hui.')
    }
    
    console.log('\n🎯 Script terminé avec succès!')
    
    // Code de sortie pour les scripts automatisés
    process.exit(result.errors.length > 0 ? 1 : 0)
    
  } catch (error) {
    console.error('\n💥 Erreur fatale lors de l\'exécution du script:')
    console.error(error)
    
    // Code de sortie d'erreur
    process.exit(1)
  }
}

// Exécuter le script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

// Export pour utilisation dans d'autres modules
export { main as runDailyQuestionNotifications }
