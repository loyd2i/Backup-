import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Same hash function as in auth.ts
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'studiolib_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  console.log('🌱 Début du seeding...');

  // Créer l'utilisateur de démo
  const hashedPassword = await hashPassword('demo123');
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@studiolib.fr' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'demo@studiolib.fr',
      password: hashedPassword,
      name: 'Artiste Demo',
      phone: '+33 6 12 34 56 78',
      role: 'artiste',
      bio: 'Auteur-compositeur, ambiances electro-pop. En studio quand je ne suis pas sur scène.',
      city: 'Paris',
      genre: 'Electro-pop',
      instagram: '@artistedemo',
    },
  });

  console.log('✅ Utilisateur demo créé:', demoUser.email);

  // Créer un utilisateur propriétaire de studio
  const studioOwner = await prisma.user.upsert({
    where: { email: 'studio@studiolib.fr' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'studio@studiolib.fr',
      password: hashedPassword,
      name: 'Studio Alpha',
      phone: '+33 1 23 45 67 89',
      role: 'studio_owner',
    },
  });

  console.log('✅ Propriétaire studio créé:', studioOwner.email);

  // Créer des studios de démonstration
  const studios = [
    {
      id: 'studio-alpha',
      name: 'Studio Alpha',
      description: 'Studio professionnel d\'enregistrement et de mixage situé en plein cœur de Paris. Équipement haut de gamme et acoustique optimisée.',
      location: 'Paris 11ème',
      address: '42 rue de la Roquette, 75011 Paris',
      type: 'professionnel',
      pricePerHour: 80,
      rating: 4.8,
      equipment: 'Pro Tools HDX, Neumann U87, SSL Console, Traitement acoustique premium',
      capacity: 8,
      latitude: 48.8566,
      longitude: 2.3522,
    },
    {
      id: 'beat-lab',
      name: 'Beat Lab',
      description: 'Home studio spécialisé dans la production beats et le mix hip-hop. Ambiance créative et prix accessibles.',
      location: 'Montreuil',
      address: '15 rue de Paris, 93100 Montreuil',
      type: 'home_studio',
      pricePerHour: 35,
      rating: 4.5,
      equipment: 'FL Studio, Ableton Live, Maschine, Moniteurs KRK',
      capacity: 4,
      latitude: 48.8647,
      longitude: 2.4417,
    },
    {
      id: 'sound-factory',
      name: 'Sound Factory',
      description: 'Grand studio de production avec plusieurs cabines et une salle de prise de son live. Idéal pour les groupes.',
      location: 'Boulogne-Billancourt',
      address: '8 avenue Jean-Baptiste Clément, 92100 Boulogne',
      type: 'professionnel',
      pricePerHour: 120,
      rating: 4.9,
      equipment: 'Console API, Pro Tools, Logic Pro, Micros Neumann & AKG, Piano à queue',
      capacity: 15,
      latitude: 48.8396,
      longitude: 2.2389,
    },
    {
      id: 'vocal-booth-paris',
      name: 'Vocal Booth Paris',
      description: 'Studio spécialisé dans l\'enregistrement voix et podcast. Cabine insonorisée avec une acoustique parfaite.',
      location: 'Paris 18ème',
      address: '25 rue de Clignancourt, 75018 Paris',
      type: 'professionnel',
      pricePerHour: 55,
      rating: 4.7,
      equipment: 'Neumann TLM 103, Avalon 737, Pro Tools, Traitement acoustique professionnel',
      capacity: 3,
      latitude: 48.8935,
      longitude: 2.3476,
    },
    {
      id: 'maison-du-son',
      name: 'Maison du Son',
      description: 'Home studio convivial pour les projets indépendants. Parfait pour les demos et premiers essais.',
      location: 'Villejuif',
      address: '3 rue Paul Armangot, 94800 Villejuif',
      type: 'home_studio',
      pricePerHour: 25,
      rating: 4.3,
      equipment: 'Ableton Live, Interface Focusrite, Micro Rode NT1-A',
      capacity: 3,
      latitude: 48.8032,
      longitude: 2.3664,
    },
  ];

  for (const studioData of studios) {
    const studio = await prisma.studio.upsert({
      where: { id: studioData.id },
      update: {},
      create: {
        ...studioData,
        ownerId: studioOwner.id,
      },
    });

    // Ajouter les disponibilités (horaires d'ouverture)
    const availabilities = [
      { dayOfWeek: 1, startTime: '10:00', endTime: '20:00' }, // Lundi
      { dayOfWeek: 2, startTime: '10:00', endTime: '20:00' }, // Mardi
      { dayOfWeek: 3, startTime: '10:00', endTime: '20:00' }, // Mercredi
      { dayOfWeek: 4, startTime: '10:00', endTime: '20:00' }, // Jeudi
      { dayOfWeek: 5, startTime: '10:00', endTime: '22:00' }, // Vendredi
      { dayOfWeek: 6, startTime: '12:00', endTime: '18:00' }, // Samedi
    ];

    for (const avail of availabilities) {
      await prisma.availability.upsert({
        where: {
          studioId_dayOfWeek: {
            studioId: studio.id,
            dayOfWeek: avail.dayOfWeek,
          },
        },
        update: {},
        create: {
          studioId: studio.id,
          ...avail,
          isActive: true,
        },
      });
    }

    // Supprimer les anciens tarifs et ajouter les nouveaux
    await prisma.pricingTier.deleteMany({
      where: { studioId: studio.id }
    });

    const pricingTiers = [
      { name: 'Séance 2h', description: 'Séance standard de 2 heures', price: studioData.pricePerHour * 2, duration: 2 },
      { name: 'Demi-journée', description: '4 heures de studio', price: studioData.pricePerHour * 3.5, duration: 4 },
      { name: 'Journée complète', description: '8 heures de studio', price: studioData.pricePerHour * 6, duration: 8 },
    ];

    for (const tier of pricingTiers) {
      await prisma.pricingTier.create({
        data: {
          studioId: studio.id,
          ...tier,
          unit: 'heure',
        },
      });
    }

    console.log('✅ Studio créé:', studio.name);
  }

  // Créer des catégories de forum
  const categories = [
    { name: 'Technique', description: 'Questions techniques sur le son et l\'enregistrement', slug: 'technique', icon: 'settings' },
    { name: 'Matériel', description: 'Micros, enceintes, interfaces audio...', slug: 'materiel', icon: 'speaker' },
    { name: 'Mixage & Mastering', description: 'Conseils et astuces de mixage', slug: 'mixage-mastering', icon: 'sliders' },
    { name: 'Productions', description: 'Partagez vos créations et obtenez des retours', slug: 'productions', icon: 'music' },
    { name: 'Studios', description: 'Discussions sur les studios et réservations', slug: 'studios', icon: 'building' },
  ];

  for (const cat of categories) {
    await prisma.forumCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log('✅ Catégories forum créées');

  console.log('🎉 Seeding terminé avec succès!');
  console.log('');
  console.log('📋 Identifiants de connexion:');
  console.log('   Artiste: demo@studiolib.fr / demo123');
  console.log('   Studio:  studio@studiolib.fr / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
