// Constantes Onelib partagées client/serveur (aucune dépendance Prisma ici,
// contrairement à src/lib/onelib.ts, pour rester importable côté client).

// Forfait de distribution par sortie (modèle TuneCore), débité à la demande.
// Voir BUSINESS-PLAN.md : pas de forfait illimité tant que le traitement
// reste manuel, chaque sortie a un vrai coût de traitement pour l'équipe.
export const ONELIB_DISTRIBUTION_FEE = 50;
