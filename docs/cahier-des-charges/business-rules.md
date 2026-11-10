# Business Rules (Règles Métier) — Bam'S Market

> **Version 1.1 — novembre 2026.** Mise à jour après la réalisation du MVP : les règles de la version 1.0 sont conservées ; celles qui ont été précisées sont marquées *(précisée en v1.1)* et les nouvelles règles *(nouvelle en v1.1)*. Voir le chapitre 10 pour la liste des changements.

## Portée

Les règles métier décrites dans ce document sont indépendantes des choix techniques d'implémentation.

Elles constituent la référence fonctionnelle de Bam'S Market et devront être respectées par l'ensemble des composants du système (interface utilisateur, API, base de données et services métiers).

Toute évolution fonctionnelle devra être conforme à ces règles ou faire l'objet d'une révision du présent document.

## 1. Introduction & Nomenclature

Ce document définit les règles métier incontournables (*Business Rules*) encadrant le fonctionnement fonctionnel, la cohérence des données et la sécurité des opérations sur la plateforme **Bam'S Market**. 

Chaque règle est identifiée par un code unique sous la forme `BR-[DOMAINE]-[NUMÉRO]` :
- **BR-USR** : Gestion des utilisateurs & accès
- **BR-ROL** : Demandes de rôle (commerçant, livreur)
- **BR-BQT** : Gestion des boutiques & commerçants
- **BR-PRD** : Gestion des produits & stocks
- **BR-CMD** : Gestion des commandes & cycles de vie
- **BR-PAY** : Gestion des paiements & transactions
- **BR-WAL** : Portefeuille et retraits
- **BR-REF** : Remboursements
- **BR-LIV** : Gestion de la logistique & livraisons
- **BR-SEC** : Sécurité, confidentialité & intégrité des données

---

## 2. Gestion des utilisateurs & accès (BR-USR)

- **BR-USR-01 (Unicité des identifiants) :** Un compte utilisateur doit être associé à une adresse e-mail unique et/ou un numéro de téléphone unique sur la plateforme.
- **BR-USR-02 (Format des numéros) :** Tout numéro de téléphone enregistré doit suivre le format international ou le format national valide à Madagascar (ex: `+26134XXXXXXX`, `032XXXXXXX`, `034XXXXXXX`, `038XXXXXXX`, `033XXXXXXX`).
- **BR-USR-03 (Sécurité des mots de passe) :** Le mot de passe doit comporter au minimum 8 caractères et inclure au moins une lettre majuscule, une lettre minuscule et un chiffre. Il ne doit jamais être stocké en clair.
- **BR-USR-04 (Rôles & Cloisonnement) :** Un utilisateur possède un rôle principal parmi : `CLIENT`, `COMMERÇANT`, `LIVREUR`, `ADMINISTRATEUR`. Les permissions d'accès aux API et interfaces sont strictement restreintes par le rôle actif. *(précisée en v1.1 : l'inscription publique crée toujours un `CLIENT` ; les rôles `COMMERÇANT` et `LIVREUR` s'obtiennent uniquement par une demande de rôle approuvée (chapitre 3) ; le compte `ADMINISTRATEUR` est créé par un script d'administration, jamais depuis l'interface publique.)*
- **BR-USR-05 (Désactivation de compte) :** Un compte désactivé ou suspendu par l'administrateur ne peut plus se connecter ni effectuer d'actions sur la plateforme tant qu'il n'est pas réactivé.
- **BR-USR-06 (Vérification du compte, précisée en v1.1) :** Un compte nouvellement créé est `NON_VERIFIE` tant que le lien de vérification envoyé par e-mail n'a pas été ouvert. Un compte non vérifié peut parcourir le catalogue mais ne peut pas commander, payer, retirer de l'argent ni déposer une demande de rôle.

- **BR-USR-07 (Suppression de compte) :** La suppression physique d'un utilisateur est interdite si celui-ci possède un historique de commandes ou de transactions. Le compte est désactivé afin de préserver l'intégrité des données.
- **BR-USR-08 (Protection des connexions, nouvelle en v1.1) :** Après un nombre configurable d'échecs de connexion consécutifs (5 par défaut), le compte est verrouillé temporairement (15 minutes par défaut). Les routes sensibles (connexion, inscription, mot de passe oublié) sont limitées en fréquence.
- **BR-USR-09 (Mot de passe oublié, nouvelle en v1.1) :** La réinitialisation passe par un lien envoyé par e-mail, à usage unique, valable 1 heure. Seule l'empreinte du jeton est conservée en base.

---

## 2 bis. Demandes de rôle (BR-ROL) *(nouvelle section en v1.1)*

- **BR-ROL-01 (Demande) :** Un client dont l'e-mail est vérifié peut demander à devenir `COMMERÇANT` ou `LIVREUR`. Il indique le numéro Mobile Money sur lequel il recevra ses gains.
- **BR-ROL-02 (Décision de l'administrateur) :** Seul un administrateur approuve ou refuse la demande ; un refus est motivé. La décision est journalisée.
- **BR-ROL-03 (Activation par e-mail) :** L'approbation n'est pas immédiate : le rôle change seulement lorsque le demandeur ouvre le lien d'activation reçu par e-mail (usage unique, durée limitée). Cela prouve que l'adresse e-mail est bien la sienne.
- **BR-ROL-04 (Numéro de retrait verrouillé) :** Le numéro de retrait est enregistré à l'activation du rôle. Un numéro ne peut appartenir qu'à un seul compte. Il ne peut être modifié que par un administrateur, avec un motif obligatoire (5 caractères minimum) ; la modification est journalisée et le titulaire en est informé par e-mail.

---

## 3. Gestion des boutiques & commerçants (BR-BQT)

- **BR-BQT-01 (Workflow d'approbation) :** Toute nouvelle boutique créée par un commerçant est initialement au statut `EN_ATTENTE_VALIDATION`. Elle ne peut pas publier ni vendre de produits tant qu'elle n'est pas approuvée par un `ADMINISTRATEUR`.
- **BR-BQT-02 (Propriété unique) :** Dans la version MVP, un compte commerçant ne peut posséder qu'une seule boutique active à la fois.
- **BR-BQT-03 (Informations obligatoires) :** Une boutique doit obligatoirement comporter : un nom commercial, une description, une adresse physique à Fianarantsoa, un numéro de contact direct et un logo.
- **BR-BQT-04 (Fermeture / Suspension) :** Si une boutique est marquée comme `SUSPENDUE` ou `INACTIVE`, l'ensemble de ses produits est immédiatement retiré de la visibilité publique du catalogue. *(précisée en v1.1 : il en va de même lorsque le compte du commerçant est suspendu ou désactivé ; dans ce cas, ses produits ne sont plus affichés, ne peuvent plus être ajoutés au panier et la commande est refusée côté serveur.)*
- BR-BQT-05 (Responsabilité du commerçant) :
Le commerçant est responsable de l'exactitude des informations publiées concernant ses produits (prix, description, disponibilité et stock).
---

## 4. Gestion des produits & stocks (BR-PRD)

- **BR-PRD-01 (Appartenance au catalogue) :** Tout produit doit être impérativement rattaché à une boutique au statut `VALIDÉE` et à une catégorie de produits existante.
- **BR-PRD-02 (Intégrité des prix) :** Le prix d'un produit doit être un montant strictement positif (> 0) exprimé en Ariary (MGA).
- **BR-PRD-03 (Gestion stricte des stocks) :** 
  - La quantité en stock doit être un entier supérieur ou égal à zéro ($\ge 0$).
  - Si le stock atteint `0`, le produit passe automatiquement au statut `RUPTURE_DE_STOCK` et le bouton d'ajout au panier est désactivé.
- **BR-PRD-04 (Réservation de stock) :** Lors de la validation d'un panier et de l'initiation du paiement par le client, les quantités commandées sont temporairement réservées pour une durée configurable par l'administrateur de la plateforme. Si le paiement échoue ou expire, la réservation est annulée et le stock est restitué. *(précisée en v1.1 : le stock est réservé dès la création de la commande, dans la même transaction, de façon atomique pour éviter que deux clients prennent le dernier exemplaire. Il est restitué à l'annulation, à l'expiration, et en cas de livraison échouée.)*
- **BR-PRD-05 (Suppression logique) :** Un produit ayant déjà fait l'objet d'au moins une commande ne peut pas être supprimé physiquement de la base de données. Il fait l'objet d'un archivage/désactivation logique (`is_active = false`).
- BR-PRD-06 (Modification de prix) :
Une modification du prix d'un produit n'affecte jamais les commandes déjà validées.

---

## 5. Gestion des commandes & cycle de vie (BR-CMD)

- **BR-CMD-01 (Montant minimum) :** Le sous-total d'une commande doit être supérieur ou égal à un montant minimal configurable (ex: 2 000 MGA).
- **BR-CMD-02 (Diagramme des états de commande) :** Une commande suit rigoureusement la machine à états suivante :
  `EN_ATTENTE_PAIEMENT` $\rightarrow$ `PAYÉE` $\rightarrow$ `EN_PRÉPARATION` $\rightarrow$ `EN_COURS_DE_LIVRAISON` $\rightarrow$ `LIVRÉE`.
  *(précisée en v1.1 : deux états terminaux hors parcours normal existent : `ANNULEE` (annulée par le client avant paiement) et `ECHOUEE` (paiement expiré, commande non payée expirée, ou livraison impossible).)*
- **BR-CMD-03 (Annulation de commande) :** 
  - Le client peut annuler une commande **uniquement** si elle est encore au statut `EN_ATTENTE_PAIEMENT`.
  - Une fois la commande au statut `PAYÉE` ou `EN_PRÉPARATION`, l'annulation nécessite l'accord du commerçant ou l'intervention de l'administrateur. *(précisée en v1.1 : dans le MVP, le client ne peut plus annuler lui-même après paiement ; il contacte l'administration. Un circuit d'annulation avec accord du commerçant est prévu après le MVP.)*
- **BR-CMD-04 (Immuabilité des commandes validées) :** Une fois le paiement confirmé, les articles, quantités, prix unitaires et frais de livraison associés à la commande ne peuvent plus être modifiés.
- **BR-CMD-05 (Numérotation des commandes) :** Chaque commande possède un identifiant unique généré automatiquement.
- **BR-CMD-06 (Historique des statuts) :** Chaque changement d'état d'une commande est historisé afin d'assurer sa traçabilité.
- **BR-CMD-07 (Une boutique par commande, nouvelle en v1.1) :** Le panier, donc la commande, ne concerne qu'une seule boutique. Ajouter le produit d'une autre boutique est refusé ; le contrôle est refait à la création de la commande.
- **BR-CMD-08 (Expiration des commandes non payées, nouvelle en v1.1) :** Une commande restée `EN_ATTENTE_PAIEMENT` sans paiement au-delà d'un délai configurable (30 minutes par défaut) passe automatiquement à `ECHOUEE` et son stock est restitué. Le client n'a donc pas besoin de l'annuler lui-même.
- **BR-CMD-09 (Visibilité pour le commerçant, nouvelle en v1.1) :** Le commerçant ne voit que les commandes payées (`PAYEE` et suivantes) concernant sa boutique ; il ne reçoit jamais le téléphone ni l'adresse exacte du client (BR-SEC-06).

---

## 6. Gestion des paiements & transactions (BR-PAY)

- **BR-PAY-01 (Canal exclusif MVP) :** Dans la version MVP, la finalisation de commande s'effectue exclusivement via la passerelle de paiement intégrée **GoalPay** (Mobile Money : MVola, Orange Money, Airtel Money).
- BR-PAY-02 (Confirmation de paiement) : Le système doit confirmer de manière fiable le résultat de la transaction auprès de la passerelle de paiement avant toute modification de l'état d'une commande. Toute confirmation de paiement doit être traitée de manière idempotente afin de garantir qu'une même transaction ne puisse être validée qu'une seule fois.
- **BR-PAY-03 (Délai d'expiration du paiement) :** Une transaction de paiement initiée dispose d'un délai limite de traitement (ex: 10 minutes). Au-delà, la transaction est marquée `EXPIRÉE` et la commande repasse en échec.
- **BR-PAY-04 (Calcul de la commission, précisée en v1.1) :** La commission de Bam'S Market est de **10 %** (configurable) du **sous-total** de la commande, hors frais de livraison. Le commerçant est crédité de *sous-total − commission*. La répartition est calculée et figée à la création de la commande ; elle n'est jamais montrée au client.
- **BR-PAY-05 (Unicité de la transaction) :** Une transaction de paiement ne peut être associée qu'à une seule commande.
- **BR-PAY-06 (Frais de la passerelle, nouvelle en v1.1) :** Les frais de la passerelle de paiement sont ajoutés au total payé par l'acheteur ; ils ne diminuent ni la part du commerçant ni celle de la plateforme.
- **BR-PAY-07 (Contrôle du montant, nouvelle en v1.1) :** Une confirmation de paiement dont le montant ou la devise diffère de celui attendu est refusée et signalée. Une confirmation reçue après expiration, ou pour une commande qui n'est plus payable, est journalisée comme anomalie à traiter.
- **BR-PAY-08 (Mode de démonstration, nouvelle en v1.1) :** Un mode « simulation » du paiement et du retrait permet de dérouler le parcours complet sans argent réel (démonstration, tests). Le mode réel utilise GoalPay.

---

## 6 bis. Portefeuille et retraits (BR-WAL) *(nouvelle section en v1.1)*

- **BR-WAL-01 (Livre de comptes) :** Le solde d'un commerçant ou d'un livreur est la somme de ses écritures. Une écriture n'est jamais modifiée ni supprimée.
- **BR-WAL-02 (Crédit unique) :** À la livraison confirmée, le commerçant est crédité de *sous-total − commission* et le livreur de la rémunération forfaitaire de livraison (2 000 MGA par défaut). Une même commande ne peut créditer deux fois la même personne.
- **BR-WAL-03 (Délai avant retrait) :** Un délai de séjour des fonds après livraison est configurable ; il est à 0 (retrait immédiat) dans le MVP.
- **BR-WAL-04 (Retrait) :** Un retrait va uniquement vers le numéro de retrait verrouillé du titulaire (BR-ROL-04). Le titulaire confirme avec son mot de passe ; après des erreurs répétées, la confirmation est bloquée temporairement. Des plafonds (montant minimum, maximum, par jour) s'appliquent.
- **BR-WAL-05 (Frais de retrait) :** Les frais du fournisseur de paiement sont à la charge du bénéficiaire et s'ajoutent au débit de son solde.
- **BR-WAL-06 (Retrait échoué) :** Si le fournisseur refuse le retrait, le débit est annulé par une écriture inverse, une seule fois.

---

## 6 ter. Remboursements (BR-REF) *(nouvelle section en v1.1)*

- **BR-REF-01 (Cas de remboursement) :** Seule une commande payée dont la livraison a échoué (client absent ou injoignable) peut être remboursée. Dans ce cas, ni le commerçant ni le livreur ne sont crédités.
- **BR-REF-02 (Remboursement manuel) :** Le remboursement est effectué par un administrateur, hors plateforme, par transfert Mobile Money. L'administrateur l'enregistre ensuite avec la référence de la transaction.
- **BR-REF-03 (Montant) :** Le montant remboursé est celui du paiement enregistré par le système, jamais un montant annoncé par le client.
- **BR-REF-04 (Une seule fois) :** Une commande ne peut être remboursée qu'une fois. L'enregistrement porte la date, l'administrateur et la référence ; le client voit « remboursé » sur sa commande.

---

## 7. Gestion de la logistique & livraisons (BR-LIV)

- **BR-LIV-01 (Zone géographique MVP) :** Le service de livraison est limité aux adresses situées dans le périmètre urbain et périmètre proche défini pour la ville de Fianarantsoa.
- **BR-LIV-02 (Attribution des livraisons) :** Une commande ne peut être attribuée qu'à un seul livreur validé à la fois.
- **BR-LIV-03 (Capacité du livreur) :** Un livreur ne peut pas prendre en charge plus de `N` courses simultanées (3 par défaut, configurable) afin de garantir les délais de remise.
- **BR-LIV-04 (Preuve de livraison) :** La transition d'une commande vers le statut `LIVRÉE` nécessite la validation d'un code de confirmation secret transmis au client lors de sa commande ou la validation de la remise sur l'interface du livreur.
- **BR-LIV-05 (Intégrité de livraison) :** Une commande ne peut être déclarée LIVRÉE que si elle est préalablement passée par l'état EN_COURS_DE_LIVRAISON.
- **BR-LIV-06 (Code de confirmation, précisée en v1.1) :** Le code à 6 chiffres est unique par commande et visible seulement du client propriétaire. Après un nombre limité de codes erronés (5 par défaut), la confirmation est bloquée.
- **BR-LIV-07 (Livraison impossible, nouvelle en v1.1) :** Le livreur peut déclarer la livraison impossible. La mission passe à `ECHEC`, la commande à `ECHOUEE` (historisée et journalisée), le stock est restitué, personne n'est crédité, et le remboursement du client suit BR-REF.

---

## 8. Sécurité & Intégrité des données (BR-SEC)

- **BR-SEC-01 (Traces d'audit) :** Toute modification de statut critique (changement d'état d'une commande, approbation d'une boutique, validation de paiement) doit être enregistrée dans un journal d'audit (`Audit Trail`) contenant l'identifiant de l'auteur, la date/heure et la valeur précédente/nouvelle.
- **BR-SEC-02 (Inviolabilité des montants) :** Le calcul du sous-total, des taxes et du total général d'une commande doit être réexécuté et contrôlé côté serveur. Les montants calculés côté client ne doivent jamais être faits au niveau du Front-end sans contrôle du Back-end.
- **BR-SEC-03 (Consultation restreinte) :** Un commerçant n'a accès qu'aux commandes et statistiques associées à sa propre boutique. Un client n'a accès qu'à son propre historique d'achats.
- **BR-SEC-04 (Confidentialité) :** Les données personnelles des utilisateurs ne peuvent être consultées que par les personnes autorisées conformément à leur rôle.
- **BR-SEC-05 (Journalisation des erreurs critiques) :** Toute erreur critique impactant une transaction financière ou une commande doit être enregistrée dans les journaux du système.
- **BR-SEC-06 (Anti-contournement, nouvelle en v1.1) :** Le commerçant ne reçoit jamais de coordonnée directe du client (téléphone, adresse exacte, nom complet). Le livreur reçoit les coordonnées complètes seulement après avoir accepté la mission. Les champs libres du commerçant (noms, descriptions) refusent les numéros de téléphone et adresses e-mail, pour empêcher de conclure la vente hors plateforme.
- **BR-SEC-07 (Authentification, nouvelle en v1.1) :** La session est un jeton stocké dans un cookie `httpOnly` ; les mots de passe sont hachés ; les secrets (clés, jetons) ne sont jamais écrits dans le code ni publiés dans le dépôt.
- **BR-SEC-08 (Idempotence et concurrence, nouvelle en v1.1) :** Les opérations financières (crédit, retrait, remboursement, restitution de stock) sont protégées contre le double traitement par des contraintes d'unicité et des transitions de statut atomiques.

# 9. Principes d'intégrité

Les règles suivantes s'appliquent à l'ensemble du système :

- Une commande appartient à un seul client.

- Un produit appartient à une seule boutique.

- Une boutique appartient à un seul commerçant.

- Une commande possède au moins une ligne de commande.

- Une transaction est liée à une seule commande.

- Un livreur ne peut être affecté qu'à une livraison active donnée.

- Un client ne peut consulter que ses propres commandes.

- Un commerçant ne peut gérer que les produits de sa boutique.

- Un administrateur possède un accès global à la plateforme.

---

# 10. Changements de la version 1.1

| Domaine | Changement |
|---|---|
| Comptes | E-mail vérifié obligatoire pour commander, payer, retirer, demander un rôle ; verrouillage après échecs ; mot de passe oublié |
| Rôles | Demande de rôle → approbation admin → activation par e-mail ; numéro de retrait verrouillé |
| Boutiques | Produits masqués et commande refusée si le commerçant est suspendu ou désactivé |
| Commandes | États `ANNULEE` et `ECHOUEE` ; une boutique par commande ; expiration automatique ; stock réservé de façon atomique |
| Paiement | Commission de 10 % sur le sous-total ; frais de passerelle à la charge de l'acheteur ; contrôle du montant ; mode simulation |
| Argent | Portefeuille (livre de comptes) et retraits vers Mobile Money |
| Livraison | Livraison impossible, remboursement manuel enregistré, une seule fois par commande |
