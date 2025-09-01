# 🔔 Système de Gestion des Rappels d'Événements (Alarmable)

Ce système permet aux utilisateurs de contrôler quels événements peuvent déclencher des notifications automatiques.

## 🚀 Fonctionnalités

### ✅ **Contrôle des Rappels**
- **Toggle dans le formulaire** : Bouton pour activer/désactiver les rappels lors de la création
- **Indicateur visuel** : Icône et texte montrant le statut des rappels
- **Modification en temps réel** : Possibilité de changer le statut depuis la liste des événements

### ✅ **Intégration avec les Notifications**
- **Événements alarmables** : Envoient des notifications la veille
- **Événements non-alarmables** : Aucune notification envoyée
- **Logs détaillés** : Traçabilité complète dans la console

## 🗄️ Structure de la Base de Données

### **Nouvelle Colonne `alarmable`**
```sql
-- Ajouter la colonne alarmable à calendar_events
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS alarmable BOOLEAN DEFAULT TRUE;

-- Mettre à jour les événements existants
UPDATE calendar_events 
SET alarmable = TRUE 
WHERE alarmable IS NULL;
```

### **Type de Données**
- **`alarmable`** : `BOOLEAN` (true/false)
- **Valeur par défaut** : `TRUE` (compatible avec l'existant)
- **Nullable** : `FALSE` (toujours une valeur définie)

## 🔧 Implémentation Technique

### **1. Interface TypeScript**
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  place: string;
  description: string;
  alarmable: boolean;        // ← Nouveau champ
  created_at: string;
}
```

### **2. Formulaire de Création**
```typescript
// Toggle pour activer/désactiver les rappels
{formType === 'event' && (
  <View style={calendarStyles.formField}>
    <View style={calendarStyles.toggleContainer}>
      <View style={calendarStyles.toggleLabelContainer}>
        <MaterialCommunityIcons 
          name="bell-ring" 
          size={20} 
          color={formAlarmable ? BRAND_PINK : BRAND_GRAY} 
        />
        <Text style={calendarStyles.formLabel}>
          Activer les rappels
        </Text>
      </View>
      <Pressable
        style={[calendarStyles.toggleSwitch, formAlarmable && calendarStyles.toggleSwitchActive]}
        onPress={() => setFormAlarmable(!formAlarmable)}
      >
        <View style={[calendarStyles.toggleThumb, formAlarmable && calendarStyles.toggleThumbActive]} />
      </Pressable>
    </View>
    <Text style={calendarStyles.toggleDescription}>
      {formAlarmable 
        ? 'Vous recevrez des notifications la veille de cet événement'
        : 'Aucune notification ne sera envoyée pour cet événement'
      }
    </Text>
  </View>
)}
```

### **3. Affichage dans la Liste**
```typescript
{/* Indicateur et toggle du statut alarmable */}
<View style={calendarStyles.eventAlarmableContainer}>
  <MaterialCommunityIcons 
    name={event.alarmable ? "bell-ring" : "bell-off"} 
    size={16} 
    color={event.alarmable ? BRAND_PINK : BRAND_GRAY} 
  />
  <Pressable
    style={calendarStyles.alarmableToggle}
    onPress={(e) => {
      e.stopPropagation();
      updateEventAlarmable(event.id, !event.alarmable);
    }}
  >
    <Text style={[calendarStyles.alarmableToggleText, { color: event.alarmable ? BRAND_PINK : BRAND_GRAY }]}>
      {event.alarmable ? 'Rappels ON' : 'Rappels OFF'}
    </Text>
  </Pressable>
</View>
```

### **4. Service de Notifications**
```typescript
// Vérification du statut alarmable avant envoi
for (const event of events) {
  // ... vérifications existantes ...
  
  // Check if event is alarmable
  if (!event.alarmable) {
    console.log(`🔕 Event "${event.title}" is not alarmable, skipping notifications`);
    continue;
  }
  
  // ... envoi des notifications ...
}
```

## 📱 Interface Utilisateur

### **Formulaire de Création**
- **Toggle Switch** : Bouton on/off avec animation
- **Icône dynamique** : Bell-ring (actif) ou Bell-off (inactif)
- **Description contextuelle** : Explication de l'effet du choix
- **Couleurs cohérentes** : Rose pour actif, gris pour inactif

### **Liste des Événements**
- **Indicateur visuel** : Icône et texte du statut
- **Bouton de toggle** : Changement rapide du statut
- **Prévention de propagation** : Clic sur toggle n'ouvre pas les détails

### **États Visuels**
- **🔔 Rappels ON** : Rose, icône bell-ring
- **🔕 Rappels OFF** : Gris, icône bell-off
- **Animation** : Transition fluide entre les états

## 🔄 Flux de Fonctionnement

### **1. Création d'Événement**
```
Utilisateur remplit le formulaire
    ↓
Toggle alarmable activé/désactivé
    ↓
Sauvegarde avec le champ alarmable
    ↓
Événement créé dans la base
```

### **2. Vérification des Notifications**
```
Système vérifie les événements de demain
    ↓
Filtrage par statut alarmable
    ↓
Notifications envoyées uniquement si alarmable = true
    ↓
Logs détaillés dans la console
```

### **3. Modification du Statut**
```
Utilisateur clique sur le toggle
    ↓
Mise à jour en base de données
    ↓
Mise à jour de l'interface
    ↓
Confirmation utilisateur
```

## 🧪 Tests et Validation

### **Script de Test**
```bash
# Exécuter test-alarmable-system.js dans la console
# Suivre les instructions pour tester chaque composant
```

### **Scénarios de Test**
1. **Création d'événement alarmable** → Vérifier notifications
2. **Création d'événement non-alarmable** → Vérifier absence de notifications
3. **Modification du statut** → Vérifier persistance et interface
4. **Événements existants** → Vérifier compatibilité

## 🐛 Dépannage

### **Problème** : Champ alarmable manquant
**Solution** : Exécuter le script SQL d'ajout de colonne

### **Problème** : Toggle ne fonctionne pas
**Solution** : Vérifier les styles et la fonction updateEventAlarmable

### **Problème** : Notifications toujours envoyées
**Solution** : Vérifier la logique dans eventNotificationService

## 🎯 Cas d'Usage

### **Scénario 1** : Événement Privé
```
Événement : "Rendez-vous médical personnel"
Alarmable : false
Résultat : Aucune notification envoyée
```

### **Scénario 2** : Événement Important
```
Événement : "Anniversaire de couple"
Alarmable : true
Résultat : Notifications envoyées la veille
```

### **Scénario 3** : Modification en Cours
```
Utilisateur désactive les rappels
Résultat : Aucune notification future
```

## 🔮 Évolutions Futures

### **Fonctionnalités Possibles**
- **Rappels multiples** : 1 jour, 1 heure, 15 minutes avant
- **Personnalisation par couple** : Préférences globales
- **Rappels conditionnels** : Basés sur la localisation
- **Intégration push** : Notifications natives

### **Optimisations**
- **Cache intelligent** : Mise en cache des préférences
- **Batch processing** : Traitement en lot des notifications
- **Analytics** : Statistiques d'utilisation des rappels

---

**🎉 Le système alarmable est maintenant opérationnel et permet un contrôle granulaire des notifications d'événements !**
