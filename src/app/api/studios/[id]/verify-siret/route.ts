import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface Etablissement {
  siret: string;
  adresse: string | null;
  etat_administratif: string;
}

interface EntrepriseResult {
  nom_raison_sociale: string | null;
  etat_administratif: string;
  tva?: string[] | null;
  complements?: { est_entrepreneur_individuel?: boolean } | null;
  matching_etablissements: Etablissement[];
}

// GET - Vérifie un SIRET auprès de la base officielle des entreprises
// (recherche-entreprises.api.gouv.fr, API publique du gouvernement français,
// gratuite et sans clé). Sert uniquement à confirmer qu'un studio est un
// établissement réel et actif - aucune donnée n'est appliquée automatiquement
// au formulaire, le studio garde la main.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const studio = await prisma.studio.findFirst({ where: { id, ownerId: user.id } });
    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const siret = searchParams.get('siret') || '';

    if (!/^\d{14}$/.test(siret)) {
      return NextResponse.json({ error: 'SIRET invalide (14 chiffres attendus)' }, { status: 400 });
    }

    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ found: false, error: 'Service de vérification indisponible' });
    }

    const data = await res.json();
    const results: EntrepriseResult[] = data.results || [];

    for (const entreprise of results) {
      const etablissement = entreprise.matching_etablissements?.find((e) => e.siret === siret);
      if (!etablissement) continue;

      return NextResponse.json({
        found: true,
        active: entreprise.etat_administratif === 'A' && etablissement.etat_administratif === 'A',
        legalName: entreprise.nom_raison_sociale,
        address: etablissement.adresse,
        vatNumber: entreprise.tva?.[0] || null,
        isIndividualEntrepreneur: entreprise.complements?.est_entrepreneur_individuel || false,
      });
    }

    return NextResponse.json({ found: false });
  } catch (error) {
    console.error('Erreur vérification SIRET:', error);
    return NextResponse.json({ found: false, error: 'Service de vérification indisponible' });
  }
}
