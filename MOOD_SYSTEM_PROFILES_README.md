# 🎭 Système d'Humeur avec Table Profiles - Documentation

## 📋 Vue d'ensemble

Le système d'humeur a été modifié pour utiliser un champ `mood` dans la table `profiles` existante au lieu d'une table séparée `user_moods`. Cette approche simplifie l'architecture et évite les problèmes de table manquante.

## ✨ Fonctionnalités

### 🎯 Fonctionnalités Principales
- **Sélection d'humeur** : Interface modale avec 5 options d'humeur
- **Affichage en temps réel** : Les humeurs s'affichent immédiatement pour les deux partenaires
- **Photos de profil réelles** : Utilisation des vraies photos de profil des utilisateurs depuis la table `profiles`
- **Indicateurs visuels** : Emojis colorés pour chaque type d'humeur
- **Stockage simplifié** : Humeur stockée directement dans le profil utilisateur
- **Mise à jour** : Possibilité de changer son humeur à tout moment

### 😊 Types d'Humeur Disponibles
1. **Joyeux** 😊 - Jaune doré
2. **Content** 🙂 - Vert clair
3. **Neutre** 😐 - Gris
4. **Triste** 😢 - Bleu clair
5. **Énervé** 😠 - Rose clair

## 🏗️ Architecture Technique

### 📁 Fichiers Principaux

#### **Services**
- `lib/moodService.ts` - Service principal pour la gestion des humeurs (modifié)
- `components/MoodSelector.tsx` - Composant de sélection d'humeur (modal)
- `components/CoupleMoodDisplay.tsx` - Affichage des humeurs du couple

#### **Pages**
- `app/pages/accueil.tsx` - Intégration du système d'humeur

#### **Base de Données**
- `add-mood-to-profiles.sql` - Script pour ajouter le champ mood à la table profiles

### 🗄️ Structure de la Base de Données

#### Modification de la Table `profiles`
```sql
-- Ajouter le champ mood à la table profiles existante
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT 'neutre' 
CHECK (mood IN ('joyeux', 'content', 'neutre', 'triste', 'enerve'));
```

#### Colonnes Utilisées
- `id` - ID de l'utilisateur (clé primaire)
- `name` - Nom de l'utilisateur
- `avatar_url` - URL de la photo de profil
- `mood` - Humeur actuelle (nouveau champ)
- `updated_at` - Date de dernière mise à jour

#### Sécurité (RLS)
- Les politiques RLS existantes de la table `profiles` s'appliquent automatiquement
- Les utilisateurs peuvent voir et modifier leurs propres profils
- Les partenaires peuvent voir les profils de leur couple

## 🎨 Interface Utilisateur

### Modal de Sélection d'Humeur
- **Design** : Exactement comme l'image de référence
- **Titre** : "Comment vous sentez-vous ?"
- **Options** : 5 emojis avec labels en français
- **Fond** : Rose/violet clair (#F8F0FF)
- **Bouton de fermeture** : "✕" en haut à droite

### Affichage des Humeurs du Couple
- **Avatars** : Photos de profil réelles depuis la table `profiles`
- **Indicateurs** : Emojis colorés en superposition
- **Positionnement** : Avatars superposés en en-tête
- **Interaction** : Clic sur son propre avatar pour changer d'humeur

## 🔧 Utilisation

### Pour l'Utilisateur
1. **Accéder** : Aller sur la page d'accueil
2. **Voir** : Les humeurs du couple s'affichent automatiquement
3. **Changer** : Cliquer sur son propre avatar
4. **Sélectionner** : Choisir une nouvelle humeur dans le modal
5. **Confirmer** : L'humeur se met à jour automatiquement

### Pour le Développeur
```typescript
// Récupérer les humeurs du couple
const { data, error } = await moodService.getCoupleMoods(userId);

// Définir une humeur
const { data, error } = await moodService.setUserMood(userId, 'joyeux');

// Récupérer l'humeur actuelle
const { data, error } = await moodService.getCurrentUserMood(userId);
```

## 🧪 Tests

### Script de Test
- **Fichier** : `test-mood-profiles.js`
- **Fonctions** :
  - `testMoodProfiles()` - Test complet du système
  - `createTestMood(moodType)` - Créer une humeur de test
  - `showCoupleProfiles()` - Afficher les profils du couple

### Tests Disponibles
1. **Vérification de la table profiles** : Existence et accessibilité
2. **Authentification** : Utilisateur connecté
3. **Profil utilisateur** : Récupération des données de profil
4. **Couple** : Relation utilisateur-partenaire
5. **CRUD** : Création, lecture, mise à jour des humeurs
6. **Photos de profil** : Vérification des avatars

## 🚀 Installation

### 1. Ajouter le Champ Mood à la Table Profiles
```sql
-- Exécuter le script SQL
\i add-mood-to-profiles.sql
```

### 2. Vérifier les Dépendances
- `@expo/vector-icons` - Pour les icônes
- `expo-haptics` - Pour le retour haptique
- `react-native` - Composants de base

### 3. Tester le Système
```javascript
// Dans la console du navigateur
testMoodProfiles();
```

## 🔄 Workflow

### Flux de Données
1. **Utilisateur clique** sur son avatar
2. **Modal s'ouvre** avec les options d'humeur
3. **Utilisateur sélectionne** une humeur
4. **Service met à jour** le champ `mood` dans la table `profiles`
5. **Interface se rafraîchit** automatiquement
6. **Partenaire voit** la nouvelle humeur en temps réel

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
- **Photos réelles** : Utilisation des vraies photos de profil

### Pour les Développeurs
- **Architecture simplifiée** : Pas de table séparée
- **Moins de complexité** : Moins de jointures nécessaires
- **Sécurisé** : RLS existant de la table profiles
- **Performant** : Requêtes plus simples
- **Maintenable** : Code plus simple

## 🔮 Évolutions Futures

### Fonctionnalités Possibles
- **Historique graphique** : Graphiques d'évolution (nécessiterait une table séparée)
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
- Vérifier que le champ `mood` existe dans la table `profiles`
- Contrôler les politiques RLS
- Vérifier l'existence du couple

#### Modal ne s'ouvre pas
- Contrôler les permissions utilisateur
- Vérifier l'état de l'authentification
- Contrôler les erreurs JavaScript

#### Photos de profil manquantes
- Vérifier les URLs des avatars dans la table `profiles`
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

**Version** : 2.0.0  
**Dernière mise à jour** : Décembre 2024  
**Auteur** : Assistant IA
