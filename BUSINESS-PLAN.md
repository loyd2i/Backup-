# Studiolib - Modèle économique

Document de travail réunissant les décisions de monétisation discutées. À affiner et mettre à jour au fil de l'avancement.

## Positionnement

Plateforme indépendante des labels majors : pas de gatekeeping, pas de comité de sélection, les mêmes outils pour un home studio ou une structure établie. Référence : Bandcamp (artiste garde le contrôle et la majorité de ses revenus, pas d'algorithme qui favorise les gros catalogues).

## Réservations classiques (studio physique)

- Commission plateforme existante : **3%** côté studio
- Commission artiste (nouvelle) : **< 5%** par réservation, côté artiste
- Taux de prise combiné : ~8%
- Politique d'annulation pour la commission artiste :
  - Annulation par l'artiste > 24-48h avant la session → commission remboursée intégralement
  - Annulation tardive (< 24h) par l'artiste → commission conservée (le studio ne peut plus revendre le créneau)
  - Annulation par le studio → commission systématiquement remboursée à l'artiste, quel que soit le délai

## E-Studio (sessions à distance)

- Passe par le même circuit de réservation que les sessions physiques (Appointment existant), pas de système de paiement séparé à construire
- Commission plateforme : **15%** côté studio (vs 3% pour une réservation physique classique — justifié par le coût d'infra réel des sessions à distance)
- Commission artiste : idem réservations classiques, < 5%
- Taux de prise combiné : ~20%
- Point à trancher : tarif E-Studio dédié par studio, ou même `pricePerHour` que les sessions physiques ?

## Abonnement studio

- Prix cible : **~10-12€/mois** (niveau abonnement Spotify), engagement annuel
- S'ajoute à la commission (ne la remplace pas)
- Rôle réel : filtre d'engagement + plancher de revenu prévisible, pas le moteur principal de rentabilité (il faut du volume — des centaines de studios — avant que cette ligne pèse vraiment)
- Suggestion pour faciliter l'adoption initiale : prix d'appel réduit le temps de prouver la valeur, ou option mensuelle sans engagement à prix plus élevé vs annuel à prix réduit (le studio choisit), plutôt que d'imposer l'annuel dès le premier contact

## Onelib (distribution musicale)

- Modèle : **forfait fixe**, pas un pourcentage sur les royalties de streaming (éviterait de devoir suivre les revenus réels des DSP, infra que la plateforme n'a pas)
- Deux options de forfait à trancher :
  - ~20-25€/an pour une distribution illimitée (modèle DistroKid) — adapté à un artiste qui sort plusieurs titres par an
  - ~50€ par sortie (modèle TuneCore) — adapté à un artiste qui sort rarement
- Vision long terme : évolution vers une plateforme de streaming, par étapes :
  1. Court terme : lecteur public sur la page artiste existante (`/artiste/[id]`), tracks écoutables publiquement façon "SoundCloud personnel" — infra déjà en partie présente, faible risque
  2. Moyen terme (une fois une vraie audience d'auditeurs) : pages de découverte publiques, compteurs d'écoute, playlists
  3. Long terme (avec financement réel) : streaming compétitif avec licences et catalogue tiers — nécessite des accords de licence, hors de portée sans financement dédié
- Ne jamais communiquer "plateforme de streaming" avant l'étape 2-3, pour ne pas créer d'attentes/responsabilités légales que l'infra actuelle ne peut pas tenir

## Répartition des royalties (split sheets) et réputation

- Vision : parité de royalties entre tous les contributeurs d'un morceau (ingénieur du son, compositeur, artiste), pas une relation unilatérale prestation-studio unique
- Précédents industrie : Auddly, Splits
- Bénéfice produit : un ingé son avec un pourcentage sur un morceau qui réussit a un intérêt direct au succès du morceau, et son crédit public devient un vrai portfolio vérifiable (relié aux fiches studio/artiste existantes)
- Étapes :
  1. Court terme : formaliser l'accord de répartition au moment de la distribution Onelib, afficher le crédit publiquement sur la fiche du morceau et le profil du contributeur (pas de mouvement d'argent automatique)
  2. Long terme : répartition automatique des royalties réelles via Stripe Connect (split de paiement natif), possible seulement une fois qu'Onelib collecte directement l'argent (donc lié à l'avancement de la vision streaming ci-dessus)

## Points gamifiés

- Représentation ludique des gains réels de streaming ("tu as gagné 1 240 points ce mois-ci"), à la manière des Bits Twitch ou de l'XP Duolingo
- Règle impérative : les points ne doivent **jamais** être échangeables entre utilisateurs ni convertibles en cash par un tiers → sinon la plateforme tombe sous la réglementation e-money (agrément obligatoire, coûteux et long à obtenir)
- Tant que les points restent un simple affichage/habillage sur de l'argent réel qui circule normalement (virement/Stripe), aucune contrainte réglementaire
- Peut se coupler à des paliers/badges/classements qui renforcent la réputation (ex: "Artiste Or" selon le cumul)

## Publicité

- Priorité aux **partenariats directs** avec des marques du monde musical (instruments, plugins/DAW, écoles de musique, disquaires, festivals) plutôt qu'à la pub programmatique (Google AdSense) :
  - Programmatique : ~1-5€/1000 vues, nécessite un très gros volume de trafic pour représenter un revenu significatif
  - Partenariat direct : forfait mensuel fixe (~50-300€/mois par partenaire), rentable même avec un trafic modeste tant que l'audience est qualifiée (utilisateurs avec intention d'achat musique claire)
- Emplacements : deux bannières latérales (gauche/droite) sur les pages publiques (forum, accueil)
- Démarrage progressif : un tarif "partenaire fondateur" réduit pour les 2-3 premiers partenaires, ne pas saturer le site de pub dès le lancement (garder la crédibilité pour les premiers utilisateurs)
- Revenu à considérer comme un second étage une fois la base d'utilisateurs installée, pas comme un revenu de démarrage

## Infrastructure et coûts tiers

Hébergement sur serveur cloud personnel (à la maison) plutôt que sur un hébergeur cloud payant — réduit fortement les coûts d'hébergement/base de données, mais points de vigilance :
- Passer par Cloudflare (gratuit) en reverse proxy devant le serveur, pour la protection/CDN et ne pas exposer l'IP réelle
- Sauvegardes régulières de la base de données hébergées ailleurs (ex: Cloudflare R2, quelques centimes/mois), en assurance contre une panne matérielle locale

Coûts tiers restants, hors hébergement/BDD auto-hébergés (estimation petit volume) :
| Poste | Fournisseur suggéré | Coût mensuel |
|---|---|---|
| E-mails transactionnels | Resend | 0-20€ |
| Domaine | — | ~1€ |
| Monitoring erreurs (optionnel) | Sentry | 0€ (free tier) |
| Stockage fichiers (si non auto-hébergé) | Cloudflare R2 | 1-10€ |

Hors coût fixe mensuel :
- **Stripe** : ~1,5-3% par transaction, proportionnel au volume de paiements traités, pas un coût fixe
- **Vidéo E-Studio réelle** (si implémentée un jour — actuellement non fonctionnelle, marquée "Bientôt disponible") : LiveKit Cloud ~50-150€/mois selon usage, ou LiveKit auto-hébergé ~20-40€/mois. Poste à reporter tant qu'il n'y a pas de demande claire pour de la vidéo réelle.
