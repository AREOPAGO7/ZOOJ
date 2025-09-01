// Script de test pour vérifier le service de notifications des questions quotidiennes
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test du service de notifications des questions quotidiennes...');

// Test 1: Vérifier que la table daily_questions existe
console.log('\n📋 Test 1: Vérification de la table daily_questions');
console.log('Exécutez ceci dans Supabase SQL Editor:');
console.log(`
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'daily_questions';
`);

// Test 2: Vérifier la structure de la table daily_questions
console.log('\n🏗️ Test 2: Vérification de la structure de daily_questions');
console.log('Exécutez ceci dans Supabase SQL Editor:');
console.log(`
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'daily_questions'
ORDER BY ordinal_position;
`);

// Test 3: Vérifier les questions quotidiennes existantes
console.log('\n📅 Test 3: Vérification des questions quotidiennes existantes');
console.log('Exécutez ceci dans Supabase SQL Editor:');
console.log(`
SELECT 
  dq.id,
  dq.couple_id,
  dq.scheduled_for,
  dq.created_at,
  q.content as question_content
FROM daily_questions dq
LEFT JOIN questions q ON dq.question_id = q.id
ORDER BY dq.created_at DESC
LIMIT 5;
`);

// Test 4: Créer une question de test
console.log('\n❓ Test 4: Créer une question de test');
console.log('Exécutez ceci dans Supabase SQL Editor (remplacez YOUR_COUPLE_ID):');
console.log(`
-- D'abord, créer une question dans la table questions
INSERT INTO questions (content, scheduled_time) VALUES
('Quelle est votre activité préférée à faire ensemble ?', '09:00:00')
RETURNING id;

-- Ensuite, créer une question quotidienne pour aujourd\'hui
INSERT INTO daily_questions (couple_id, question_id, scheduled_for) VALUES
('YOUR_COUPLE_ID', (SELECT id FROM questions WHERE content = 'Quelle est votre activité préférée à faire ensemble ?' LIMIT 1), CURRENT_DATE)
RETURNING *;
`);

// Test 5: Vérifier les notifications envoyées
console.log('\n🔔 Test 5: Vérifier les notifications envoyées');
console.log('Exécutez ceci dans Supabase SQL Editor:');
console.log(`
SELECT 
  id,
  user_id,
  title,
  message,
  type,
  data,
  created_at
FROM notifications 
WHERE type = 'daily_question'
AND data->>'notificationType' = 'new_daily_question'
ORDER BY created_at DESC
LIMIT 5;
`);

// Test 6: Vérifier les couples existants
console.log('\n💕 Test 6: Vérifier les couples existants');
console.log('Exécutez ceci dans Supabase SQL Editor:');
console.log(`
SELECT 
  id,
  user1_id,
  user2_id,
  created_at
FROM couples
LIMIT 5;
`);

// Test 7: Vérifier les profils utilisateurs
console.log('\n👤 Test 7: Vérifier les profils utilisateurs');
console.log('Exécutez ceci dans Supabase SQL Editor:');
console.log(`
SELECT 
  id,
  name,
  email,
  created_at
FROM profiles
LIMIT 5;
`);

// Test 8: Simulation du processus de notification
console.log('\n🔄 Test 8: Simulation du processus de notification');
console.log('1. Créez une nouvelle question quotidienne pour aujourd\'hui');
console.log('2. Exécutez le service de notification manuellement');
console.log('3. Vérifiez que les notifications sont créées dans la table notifications');
console.log('4. Vérifiez que les deux membres du couple ont reçu une notification');

// Test 9: Vérification des logs
console.log('\n📝 Test 9: Vérification des logs');
console.log('Dans la console du navigateur, vous devriez voir:');
console.log('- 🔍 Checking for new daily questions created today...');
console.log('- 📅 Today date: [DATE]');
console.log('- 📋 Found X new daily questions for today');
console.log('- ✅ Notifications sent for daily question: [QUESTION_CONTENT]');
console.log('- 🎯 Daily question check complete: X questions found, Y notifications sent');

// Test 10: Test de prévention des doublons
console.log('\n🛡️ Test 10: Test de prévention des doublons');
console.log('1. Exécutez le service une première fois');
console.log('2. Exécutez le service une deuxième fois');
console.log('3. Vérifiez qu\'aucune notification en double n\'est créée');
console.log('4. Vérifiez les logs: "Notifications already sent for daily question"');

console.log('\n✅ Tests configurés !');
console.log('Exécutez les requêtes SQL dans Supabase, puis testez le service.');
console.log('\n💡 Pour tester manuellement le service:');
console.log('1. Importez dailyQuestionNotificationService');
console.log('2. Appelez dailyQuestionNotificationService.manualCheck()');
console.log('3. Vérifiez les résultats et les logs');
