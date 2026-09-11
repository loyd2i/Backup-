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
- Commission plateforme : **3%** côté studio, identique à la réservation physique classique (pas de taux majoré — un taux plus élevé risquerait de freiner l'adoption par les studios sur cette nouvelle fonctionnalité)
- Commission artiste : idem réservations classiques, < 5%
- Taux de prise combiné : ~8%, identique aux réservations classiques
- Tarif : **champ dédié par studio** (distinct du `pricePerHour` physique), pré-rempli avec la valeur du `pricePerHour` par défaut pour ne pas ajouter de friction, mais modifiable — une session à distance n'a pas la même structure de coûts (pas de salle occupée, pas d'usure matériel) qu'une session physique, un studio doit pouvoir différencier

## Abonnement studio

- Prix : **15€/mois**, engagement annuel **obligatoire** (relevé depuis la cible initiale ~10-12€, jugée pas assez rentable)
- Un seul forfait : l'option mensuelle sans engagement a été retirée — l'engagement à l'année est imposé dès le premier contact, pas de choix laissé au studio
- S'ajoute à la commission (ne la remplace pas)
- Rôle réel : filtre d'engagement + plancher de revenu prévisible, pas le moteur principal de rentabilité (il faut du volume — des centaines de studios — avant que cette ligne pèse vraiment)

## Onelib (distribution musicale)

- Modèle : **forfait fixe**, pas un pourcentage sur les royalties de streaming (éviterait de devoir suivre les revenus réels des DSP, infra que la plateforme n'a pas)
- Tarif : **~50€ par sortie** (modèle TuneCore), pas un forfait illimité — le processus de distribution actuel est manuel ("une personne traite ta demande manuellement", déjà annoncé dans l'app), donc chaque sortie a un vrai coût de traitement pour l'équipe. Un forfait illimité exposerait à un artiste prolifique qui rapporte 20-25€/an pour de nombreux traitements manuels, la marge s'effondrerait exactement quand la charge de travail augmente. Un forfait illimité redeviendra pertinent comme option premium une fois le processus automatisé, pas avant.
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
- **Implémenté (étape 1 uniquement)** : part de répartition (%) et liaison optionnelle vers un compte Studiolib existant (artiste ou studio) sur chaque collaborateur crédité. La répartition se verrouille automatiquement à la demande de distribution (plus aucune modification possible ensuite), formalisant l'accord au bon moment. Le crédit (rôle + %) s'affiche publiquement sur la fiche du morceau/album et, si un profil est lié, sur la page publique de l'artiste ou du studio concerné ("Crédits"). Aucun mouvement d'argent — l'étape 2 (Stripe Connect) reste conditionnée à la vision streaming long terme.

## Points gamifiés

- Représentation ludique d'argent réel qui circule déjà sur la plateforme, à la manière des Bits Twitch ou de l'XP Duolingo
- Règle impérative : les points ne doivent **jamais** être échangeables entre utilisateurs ni convertibles en cash par un tiers → sinon la plateforme tombe sous la réglementation e-money (agrément obligatoire, coûteux et long à obtenir)
- Tant que les points restent un simple affichage/habillage sur de l'argent réel qui circule normalement (virement/Stripe), aucune contrainte réglementaire
- Peut se coupler à des paliers/badges/classements qui renforcent la réputation (ex: "Artiste Or" selon le cumul)
- **Implémenté** : adossés aux frais de service déjà payés par l'artiste (non remboursés) sur les réservations, et non aux gains de streaming — il n'existe pas encore de vrai revenu de streaming distribué (Onelib reste une distribution/smart link, pas un partage de royalties réel), donc afficher des "gains" aurait été fictif. Reste cohérent avec la règle e-money : uniquement un affichage calculé à la volée, aucun solde stocké ni transférable. À reconsidérer une fois le partage réel de royalties (split sheets, étape long terme) en place.

## Publicité

- Priorité aux **partenariats directs** avec des marques du monde musical (instruments, plugins/DAW, écoles de musique, disquaires, festivals) plutôt qu'à la pub programmatique (Google AdSense) :
  - Programmatique : ~1-5€/1000 vues, nécessite un très gros volume de trafic pour représenter un revenu significatif
  - Partenariat direct : forfait mensuel fixe (~50-300€/mois par partenaire), rentable même avec un trafic modeste tant que l'audience est qualifiée (utilisateurs avec intention d'achat musique claire)
- Emplacements : deux bannières latérales (gauche/droite) sur les pages publiques (forum, accueil)
- Démarrage progressif : un tarif "partenaire fondateur" réduit pour les 2-3 premiers partenaires, ne pas saturer le site de pub dès le lancement (garder la crédibilité pour les premiers utilisateurs)
- Revenu à considérer comme un second étage une fois la base d'utilisateurs installée, pas comme un revenu de démarrage

## Confiance et sécurité

- **Assurance matériel : responsabilité individuelle, pas un produit plateforme.** Chaque partie (studio, artiste) assure son propre matériel via son statut (auto-entreprise, société) — la plateforme ne propose pas de dépôt de garantie généraliste. Exception : un studio qui loue ses locaux pour des séminaires peut demander un dépôt de garantie de son propre chef, géré indépendamment (hors périmètre plateforme, facultatif).
- **Résolution de litiges** : la plateforme fournit la preuve de l'heure exacte à laquelle la session a eu lieu (déjà disponible via l'horodatage de l'Appointment), et un moyen de **signaler un problème** sur une session terminée — canal de signalement simple, traité manuellement par l'équipe au démarrage (pas d'arbitrage automatisé). S'appuie sur les avis croisés déjà en place comme premier niveau de signal, le signalement formel intervenant au-delà d'un simple avis négatif. Pas encore implémenté.

## Croissance et rétention

Idées identifiées comme complémentaires à ce qui existait déjà, mécaniques tranchées. Toutes implémentées.

- **Liste d'attente sur annulation** : à l'annulation d'un créneau confirmé, notifie automatiquement les artistes ayant manifesté un intérêt pour ce studio/créneau (réutilise le système de notifications existant). Récupère du chiffre d'affaires que les studios perdaient sinon sur les annulations tardives. **Implémenté.**
- **Packs d'heures prépayées, figés par studio** : l'artiste achète un lot d'heures à tarif réduit chez **un studio précis** (pas un crédit multi-studio) — carte de fidélité classique par enseigne. Entrée de trésorerie immédiate pour ce studio, complète le système de points fidélité déjà en place (plus de dépense réelle trackée = plus de points). **Implémenté** : réservation payable directement avec un pack, sans nouvelle pré-autorisation ; heures remboursées en cas d'annulation.
- **Tarification heures creuses, au cas par cas** : le studio applique une remise ponctuelle sur un créneau précis resté invendu (pas une règle récurrente automatique par jour/horaire). Gagnant-gagnant : le studio rentabilise un temps mort, l'artiste paie moins cher — la commission plateforme reste un pourcentage, donc personne n'y perd. **Implémenté** : la réduction est consommée dès qu'un artiste réserve avec.
- **Marketplace de sample packs / instrus entre artistes** (via Onelib) : commission plateforme **~4%**, alignée sur le taux des réservations plutôt que sur le standard du secteur (~10% façon Splice) — cohérent avec le positionnement "l'artiste garde le contrôle et la majorité de ses revenus" déjà affiché dans ce document. **Implémenté** : publication d'un article (upload audio), achat simulé débité/crédité immédiatement au vendeur, accès permanent en écoute/téléchargement pour l'acheteur.
- **Parrainage** : avantage (mois d'abonnement offert côté studio, points bonus côté artiste) pour qui amène un nouveau studio/artiste actif sur la plateforme. Coût quasi nul à mettre en place, levier de croissance classique et éprouvé. **Implémenté** : la récompense n'est accordée qu'à la première session menée à terme par le filleul (signal "actif", pas la simple inscription) — un mois d'abonnement offert si le parrain est un studio (dès qu'il a un abonnement actif à prolonger), des points bonus s'il est artiste (mêmes règles de non-transférabilité que les points fidélité).

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
