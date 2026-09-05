import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// N'autorise que http(s) : ces champs sont rendus tels quels en href sur la
// fiche artiste publique - un schéma comme javascript: y exécuterait du code
// arbitraire chez tout visiteur cliquant le lien.
function isSafeHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    return NextResponse.json({ user: null });
  }
}

// PUT - Mettre à jour le profil (nom, téléphone, fiche publique artiste)
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, bio, city, genre, instagram, spotify, soundcloud, youtube, website } = body;

    for (const [field, value] of Object.entries({ spotify, soundcloud, youtube, website })) {
      if (value && !isSafeHttpUrl(value)) {
        return NextResponse.json({ error: `Lien ${field} invalide (http/https requis)` }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(genre !== undefined ? { genre } : {}),
        ...(instagram !== undefined ? { instagram } : {}),
        ...(spotify !== undefined ? { spotify } : {}),
        ...(soundcloud !== undefined ? { soundcloud } : {}),
        ...(youtube !== undefined ? { youtube } : {}),
        ...(website !== undefined ? { website } : {}),
      }
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        phone: updated.phone,
        avatar: updated.avatar,
        bio: updated.bio,
        city: updated.city,
        genre: updated.genre,
        instagram: updated.instagram,
        spotify: updated.spotify,
        soundcloud: updated.soundcloud,
        youtube: updated.youtube,
        website: updated.website,
      }
    });
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
