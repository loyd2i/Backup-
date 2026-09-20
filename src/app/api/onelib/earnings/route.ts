import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getOnelibEarningsForUser } from '@/lib/onelib-earnings';

// GET - Part de l'utilisateur dans la cagnotte de dons Onelib (voir
// BUSINESS-PLAN.md "Onelib streaming") : total du pot, ses gains estimés,
// et le détail par morceau (en tant qu'artiste et/ou collaborateur crédité).
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const earnings = await getOnelibEarningsForUser(user.id);
    return NextResponse.json(earnings);
  } catch (error) {
    console.error('Erreur calcul des gains Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
