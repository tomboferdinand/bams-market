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
| Retraits réels vers Mobile Money non branchés | Seul le retrait simulé est exploité (calcul des frais, débit, annulation en cas d'échec, e-mail de confirmation). Le retrait réel via GoalPay est à raccorder et à tester. |
| Pas d'e-mail à chaque changement de statut de commande | Le client suit sa commande dans « Mes commandes ». Les e-mails existants concernent le compte (vérification, mot de passe, activation de rôle), les retraits et le changement de numéro de retrait. |
| Pas d'annulation après paiement ni de circuit « rupture de stock imprévue » | Traités manuellement par contact avec l'administration. |
| Pas de réconciliation automatique des paiements | Les anomalies (paiement tardif, montant différent) sont journalisées pour traitement. |
| Livraison limitée à Fianarantsoa | Périmètre volontaire du MVP. |

## 3. Perspectives

1. **Mise en production** : hébergement, nom de domaine, HTTPS, webhook public GoalPay, sauvegardes automatiques de la base.
2. **Argent** : remboursement automatique via la passerelle, réconciliation quotidienne des paiements.
3. **Comptes** : demande de changement de numéro dans l'application, blocage de l'accès tant que l'e-mail n'est pas vérifié, invalidation des sessions après changement de mot de passe.
4. **Expérience** : notifications dans l'application et par SMS, avis et évaluations, statistiques détaillées pour le commerçant.
5. **Croissance** : autres moyens de paiement, paiement à la livraison, application mobile, optimisation des tournées de livraison.
6. **Recherche (master)** : recommandations de produits et détection de comportements anormaux à partir des données de commandes.
