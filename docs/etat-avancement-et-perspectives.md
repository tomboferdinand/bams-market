# État d'avancement et perspectives — Bam'S Market

*Novembre 2026 — complément du cahier des charges (règles métier v1.1, cas d'utilisation v1.1, backlog v1.1).*

## 1. Ce qui est réalisé

Le MVP couvre tout le parcours, de la commande au paiement des acteurs :

- **Comptes et rôles** : inscription client, vérification d'e-mail, mot de passe oublié, verrouillage après échecs, demandes de rôle (commerçant, livreur) approuvées par l'administrateur et activées par e-mail.
- **Catalogue** : boutiques validées, produits, catégories, recherche, filtres, photos ; produits masqués si la boutique ou le commerçant est inactif.
- **Commandes** : panier d'une seule boutique, stock réservé de façon atomique, annulation avant paiement, expiration automatique, historique des statuts.
- **Paiement** : GoalPay et mode simulation, contrôle du montant, commission de 10 %, gestion des paiements expirés ou en double.
- **Livraison** : missions, limite de missions actives, code de confirmation à 6 chiffres, blocage après codes erronés, déclaration « livraison impossible ».
- **Argent** : portefeuille en livre de comptes, retraits Mobile Money (frais à la charge du bénéficiaire), numéro de retrait verrouillé, remboursement manuel enregistré une seule fois.
- **Administration** : validation des boutiques, utilisateurs, demandes de rôle, catégories, commandes, paiements, retraits, journal d'audit.
- **Qualité** : plus de 280 tests backend et plus de 160 tests frontend, parcours de bout en bout (Jest, Vitest, Playwright).

## 2. Limites connues du MVP

| Limite | Pourquoi / comment elle est gérée |
|---|---|
| Le remboursement d'un client est manuel | L'administrateur fait le transfert Mobile Money, puis l'enregistre (référence, date, auteur). Le système empêche le double remboursement. |
| Le changement de numéro de retrait passe par l'administration | Choix de sécurité : un numéro volé ne peut pas être modifié par un intrus. Une demande de changement dans l'application est prévue. |
| Un compte non vérifié peut parcourir le site | Il ne peut ni commander, ni payer, ni retirer. Le blocage complet de l'accès est prévu. |
| Paiements réels GoalPay peu testés | Le mode simulation couvre la démonstration ; un test réel avec montant minimum reste à faire avant ouverture. |
| Retraits réels vers Mobile Money pas encore essayés en conditions réelles | Le retrait réel via l'API GoalPay (liste blanche, frais réels, webhook, rattrapage par statut) est codé et testé avec un faux client GoalPay ; il s'active avec PAYOUT_MODE=goalpay et revient à la simulation en changeant cette seule variable. Un premier essai réel à petit montant reste à faire. |
| Pas d'e-mail à chaque changement de statut de commande | Le client suit sa commande dans « Mes commandes ». Les e-mails existants concernent le compte (vérification, mot de passe, activation de rôle), les retraits et le changement de numéro de retrait. |
| Pas d'annulation après paiement ni de circuit « rupture de stock imprévue » | Traités manuellement par contact avec l'administration. |
| Pas de réconciliation automatique des paiements | Les anomalies (paiement tardif, montant différent) sont journalisées pour traitement. |
| Livraison limitée à Fianarantsoa | Périmètre volontaire du MVP. |
| Remise et retour du colis non confirmés par le commerçant | Le livreur est validé par l'administrateur et n'est payé que sur le code du client. Détail et perspectives : voir la section 4. |

## 3. Perspectives

1. **Mise en production** : hébergement, nom de domaine, HTTPS, webhook public GoalPay, sauvegardes automatiques de la base.
2. **Argent** : remboursement automatique via la passerelle, réconciliation quotidienne des paiements.
3. **Comptes** : demande de changement de numéro dans l'application, blocage de l'accès tant que l'e-mail n'est pas vérifié, invalidation des sessions après changement de mot de passe.
4. **Expérience** : notifications dans l'application et par SMS, avis et évaluations, statistiques détaillées pour le commerçant.
5. **Croissance** : autres moyens de paiement, paiement à la livraison, application mobile, optimisation des tournées de livraison.
6. **Recherche (master)** : recommandations de produits et détection de comportements anormaux à partir des données de commandes.

## 4. Sécurité de la livraison : limites connues et perspectives

### Ce sur quoi s'appuie la V1

- **Livreur validé par l'administrateur** : on ne devient livreur qu'après une demande approuvée par l'administration, puis activée par un lien envoyé par e-mail. Un compte livreur peut être suspendu à tout moment.
- **Paiement du livreur seulement sur le code du client** : le livreur n'est crédité (frais de livraison) et le commerçant n'est crédité (sous-total moins la commission) que lorsque le livreur saisit le **code à 6 chiffres** que seul le client connaît. Après 5 codes erronés, la mission est bloquée. Une livraison déclarée impossible ne crédite personne.
- **Journal d'activité** : l'acceptation de la mission, la livraison, l'échec et le remboursement sont enregistrés avec leur auteur et leur date.
- **Remboursement manuel enregistré par l'administrateur** : après une livraison échouée, l'administrateur rembourse le client par Mobile Money puis enregistre le remboursement (référence, auteur, date). Le système en refuse un second pour la même commande.
- **Coordonnées du client limitées** : le livreur ne voit le téléphone et l'adresse exacte du client que pendant une livraison qu'il a acceptée ; ni avant (missions disponibles), ni après (historique). Le commerçant voit le prénom et le nom du livreur assigné, sans ses coordonnées.

### Limites connues

- La **remise du colis** au livreur n'est pas confirmée par le commerçant : la commande passe « En cours de livraison » dès que le livreur accepte la mission, avant d'avoir récupéré le colis.
- Après un **échec de livraison**, le stock est restitué automatiquement, sans que le commerçant confirme avoir récupéré le colis.
- Rien ne repère un livreur qui déclare des échecs à répétition.
- La déclaration d'un échec ne demande ni motif ni preuve.

### Perspectives

1. **Confirmation de remise du colis** : le commerçant remet le colis contre un code (affiché au livreur, saisi par le commerçant, ou l'inverse). La commande ne passe « En cours de livraison » qu'à ce moment.
2. **Confirmation du retour après un échec** : la commande reste « Retour en attente » tant que le commerçant n'a pas confirmé avoir récupéré le colis ; le stock n'est restitué qu'à ce moment, et l'administrateur est alerté si le retour tarde.
3. **Suivi du taux d'échec par livreur** : indicateur dans l'administration et suspension automatique au-delà d'un seuil (par exemple trois échecs sur dix missions), levée par l'administrateur après vérification.
4. **Motif obligatoire et photo** pour déclarer un échec (client absent, adresse introuvable, refus du colis), visibles par l'administrateur et le commerçant.
5. **Mesures hors logiciel** : contrat signé avec chaque livreur, caution déposée à l'inscription, plafond de valeur par mission (une commande au-delà du plafond est réservée aux livreurs expérimentés ou livrée par le commerçant).
