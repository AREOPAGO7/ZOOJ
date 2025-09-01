# 🎭 Système d'Humeur - Documentation

## 📋 Vue d'ensemble

Le système d'humeur permet aux utilisateurs de partager leur état émotionnel avec leur partenaire. Chaque utilisateur peut définir son humeur quotidienne, et les deux partenaires peuvent voir les humeurs respectives sur la page d'accueil.

## ✨ Fonctionnalités

### 🎯 Fonctionnalités Principales
- **Sélection d'humeur** : Interface modale avec 5 options d'humeur
- **Affichage en temps réel** : Les humeurs s'affichent immédiatement pour les deux partenaires
- **Photos de profil réelles** : Utilisation des vraies photos de profil des utilisateurs
- **Indicateurs visuels** : Emojis colorés pour chaque type d'humeur
- **Historique** : Conservation des humeurs par jour
- **Mise à jour** : Possibilité de changer son humeur plusieurs fois par jour

### 😊 Types d'Humeur Disponibles
1. **Joyeux** 😊 - Jaune doré
2. **Content** 🙂 - Vert clair
3. **Neutre** 😐 - Gris
4. **Triste** 😢 - Bleu clair
5. **Énervé** 😠 - Rose clair

## 🏗️ Architecture Technique

### 📁 Fichiers Principaux

#### **Services**
- `lib/moodService.ts` - Service principal pour la gestion des humeurs
- `components/MoodSelector.tsx` - Composant de sélection d'humeur (modal)
- `components/CoupleMoodDisplay.tsx` - Affichage des humeurs du couple

#### **Pages**
- `app/pages/accueil.tsx` - Intégration du système d'humeur

#### **Base de Données**
- `setup-user-moods-table.sql` - Script de création de la table

### 🗄️ Structure de la Base de Données

#### Table `user_moods`
```sql
CREATE TABLE user_moods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_type TEXT NOT NULL CHECK (mood_type IN ('joyeux', 'content', 'neutre', 'triste', 'enerve')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Sécurité (RLS)
- **Lecture** : Utilisateurs peuvent voir leurs propres humeurs et celles de leur partenaire
- **Écriture** : Utilisateurs peuvent seulement modifier leurs propres humeurs
- **Suppression** : Utilisateurs peuvent seulement supprimer leurs propres humeurs

## 🎨 Interface Utilisateur

### Modal de Sélection d'Humeur
- **Design** : Exactement comme l'image de référence
- **Titre** : "Comment vous sentez-vous ?"
- **Options** : 5 emojis avec labels en français
- **Fond** : Rose/violet clair (#F8F0FF)
- **Bouton de fermeture** : "✕" en haut à droite

### Affichage des Humeurs du Couple
- **Cartes** : Une carte par utilisateur
- **Photos de profil** : Images réelles des utilisateurs
- **Indicateurs** : Emojis colorés en superposition
- **Informations** : Nom, type d'humeur, heure de mise à jour
- **Interaction** : Clic sur sa propre carte pour changer d'humeur

## 🔧 Utilisation

### Pour l'Utilisateur
1. **Accéder** : Aller sur la page d'accueil
2. **Voir** : Les humeurs du couple s'affichent automatiquement
3. **Changer** : Cliquer sur sa propre carte d'humeur
4. **Sélectionner** : Choisir une nouvelle humeur dans le modal
5. **Confirmer** : L'humeur se met à jour automatiquement

### Pour le Développeur
```typescript
// Récupérer les humeurs du couple
const { data, error } = await moodService.getCoupleMoods(userId);

// Définir une humeur
const { data, error } = await moodService.setUserMood(userId, 'joyeux');

// Récupérer l'historique
const { data, error } = await moodService.getUserMoodHistory(userId, 7);
```

## 🧪 Tests

### Script de Test
- **Fichier** : `test-mood-system.js`
- **Fonctions** :
  - `testMoodSystem()` - Test complet du système
  - `createTestMood(moodType)` - Créer une humeur de test
  - `showAllMoods()` - Afficher toutes les humeurs

### Tests Disponibles
1. **Vérification de la table** : Existence et accessibilité
2. **Authentification** : Utilisateur connecté
3. **Couple** : Relation utilisateur-partenaire
4. **CRUD** : Création, lecture, mise à jour des humeurs
5. **Sécurité** : Vérification des politiques RLS

## 🚀 Installation

### 1. Créer la Table
```sql
-- Exécuter le script SQL
\i setup-user-moods-table.sql
```

### 2. Vérifier les Dépendances
- `@expo/vector-icons` - Pour les icônes
- `expo-haptics` - Pour le retour haptique
- `react-native` - Composants de base

### 3. Tester le Système
```javascript
// Dans la console du navigateur
testMoodSystem();
```

## 🔄 Workflow

### Flux de Données
1. **Utilisateur clique** sur sa carte d'humeur
2. **Modal s'ouvre** avec les options d'humeur
3. **Utilisateur sélectionne** une humeur
4. **Service envoie** la requête à Supabase
5. **Base de données** met à jour l'enregistrement
6. **Interface se rafraîchit** automatiquement
7. **Partenaire voit** la nouvelle humeur en temps réel

### Gestion des Erreurs
- **Connexion perdue** : Message d'erreur utilisateur
- **Permissions** : Vérification RLS automatique
- **Données manquantes** : Valeurs par défaut
- **Images** : Avatar par défaut si pas de photo

## 🎯 Avantages

### Pour les Utilisateurs
- **Communication émotionnelle** : Partage d'état d'esprit
- **Empathie** : Compréhension mutuelle
- **Simplicité** : Interface intuitive
- **Temps réel** : Mises à jour instantanées

### Pour les Développeurs
- **Modulaire** : Composants réutilisables
- **Sécurisé** : RLS et validation
- **Performant** : Requêtes optimisées
- **Maintenable** : Code bien structuré

## 🔮 Évolutions Futures

### Fonctionnalités Possibles
- **Historique graphique** : Graphiques d'évolution
- **Notifications** : Alertes de changement d'humeur
- **Statistiques** : Analyses d'humeur du couple
- **Messages** : Accompagnement de l'humeur
- **Rappels** : Suggestions de mise à jour

### Améliorations Techniques
- **Cache local** : Stockage hors ligne
- **Synchronisation** : Mise à jour en arrière-plan
- **Animations** : Transitions fluides
- **Accessibilité** : Support des lecteurs d'écran

## 🐛 Dépannage

### Problèmes Courants

#### Humeur ne s'affiche pas
- Vérifier la connexion à Supabase
- Contrôler les politiques RLS
- Vérifier l'existence du couple

#### Modal ne s'ouvre pas
- Contrôler les permissions utilisateur
- Vérifier l'état de l'authentification
- Contrôler les erreurs JavaScript

#### Photos de profil manquantes
- Vérifier les URLs des avatars
- Contrôler les permissions de stockage
- Utiliser l'avatar par défaut

### Logs de Debug
```javascript
// Activer les logs détaillés
console.log('Mood data:', coupleMoods);
console.log('Current user:', user);
console.log('Mood service error:', error);
```

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs de la console
2. Exécuter les tests automatiques
3. Contrôler la documentation
4. Consulter les exemples de code

---

**Version** : 1.0.0  
**Dernière mise à jour** : Décembre 2024  
**Auteur** : Assistant IA
