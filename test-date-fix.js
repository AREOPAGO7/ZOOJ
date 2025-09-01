// Script de test pour vérifier la correction des dates
// Exécutez ce script dans la console du navigateur pour tester

console.log('🧪 Test de correction des dates...');

// Test 1: Date locale vs UTC
const testDate = new Date('2024-09-01T12:00:00');
console.log('📅 Date de test:', testDate);
console.log('🌍 toISOString() (UTC):', testDate.toISOString().split('T')[0]);
console.log('🏠 toLocalDateString():', testDate.toDateString());

// Test 2: Fonction utilitaire
function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('🔧 toLocalDateString():', toLocalDateString(testDate));

// Test 3: Comparaison des méthodes
const now = new Date();
console.log('\n📊 Comparaison des méthodes:');
console.log('Date actuelle:', now);
console.log('toISOString().split("T")[0]:', now.toISOString().split('T')[0]);
console.log('toLocalDateString():', toLocalDateString(now));
console.log('toDateString():', now.toDateString());

// Test 4: Vérification du fuseau horaire
console.log('\n🌍 Informations sur le fuseau horaire:');
console.log('Fuseau horaire:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Offset UTC:', now.getTimezoneOffset(), 'minutes');

// Test 5: Simulation du problème
console.log('\n⚠️ Simulation du problème:');
const eveningDate = new Date('2024-09-01T23:00:00');
console.log('Date du soir (23h00):', eveningDate);
console.log('toISOString() (problématique):', eveningDate.toISOString().split('T')[0]);
console.log('toLocalDateString() (correct):', toLocalDateString(eveningDate));

console.log('\n✅ Test terminé !');
console.log('Si toLocalDateString() donne une date différente de toISOString(),');
console.log('cela confirme que le problème de décalage est résolu !');
