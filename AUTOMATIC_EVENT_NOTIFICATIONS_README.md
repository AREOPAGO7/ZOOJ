# 🔔 Système de Notifications Automatiques d'Événements

Ce système vérifie automatiquement les événements de demain et envoie des notifications aux deux membres du couple chaque fois qu'ils visitent la page calendrier.

## 🚀 Fonctionnalités

### ✅ **Vérification Automatique**
- **Déclenchement** : À chaque visite de la page calendrier
- **Fréquence** : Une fois par session (évite les doublons)
- **Horodatage** : Affiche quand la dernière vérification a eu lieu

### ✅ **Notifications Intelligentes**
- **Destinataires** : Les deux membres du couple
- **Contenu** : Rappel avec titre, date, heure et lieu de l'événement
- **Priorité** : Haute priorité pour les rappels d'événements
- **Anti-doublon** : Vérifie si les notifications ont déjà été envoyées

### ✅ **Interface Utilisateur**
- **Statut en temps réel** : Indicateur visuel de l'état de vérification
- **Informations contextuelles** : Nombre d'événements cette semaine
- **Prochain événement** : Aperçu du prochain événement à venir
- **Bouton de rafraîchissement** : Vérification manuelle possible

## 🗄️ Structure de la Base de Données

### Table `calendar_events` (existante)
```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  place TEXT,
  couple_id UUID REFERENCES couples(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
```

### Relations
- **`calendar_events.couple_id`** → **`couples.id`** (événement appartient à un couple)
- **`couples.user1_id`** et **`couples.user2_id`** → **`auth.users.id`** (membres du couple)

## 🔧 Implémentation Technique

### 1. **Service Principal** : `eventNotificationService.ts`
```typescript
// Vérification automatique des événements de demain
async checkTomorrowEventsAndNotify(): Promise<{
  eventsFound: number;
  notificationsSent: number;
  errors: string[];
}>

// Envoi de notifications personnalisées
async sendTomorrowEventNotification(
  userId: string,
  event: Event,
  partnerId: string
): Promise<boolean>
```

### 2. **Hook React** : `useEventNotifications.ts`
```typescript
const {
  isChecking,           // État de vérification
  lastCheckResult,      // Résultat de la dernière vérification
  upcomingEvents,       // Événements à venir
  hasUpcomingEvents,    // Y a-t-il des événements ?
  nextEvent,           // Prochain événement
  eventsThisWeek,      // Nombre d'événements cette semaine
  manualCheck,         // Vérification manuelle
  refreshUpcomingEvents // Rafraîchir les événements
} = useEventNotifications();
```

### 3. **Intégration** : Page Calendrier
```typescript
// Dans CalendrierPage
const {
  isChecking,
  lastCheckResult,
  upcomingEvents,
  hasUpcomingEvents,
  nextEvent,
  eventsThisWeek,
  manualCheck
} = useEventNotifications();

// Vérification automatique au chargement
useEffect(() => {
  if (user?.id) {
    checkTomorrowEvents(); // Automatique
    getUpcomingEvents();   // Charger les événements
  }
}, [user?.id]);
```

## 📱 Interface Utilisateur

### Section de Statut des Notifications
```
🔔 Rappels automatiques [🔄 Vérification...]

✅ 2 rappels envoyés pour 1 événement
Vérifié 14:30

📅 3 événements cette semaine
Prochain : Dîner romantique le 25/12/2024

[🔄 Vérifier maintenant]
```

### États Visuels
- **🔔 Gris** : Aucun événement à venir
- **🔔 Rose** : Événements à venir
- **🔔 Bleu** : Vérification en cours
- **✅** : Notifications envoyées avec succès
- **📋** : Événements trouvés mais pas de nouveaux rappels
- **📭** : Aucun événement demain

## 🔄 Flux de Fonctionnement

### 1. **Entrée sur la Page Calendrier**
```
Utilisateur visite /calendrier
    ↓
useEventNotifications se déclenche
    ↓
checkTomorrowEvents() s'exécute automatiquement
```

### 2. **Vérification des Événements**
```
Récupération de la date de demain
    ↓
Requête SQL : events WHERE date = tomorrow
    ↓
Filtrage par couple_id de l'utilisateur
```

### 3. **Envoi des Notifications**
```
Pour chaque événement trouvé :
    ↓
Vérification si déjà notifié aujourd'hui
    ↓
Envoi de notification à user1
    ↓
Envoi de notification à user2
    ↓
Marquage comme notifié
```

### 4. **Mise à Jour de l'Interface**
```
Affichage du statut de vérification
    ↓
Compteur d'événements à venir
    ↓
Informations sur le prochain événement
```

## 🛡️ Sécurité et Performance

### **Row Level Security (RLS)**
- Les utilisateurs ne voient que les événements de leur couple
- Seuls les créateurs peuvent modifier/supprimer leurs événements
- Vérification des permissions à chaque requête

### **Anti-Doublon**
- Vérification dans la table `notifications` avant envoi
- Filtrage par `reminderType` et `eventId`
- Une seule notification par événement par jour

### **Performance**
- Index sur `couple_id`, `date`, `created_by`
- Requêtes optimisées avec JOIN sur `couples`
- Limitation des vérifications à une fois par session

## 📋 Configuration Requise

### 1. **Vérifier la Configuration RLS**
```sql
-- Vérifier que RLS est activé sur calendar_events
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'calendar_events';

-- Vérifier les politiques existantes
SELECT policyname FROM pg_policies WHERE tablename = 'calendar_events';
```

### 2. **Vérifier les Tables Existantes**
- ✅ `calendar_events` - Table des événements (existante)
- ✅ `couples` - Table des couples (existante)
- ✅ `notifications` - Table des notifications (existante)
- ✅ `auth.users` - Table des utilisateurs (existante)

### 3. **Vérifier les Politiques RLS**
```sql
-- Vérifier que les politiques existent
SELECT policyname FROM pg_policies WHERE tablename = 'events';
```

## 🧪 Test du Système

### 1. **Créer un Événement de Test**
```sql
-- Remplacer avec vos IDs réels
INSERT INTO calendar_events (title, event_date, couple_id) VALUES
('Test Event', '2024-12-26', 'YOUR_COUPLE_ID');
```

### 2. **Visiter la Page Calendrier**
- Aller sur `/calendrier`
- Observer la section "Rappels automatiques"
- Vérifier les logs dans la console

### 3. **Vérifier les Notifications**
- Aller sur `/notifications`
- Chercher les notifications de type "event"
- Vérifier que les deux membres ont reçu la notification

## 🐛 Dépannage

### **Problème** : Aucune notification envoyée
**Solutions** :
1. Vérifier que la table `calendar_events` existe
2. Vérifier les politiques RLS
3. Vérifier les logs dans la console
4. S'assurer que l'événement est pour demain

### **Problème** : Erreurs RLS
**Solutions** :
1. Exécuter `fix-all-rls-policies.sql`
2. Vérifier les permissions des tables
3. S'assurer que l'utilisateur est dans un couple

### **Problème** : Notifications en double
**Solutions** :
1. Vérifier la logique anti-doublon
2. Nettoyer les anciennes notifications
3. Vérifier les timestamps

## 🎯 Cas d'Usage

### **Scénario 1** : Rappel de Dîner
```
Événement : "Dîner romantique" le 26/12 à 20h
    ↓
Marie visite le calendrier le 25/12
    ↓
Système détecte l'événement de demain
    ↓
Notifications envoyées à Marie et Pierre
    ↓
"Pierre a un événement demain à 20h: Dîner romantique"
```

### **Scénario 2** : Aucun Événement
```
Aucun événement le 26/12
    ↓
Pierre visite le calendrier le 25/12
    ↓
Système ne trouve aucun événement
    ↓
Affichage : "📭 Aucun événement demain"
```

### **Scénario 3** : Événements Multiples
```
3 événements cette semaine
    ↓
Affichage : "📅 3 événements cette semaine"
    ↓
Prochain : "Cinéma le 27/12"
    ↓
Notifications envoyées pour chaque événement de demain
```

## 🔮 Évolutions Futures

### **Fonctionnalités Possibles**
- **Notifications programmées** : Envoi à des heures spécifiques
- **Rappels multiples** : 1 jour avant, 1 heure avant
- **Personnalisation** : Heures silencieuses, préférences par couple
- **Intégration push** : Notifications push natives
- **Calendrier externe** : Synchronisation avec Google Calendar, iCal

### **Optimisations**
- **Cache intelligent** : Mise en cache des événements
- **Vérification différée** : Vérification en arrière-plan
- **Batch processing** : Traitement en lot des notifications
- **Analytics** : Statistiques d'utilisation et de performance

## 📞 Support

Pour toute question ou problème :
1. **Vérifier les logs** dans la console du navigateur
2. **Consulter la base de données** pour les erreurs SQL
3. **Tester avec des données simples** pour isoler le problème
4. **Vérifier les permissions** et politiques RLS

---

**🎉 Le système est maintenant prêt à envoyer automatiquement des rappels d'événements à vos utilisateurs !**
