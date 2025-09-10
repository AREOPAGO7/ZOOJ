const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://uvdwymweuwfrzdqmhsjh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZHd5bXdldXdmcnpkcW1oc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTMxNDQsImV4cCI6MjA3MjY2OTE0NH0.9upekTjCGOSNUH0QyoCHE_TH4k34IznM_f4iSs2Rgb8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function insertSampleData() {
  try {
    console.log('🚀 Starting to insert sample service data...');

    // Insert service categories
    const categories = [
      {
        name: 'Bien-être',
        description: 'Services de bien-être et santé',
        icon: '🧘‍♀️'
      },
      {
        name: 'Sorties',
        description: 'Activités et sorties en couple',
        icon: '🎭'
      },
      {
        name: 'Événements',
        description: 'Organisation d\'événements spéciaux',
        icon: '💍'
      },
      {
        name: 'Maison',
        description: 'Services pour la maison',
        icon: '🏠'
      },
      {
        name: 'Cadeaux',
        description: 'Cadeaux et surprises romantiques',
        icon: '🎁'
      },
      {
        name: 'Beauté',
        description: 'Services de beauté et esthétique',
        icon: '💄'
      },
      {
        name: 'Famille',
        description: 'Services pour la famille',
        icon: '👶'
      },
      {
        name: 'Voyages',
        description: 'Voyages et escapades',
        icon: '✈️'
      }
    ];

    console.log('📝 Inserting service categories...');
    const { data: insertedCategories, error: categoriesError } = await supabase
      .from('service_categories')
      .insert(categories)
      .select();

    if (categoriesError) {
      console.error('❌ Error inserting categories:', categoriesError);
      return;
    }

    console.log('✅ Categories inserted successfully');

    // Insert service subcategories
    const subcategories = [
      // Bien-être
      {
        category_id: insertedCategories[0].id,
        name: 'Thérapie de couple',
        description: 'Coaches de vie, psychiatres et thérapeutes',
        icon: '🧘‍♀️'
      },
      {
        category_id: insertedCategories[0].id,
        name: 'Yoga / Méditation à deux',
        description: 'Séances en couple',
        icon: '🧘‍♂️'
      },
      {
        category_id: insertedCategories[0].id,
        name: 'Coaching nutrition',
        description: 'Nutritionnistes spécialisés',
        icon: '🥗'
      },
      {
        category_id: insertedCategories[0].id,
        name: 'Santé',
        description: 'Spécialistes médicaux',
        icon: '🏥'
      },
      
      // Sorties
      {
        category_id: insertedCategories[1].id,
        name: 'Restaurants romantiques',
        description: 'Dîners en amoureux',
        icon: '🍽️'
      },
      {
        category_id: insertedCategories[1].id,
        name: 'Cinéma / Théâtre',
        description: 'Spectacles à deux',
        icon: '🎬'
      },
      
      // Événements
      {
        category_id: insertedCategories[2].id,
        name: 'Organisation mariage',
        description: 'Salles de fêtes, espaces en plein air',
        icon: '💒'
      },
      {
        category_id: insertedCategories[2].id,
        name: 'Fiançailles / Anniversaires',
        description: 'Célébrations spéciales',
        icon: '🎂'
      },
      {
        category_id: insertedCategories[2].id,
        name: 'Photographie & souvenirs',
        description: 'Moments immortalisés',
        icon: '📸'
      },
      
      // Maison
      {
        category_id: insertedCategories[3].id,
        name: 'Décoration intérieure',
        description: 'Design d\'intérieur',
        icon: '🏡'
      },
      {
        category_id: insertedCategories[3].id,
        name: 'Ménage & services pratiques',
        description: 'Aide quotidienne',
        icon: '🧹'
      },
      {
        category_id: insertedCategories[3].id,
        name: 'Coaching organisation',
        description: 'Organisation et rangement',
        icon: '📋'
      },
      
      // Cadeaux
      {
        category_id: insertedCategories[4].id,
        name: 'Box romantiques',
        description: 'Coffrets surprises',
        icon: '💝'
      },
      {
        category_id: insertedCategories[4].id,
        name: 'Livraison de fleurs',
        description: 'Bouquets & compositions',
        icon: '🌹'
      },
      
      // Beauté
      {
        category_id: insertedCategories[5].id,
        name: 'Coiffeur / Esthétique',
        description: 'Soins en duo',
        icon: '💇‍♀️'
      },
      {
        category_id: insertedCategories[5].id,
        name: 'Lingerie & vêtements',
        description: 'Mode couple',
        icon: '👗'
      },
      
      // Famille
      {
        category_id: insertedCategories[6].id,
        name: 'Coaching parental',
        description: 'Accompagnement familial',
        icon: '👨‍👩‍👧‍👦'
      },
      {
        category_id: insertedCategories[6].id,
        name: 'Prénatal & bébé',
        description: 'Préparation & soins',
        icon: '🤱'
      },
      {
        category_id: insertedCategories[6].id,
        name: 'Babysitting',
        description: 'Garde d\'enfants',
        icon: '👶'
      },
      
      // Voyages
      {
        category_id: insertedCategories[7].id,
        name: 'Voyages à deux',
        description: 'Escapades romantiques',
        icon: '💑'
      },
      {
        category_id: insertedCategories[7].id,
        name: 'Hébergements atypiques',
        description: 'Séjours uniques',
        icon: '🏨'
      }
    ];

    console.log('📝 Inserting service subcategories...');
    const { data: insertedSubcategories, error: subcategoriesError } = await supabase
      .from('service_subcategories')
      .insert(subcategories)
      .select();

    if (subcategoriesError) {
      console.error('❌ Error inserting subcategories:', subcategoriesError);
      return;
    }

    console.log('✅ Subcategories inserted successfully');

    // Insert sample service providers
    const providers = [
      // Coiffeur / Esthétique
      {
        subcategory_id: insertedSubcategories.find(s => s.name === 'Coiffeur / Esthétique').id,
        name: 'Salon Élégance',
        description: 'Salon de coiffure haut de gamme pour couples',
        address: '123 Avenue Mohammed V',
        city: 'Casablanca',
        phone: '+212 5 22 123 456',
        price_range: '150-300 DH',
        opening_hours: { 'lun-ven': '9:00-19:00', 'sam': '9:00-17:00' }
      },
      {
        subcategory_id: insertedSubcategories.find(s => s.name === 'Coiffeur / Esthétique').id,
        name: 'Salon ForHim',
        description: 'Salon spécialisé pour hommes',
        address: '456 Boulevard Zerktouni',
        city: 'Casablanca',
        phone: '+212 5 22 234 567',
        price_range: '100-200 DH',
        opening_hours: { 'lun-ven': '8:00-20:00', 'sam': '8:00-18:00' }
      },
      {
        subcategory_id: insertedSubcategories.find(s => s.name === 'Coiffeur / Esthétique').id,
        name: 'Salon Rosine',
        description: 'Coiffure et esthétique féminine',
        address: '789 Rue de la Liberté',
        city: 'Casablanca',
        phone: '+212 5 22 345 678',
        price_range: '120-250 DH',
        opening_hours: { 'lun-ven': '9:00-18:00', 'sam': '9:00-16:00' }
      },
      
      // Restaurants romantiques
      {
        subcategory_id: insertedSubcategories.find(s => s.name === 'Restaurants romantiques').id,
        name: 'Le Jardin Secret',
        description: 'Restaurant romantique avec jardin privé',
        address: '321 Avenue Hassan II',
        city: 'Casablanca',
        phone: '+212 5 22 456 789',
        price_range: '300-600 DH',
        opening_hours: { 'lun-dim': '19:00-23:00' }
      },
      {
        subcategory_id: insertedSubcategories.find(s => s.name === 'Restaurants romantiques').id,
        name: 'Café de la Paix',
        description: 'Café romantique au centre-ville',
        address: '654 Place des Nations Unies',
        city: 'Rabat',
        phone: '+212 5 37 567 890',
        price_range: '150-400 DH',
        opening_hours: { 'lun-dim': '8:00-22:00' }
      },
      
      // Thérapie de couple
      {
        subcategory_id: insertedSubcategories.find(s => s.name === 'Thérapie de couple').id,
        name: 'Centre de Thérapie Couple',
        description: 'Thérapeutes spécialisés en couple',
        address: '987 Avenue Mohammed VI',
        city: 'Marrakech',
        phone: '+212 5 24 678 901',
        price_range: '400-800 DH',
        opening_hours: { 'lun-ven': '9:00-17:00' }
      },
      
      // Yoga / Méditation
      {
        subcategory_id: insertedSubcategories.find(s => s.name === 'Yoga / Méditation à deux').id,
        name: 'Studio Zen Couple',
        description: 'Cours de yoga et méditation pour couples',
        address: '147 Rue de la République',
        city: 'Fès',
        phone: '+212 5 35 789 012',
        price_range: '200-400 DH',
        opening_hours: { 'lun-ven': '7:00-20:00', 'sam': '8:00-18:00' }
      }
    ];

    console.log('📝 Inserting service providers...');
    const { data: insertedProviders, error: providersError } = await supabase
      .from('service_providers')
      .insert(providers)
      .select();

    if (providersError) {
      console.error('❌ Error inserting providers:', providersError);
      return;
    }

    console.log('✅ Providers inserted successfully');
    console.log('🎉 Sample data insertion completed!');
    console.log(`📊 Inserted: ${insertedCategories.length} categories, ${insertedSubcategories.length} subcategories, ${insertedProviders.length} providers`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
insertSampleData();
