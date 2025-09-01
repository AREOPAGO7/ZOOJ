# Système de Notifications - ZOOJ App

Ce document décrit le système de notifications complet implémenté dans l'application ZOOJ, permettant d'envoyer des notifications à des utilisateurs individuels ou à des couples.

## 🗄️ Structure de la Base de Données

### Tables Requises

Exécutez le script SQL suivant dans votre base de données Supabase :

```sql
-- Créer la table des notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('event', 'daily_question', 'quiz_invite', 'general', 'couple_update')),
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Créer la table des paramètres de notification
CREATE TABLE notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  events_enabled BOOLEAN DEFAULT TRUE,
  daily_questions_enabled BOOLEAN DEFAULT TRUE,
  quiz_invites_enabled BOOLEAN DEFAULT TRUE,
  couple_updates_enabled BOOLEAN DEFAULT TRUE,
  general_notifications_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table des invitations au quiz
CREATE TABLE quiz_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer les index pour de meilleures performances
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_is_deleted ON notifications(is_deleted);

-- Activer la sécurité au niveau des lignes (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_invites ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to insert notifications for others (for sending notifications)
CREATE POLICY "Users can insert notifications for others" ON notifications
  FOR INSERT WITH CHECK (true);

-- Politiques RLS pour les paramètres de notification
CREATE POLICY "Users can view their own notification settings" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour les invitations au quiz
CREATE POLICY "Users can view quiz invites they sent or received" ON quiz_invites
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert quiz invites" ON quiz_invites
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update quiz invites they received" ON quiz_invites
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Allow users to update quiz invites they sent (for status changes)
CREATE POLICY "Users can update quiz invites they sent" ON quiz_invites
  FOR UPDATE USING (auth.uid() = sender_id);

-- Fonction pour créer automatiquement les paramètres de notification pour les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION create_notification_settings_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheur pour créer les paramètres de notification lors de la création d'un nouvel utilisateur
CREATE TRIGGER create_notification_settings_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_settings_for_user();
```

## 🚀 Utilisation du Système

### 1. Hook Principal : `useNotificationManager`

Le hook principal qui fournit toutes les fonctions de notification :

```tsx
import { useNotificationManager } from '@/hooks/useNotificationManager'

function MyComponent() {
  const {
    sendEventNotification,
    sendDailyQuestion,
    sendQuizInvite,
    sendCoupleUpdate,
    sendUrgentNotification,
    sendReminder,
    sendInfo,
    sendEventToCouple,
    sendDailyQuestionToCouple,
    isAuthenticated
  } = useNotificationManager()

  // Utilisation...
}
```

### 2. Types de Notifications Disponibles

#### Notifications Individuelles
- **Événements** : Rappels d'événements, rendez-vous
- **Questions Quotidiennes** : Questions pour stimuler la conversation
- **Invitations au Quiz** : Invitations à participer à des quiz
- **Mises à jour du Couple** : Changements de profil, nouvelles photos
- **Notifications Générales** : Informations diverses

#### Notifications par Priorité
- **Urgente** : Rappels importants, alertes
- **Haute** : Rappels, invitations
- **Normale** : Notifications standard
- **Basse** : Informations non critiques

#### Notifications au Couple
- Envoi automatique aux deux membres du couple
- Idéal pour les événements partagés et questions communes

### 3. Exemples d'Utilisation

#### Envoyer une Notification d'Événement
```tsx
const handleCreateEvent = async () => {
  const result = await sendEventNotification(
    'Dîner romantique',
    'Ce soir à 20h',
    'event_123'
  )
  
  if (result?.error) {
    console.error('Erreur:', result.error)
  } else {
    console.log('Notification envoyée avec succès!')
  }
}
```

#### Envoyer une Question Quotidienne au Couple
```tsx
const handleSendDailyQuestion = async () => {
  const result = await sendDailyQuestionToCouple(
    'Quel est votre rêve pour votre couple ?'
  )
  
  if (result?.error) {
    console.error('Erreur:', result.error)
  }
}
```

#### Envoyer une Notification Urgente
```tsx
const handleSendUrgentReminder = async () => {
  const result = await sendUrgentNotification(
    'Rappel important',
    'N\'oubliez pas votre rendez-vous chez le médecin demain !'
  )
}
```

#### Inviter au Quiz
```tsx
const handleInviteToQuiz = async (receiverId: string) => {
  const result = await sendQuizInvite(
    receiverId,
    'Quiz de compatibilité',
    'Voulez-vous tester notre compatibilité ?'
  )
}
```

### 4. Gestion des Notifications

#### Lire les Notifications
```tsx
import { useNotifications } from '@/contexts/NotificationContext'

function NotificationsList() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    deleteNotification 
  } = useNotifications()

  return (
    <View>
      <Text>Notifications non lues: {unreadCount}</Text>
      {notifications.map(notification => (
        <TouchableOpacity
          key={notification.id}
          onPress={() => markAsRead(notification.id)}
        >
          <Text>{notification.title}</Text>
          <Text>{notification.message}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
```

#### Paramètres de Notification
```tsx
function NotificationSettings() {
  const { notificationSettings, updateNotificationSettings } = useNotifications()

  const toggleSetting = (key: string, value: boolean) => {
    updateNotificationSettings({ [key]: value })
  }

  return (
    <View>
      <Switch
        value={notificationSettings?.events_enabled}
        onValueChange={(value) => toggleSetting('events_enabled', value)}
      />
      <Text>Notifications d'événements</Text>
    </View>
  )
}
```

## 🎯 Cas d'Usage Avancés

### 1. Notifications Programmées

Pour les notifications programmées (événements futurs, rappels), utilisez le champ `expires_at` :

```tsx
// Créer une notification qui expire dans 24h
const result = await notificationService.createNotification({
  user_id: userId,
  title: 'Rappel',
  message: 'Votre événement commence dans 1 heure',
  type: 'event',
  data: { eventId: 'event_123' },
  priority: 'high',
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
})
```

### 2. Notifications en Lot

Pour envoyer des notifications à plusieurs utilisateurs :

```tsx
const result = await sendBatchNotifications(
  ['user1', 'user2', 'user3'],
  'Nouvelle fonctionnalité',
  'Découvrez notre nouvelle fonctionnalité !',
  'general'
)

console.log(`${result.successful} notifications envoyées avec succès`)
console.log(`${result.failed} échecs`)
```

### 3. Notifications Contextuelles

Utilisez le champ `data` pour stocker des informations contextuelles :

```tsx
const result = await sendEventNotification(
  'Nouvel événement',
  'Votre partenaire a créé un nouvel événement',
  'event_456'
)

// Les données contextuelles sont automatiquement ajoutées
// data: { eventId: 'event_456', eventTitle: 'Nouvel événement', eventDate: '...' }
```

## 🔧 Configuration et Personnalisation

### 1. Thèmes et Couleurs

Le système s'adapte automatiquement au thème de l'application. Les couleurs sont définies dans `ThemeContext`.

### 2. Localisation

Les messages sont en français par défaut. Pour la localisation, modifiez les textes dans les fonctions de notification.

### 3. Heures Silencieuses

Configurez les heures silencieuses dans les paramètres de notification :

```tsx
await updateNotificationSettings({
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00'
})
```

## 📱 Interface Utilisateur

### 1. Badge de Notification

Le composant `NotificationBadge` affiche automatiquement le nombre de notifications non lues :

```tsx
import { NotificationBadge } from '@/components/NotificationBadge'

// Dans un onglet ou header
<View style={{ position: 'relative' }}>
  <MaterialCommunityIcons name="bell" size={24} color={colors.text} />
  <NotificationBadge size="small" />
</View>
```

### 2. Page des Notifications

La page `/notifications` fournit une interface complète pour :
- Voir toutes les notifications
- Marquer comme lu
- Supprimer des notifications
- Gérer les paramètres
- Actions en lot (marquer tout comme lu, supprimer tout)

### 3. Composant de Démonstration

Utilisez `NotificationDemo` pour tester toutes les fonctionnalités :

```tsx
import { NotificationDemo } from '@/components/NotificationDemo'

function TestPage() {
  return (
    <ScrollView>
      <NotificationDemo />
    </ScrollView>
  )
}
```

## 🚨 Gestion des Erreurs

### 1. Vérification de l'Authentification

Toutes les fonctions vérifient automatiquement l'authentification :

```tsx
const result = await sendEventNotification('Titre', 'Message')
if (result?.error) {
  if (result.error === 'User not authenticated') {
    // Rediriger vers la connexion
  } else {
    // Gérer l'erreur spécifique
  }
}
```

### 2. Logs et Débogage

Les erreurs sont automatiquement loggées dans la console. Activez le débogage pour plus de détails.

## 🔄 Mise à Jour en Temps Réel

Le système utilise Supabase Realtime pour les mises à jour automatiques :

- Nouvelles notifications apparaissent instantanément
- Compteur de notifications non lues mis à jour en temps réel
- Pas besoin de rafraîchir manuellement

## 📋 Checklist d'Implémentation

- [ ] Exécuter le script SQL dans Supabase
- [ ] Ajouter `NotificationProvider` dans `_layout.tsx`
- [ ] Importer et utiliser `useNotificationManager` dans vos composants
- [ ] Tester avec `NotificationDemo`
- [ ] Configurer les paramètres de notification
- [ ] Intégrer dans vos fonctionnalités existantes

## 🎉 Fonctionnalités Clés

✅ **Notifications en temps réel** avec Supabase Realtime  
✅ **Gestion des couples** avec notifications automatiques  
✅ **Système de priorités** (urgent, haute, normale, basse)  
✅ **Paramètres personnalisables** par type de notification  
✅ **Interface utilisateur complète** avec gestion des notifications  
✅ **Badges visuels** pour les notifications non lues  
✅ **Support multilingue** (français par défaut)  
✅ **Gestion des erreurs** robuste  
✅ **Performance optimisée** avec index et RLS  
✅ **Sécurité** avec Row Level Security  

## 📞 Support

Pour toute question ou problème avec le système de notifications, consultez :
- Les logs de la console pour les erreurs
- La documentation Supabase pour les requêtes
- Les composants de démonstration pour des exemples d'utilisation
