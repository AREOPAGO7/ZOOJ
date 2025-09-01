// Script de test pour vérifier le système alarmable
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test du système alarmable...');

// Test 1: Vérifier que la colonne alarmable existe
console.log('\n📋 Test 1: Vérification de la colonne alarmable');
console.log('Exécutez ceci dans Supabase SQL Editor:');
console.log(`
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'calendar_events' 
AND column_name = 'alarmable';
`);

// Test 2: Vérifier les événements existants
console.log('\n📅 Test 2: Vérification des événements existants');
console.log('Exécutez ceci dans Supabase SQL Editor:');
console.log(`
SELECT 
  id,
  title,
  event_date,
  alarmable,
  created_at
FROM calendar_events 
LIMIT 5;
`);

// Test 3: Créer un événement de test avec alarmable = false
console.log('\n🔕 Test 3: Créer un événement non-alarmable');
console.log('Exécutez ceci dans Supabase SQL Editor (remplacez YOUR_COUPLE_ID):');
console.log(`
INSERT INTO calendar_events (title, event_date, couple_id, alarmable) VALUES
('Test Event Non-Alarmable', '2024-12-26', 'YOUR_COUPLE_ID', false);
`);

// Test 4: Créer un événement de test avec alarmable = true
console.log('\n🔔 Test 4: Créer un événement alarmable');
console.log('Exécutez ceci dans Supabase SQL Editor (remplacez YOUR_COUPLE_ID):');
console.log(`
INSERT INTO calendar_events (title, event_date, couple_id, alarmable) VALUES
('Test Event Alarmable', '2024-12-26', 'YOUR_COUPLE_ID', true);
`);

// Test 5: Vérifier le comportement des notifications
console.log('\n📱 Test 5: Vérifier le comportement des notifications');
console.log('1. Visitez la page calendrier');
console.log('2. Vérifiez que l\'événement non-alarmable n\'envoie pas de notifications');
console.log('3. Vérifiez que l\'événement alarmable envoie des notifications');
console.log('4. Vérifiez les logs dans la console pour voir les messages');

// Test 6: Tester le toggle dans l\'interface
console.log('\n🔄 Test 6: Tester le toggle dans l\'interface');
console.log('1. Dans la liste des événements, cliquez sur le bouton "Rappels ON/OFF"');
console.log('2. Vérifiez que le statut change dans la base de données');
console.log('3. Vérifiez que l\'icône change (bell-ring vs bell-off)');

console.log('\n✅ Tests configurés !');
console.log('Exécutez les requêtes SQL dans Supabase, puis testez l\'interface.');
