import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hash, compare } from 'bcryptjs';

const prisma = new PrismaClient();

// Inscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name, phone, role } = body;

    if (action === 'register') {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        );
      }

      // Hasher le mot de passe
      const hashedPassword = await hash(password, 10);

      // Créer l'utilisateur
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: role || 'artiste',
        },
      });

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      });
    }

    if (action === 'login') {
      // Trouver l'utilisateur
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Email ou mot de passe incorrect' },
          { status: 401 }
        );
      }

      // Vérifier le mot de passe
      const isValid = await compare(password, user.password);

      if (!isValid) {
        return NextResponse.json(
          { error: 'Email ou mot de passe incorrect' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      });
    }

    return NextResponse.json({ error: 'Action non valide' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
