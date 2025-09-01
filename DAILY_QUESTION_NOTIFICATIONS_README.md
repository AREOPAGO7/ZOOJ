# 🔔 Système de Notifications des Questions Quotidiennes

Ce système vérifie automatiquement s'il y a de nouvelles questions quotidiennes créées aujourd'hui et envoie des notifications aux deux membres du couple.

## 🚀 Fonctionnalités

### ✅ **Vérification Automatique**
- **Détection** : Vérifie les nouvelles questions quotidiennes créées aujourd'hui
- **Notifications** : Envoie des notifications aux deux membres du couple
- **Anti-doublon** : Évite l'envoi de notifications multiples pour la même question

### ✅ **Intégration Complète**
- **Service dédié** : `dailyQuestionNotificationService.ts`
- **Logs détaillés** : Traçabilité complète dans la console
- **Gestion d'erreurs** : Gestion robuste des erreurs et exceptions

## 🗄️ Structure de la Base de Données

### **Tables Utilisées**
- **`daily_questions`** : Questions quotidiennes assignées aux couples
- **`questions`** : Questions disponibles dans la bibliothèque
- **`couples`** : Relations entre utilisateurs
- **`profiles`** : Informations des utilisateurs
- **`notifications`** : Notifications envoyées

### **Relations Clés**
```sql
daily_questions.couple_id → couples.id
daily_questions.question_id → questions.id
couples.user1_id, couples.user2_id → auth.users.id
```

## 🔧 Implémentation Technique

### **1. Service Principal** : `dailyQuestionNotificationService.ts`
```typescript
// Vérification automatique des nouvelles questions quotidiennes
async checkNewDailyQuestionsAndNotify(): Promise<{
  questionsFound: number;
  notificationsSent: number;
  errors: string[];
}>

// Envoi de notifications personnalisées
async sendDailyQuestionNotification(
  userId: string,
  dailyQuestion: DailyQuestionNotification,
  partnerId: string
): Promise<boolean>
```

### **2. Interface TypeScript**
```typescript
export interface DailyQuestionNotification {
  id: string
  couple_id: string
  question_id: string
  scheduled_for: string
  created_at: string
  question?: {
    id: string
    content: string
    created_at: string
    scheduled_time: string
  }
}
```

## 📱 Utilisation

### **Option 1 : Exécution Manuelle**
```typescript
import { dailyQuestionNotificationService } from './lib/dailyQuestionNotificationService'

// Vérification manuelle
const result = await dailyQuestionNotificationService.manualCheck()
console.log('Notifications envoyées:', result.notificationsSent)
```

### **Option 2 : Script de Ligne de Commande**
```bash
# Exécuter le script automatique
node scripts/run-daily-question-notifications.js
```

### **Option 3 : Intégration dans l'Application**
```typescript
// Dans un composant React ou un hook
useEffect(() => {
  const checkDailyQuestions = async () => {
    const result = await dailyQuestionNotificationService.checkNewDailyQuestionsAndNotify()
    // Traiter le résultat
  }
  
  checkDailyQuestions()
}, [])
```

## 🧪 Tests et Validation

### **Script de Test Simple**
```javascript
// Dans la console du navigateur
// 1. Charger test-daily-question-service.js
// 2. Exécuter checkDatabaseStructure()
// 3. Créer une question de test avec createTestQuestion()
// 4. Tester le service avec testDailyQuestionNotifications()
```

### **Script de Test Complet**
```javascript
// Exécuter test-daily-question-notifications.js
// Suivre les instructions pour tester chaque composant
```

## 🔄 Flux de Fonctionnement

### **1. Vérification des Questions**
```
Récupération de la date d'aujourd'hui
    ↓
Requête SQL : daily_questions WHERE created_at = today
    ↓
Jointure avec questions et couples
    ↓
Filtrage des nouvelles questions
```

### **2. Envoi des Notifications**
```
Pour chaque question trouvée :
    ↓
Vérification si déjà notifié
    ↓
Envoi de notification à user1
    ↓
Envoi de notification à user2
    ↓
Marquage comme notifié
```

### **3. Contenu des Notifications**
```
Titre : "Nouvelle question quotidienne"
Message : "[Nom du partenaire] a une nouvelle question pour vous aujourd'hui : [Contenu de la question]"
Type : daily_question
Priorité : normal
```

## 🐛 Dépannage

### **Problème** : Aucune notification envoyée
**Solutions** :
1. Vérifier que la table `daily_questions` contient des données pour aujourd'hui
2. Vérifier que les couples ont des `user1_id` et `user2_id` valides
3. Vérifier les logs dans la console pour identifier les erreurs

### **Problème** : Erreurs de base de données
**Solutions** :
1. Vérifier les permissions RLS sur les tables
2. Vérifier que toutes les tables existent
3. Vérifier la structure des données

### **Problème** : Notifications en double
**Solutions** :
1. Vérifier la logique anti-doublon dans `checkIfAlreadyNotified`
2. Nettoyer les anciennes notifications
3. Vérifier les timestamps

## 🎯 Cas d'Usage

### **Scénario 1** : Nouvelle Question Quotidienne
```
Question créée : "Comment s'est passée votre journée ?"
    ↓
Système détecte la nouvelle question
    ↓
Notifications envoyées à Marie et Pierre
    ↓
"Pierre a une nouvelle question pour vous aujourd'hui : Comment s'est passée votre journée ?"
```

### **Scénario 2** : Aucune Nouvelle Question
```
Aucune question créée aujourd'hui
    ↓
Système ne trouve aucune nouvelle question
    ↓
Aucune notification envoyée
    ↓
Log : "No new daily questions found for today"
```

### **Scénario 3** : Question Déjà Notifiée
```
Question créée et notifiée ce matin
    ↓
Système vérifie à nouveau
    ↓
Détection que les notifications ont déjà été envoyées
    ↓
Log : "Notifications already sent for daily question"
```

## 🔮 Évolutions Futures

### **Fonctionnalités Possibles**
- **Notifications programmées** : Envoi à des heures spécifiques
- **Personnalisation** : Préférences de notification par couple
- **Intégration push** : Notifications push natives
- **Rappels** : Rappels pour les questions non répondues

### **Optimisations**
- **Cache intelligent** : Mise en cache des questions et couples
- **Batch processing** : Traitement en lot des notifications
- **Analytics** : Statistiques d'utilisation et de performance

## 📞 Support

Pour toute question ou problème :
1. **Vérifier les logs** dans la console du navigateur
2. **Consulter la base de données** pour les erreurs SQL
3. **Tester avec des données simples** pour isoler le problème
4. **Vérifier les permissions** et politiques RLS

---

**🎉 Le système de notifications des questions quotidiennes est maintenant opérationnel et prêt à envoyer des notifications automatiques !**
