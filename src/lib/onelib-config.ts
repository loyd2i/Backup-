// Constantes Onelib partagées client/serveur (aucune dépendance Prisma ici,
// contrairement à src/lib/onelib.ts, pour rester importable côté client).

// Forfait de distribution par sortie (modèle TuneCore), débité à la demande.
// Voir BUSINESS-PLAN.md : pas de forfait illimité tant que le traitement
// reste manuel, chaque sortie a un vrai coût de traitement pour l'équipe.
export const ONELIB_DISTRIBUTION_FEE = 50;

// Aperçu "streaming" normalisé (30s, A/B) : mise à niveau de loudness +
// anti-écrêtage, calculée et rendue immédiatement côté client (pas de
// traitement manuel), d'où un tarif nettement inférieur à la distribution.
export const ONELIB_NORMALIZATION_FEE = 4;
