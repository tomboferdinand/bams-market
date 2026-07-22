# Business Rules (Règles Métier) — Bam'S Market

## Portée

Les règles métier décrites dans ce document sont indépendantes des choix techniques d'implémentation.

Elles constituent la référence fonctionnelle de Bam'S Market et devront être respectées par l'ensemble des composants du système (interface utilisateur, API, base de données et services métiers).

Toute évolution fonctionnelle devra être conforme à ces règles ou faire l'objet d'une révision du présent document.

## 1. Introduction & Nomenclature

Ce document définit les règles métier incontournables (*Business Rules*) encadrant le fonctionnement fonctionnel, la cohérence des données et la sécurité des opérations sur la plateforme **Bam'S Market**. 

Chaque règle est identifiée par un code unique sous la forme `BR-[DOMAINE]-[NUMÉRO]` :
- **BR-USR** : Gestion des utilisateurs & accès
- **BR-BQT** : Gestion des boutiques & commerçants
- **BR-PRD** : Gestion des produits & stocks
- **BR-CMD** : Gestion des commandes & cycles de vie
- **BR-PAY** : Gestion des paiements & transactions
- **BR-LIV** : Gestion de la logistique & livraisons
- **BR-SEC** : Sécurité, confidentialité & intégrité des données

---

## 2. Gestion des utilisateurs & accès (BR-USR)

- **BR-USR-01 (Unicité des identifiants) :** Un compte utilisateur doit être associé à une adresse e-mail unique et/ou un numéro de téléphone unique sur la plateforme.
- **BR-USR-02 (Format des numéros) :** Tout numéro de téléphone enregistré doit suivre le format international ou le format national valide à Madagascar (ex: `+26134XXXXXXX`, `032XXXXXXX`, `034XXXXXXX`, `038XXXXXXX`, `033XXXXXXX`).
- **BR-USR-03 (Sécurité des mots de passe) :** Le mot de passe doit comporter au minimum 8 caractères et inclure au moins une lettre majuscule, une lettre minuscule et un chiffre. Il ne doit jamais être stocké en clair.
- **BR-USR-04 (Rôles & Cloisonnement) :** Un utilisateur possède un rôle principal parmi : `CLIENT`, `COMMERÇANT`, `LIVREUR`, `ADMINISTRATEUR`. Les permissions d'accès aux API et interfaces sont strictement restreintes par le rôle actif.
- **BR-USR-05 (Désactivation de compte) :** Un compte désactivé ou suspendu par l'administrateur ne peut plus se connecter ni effectuer d'actions sur la plateforme tant qu'il n'est pas réactivé.
- BR-USR-06 (Vérification du compte) :
Un compte nouvellement créé peut être marqué NON_VERIFIE tant que la procédure de vérification (email ou téléphone) n'a pas été réalisée.

- BR-USR-07 (Suppression de compte) :
La suppression physique d'un utilisateur est interdite si celui-ci possède un historique de commandes ou de transactions. Le compte est désactivé afin de préserver l'intégrité des données.

---

## 3. Gestion des boutiques & commerçants (BR-BQT)

- **BR-BQT-01 (Workflow d'approbation) :** Toute nouvelle boutique créée par un commerçant est initialement au statut `EN_ATTENTE_VALIDATION`. Elle ne peut pas publier ni vendre de produits tant qu'elle n'est pas approuvée par un `ADMINISTRATEUR`.
- **BR-BQT-02 (Propriété unique) :** Dans la version MVP, un compte commerçant ne peut posséder qu'une seule boutique active à la fois.
- **BR-BQT-03 (Informations obligatoires) :** Une boutique doit obligatoirement comporter : un nom commercial, une description, une adresse physique à Fianarantsoa, un numéro de contact direct et un logo.
- **BR-BQT-04 (Fermeture / Suspension) :** Si une boutique est marquée comme `SUSPENDUE` ou `INACTIVE`, l'ensemble de ses produits est immédiatement retiré de la visibilité publique du catalogue.
- BR-BQT-05 (Responsabilité du commerçant) :
Le commerçant est responsable de l'exactitude des informations publiées concernant ses produits (prix, description, disponibilité et stock).
---

## 4. Gestion des produits & stocks (BR-PRD)

- **BR-PRD-01 (Appartenance au catalogue) :** Tout produit doit être impérativement rattaché à une boutique au statut `VALIDÉE` et à une catégorie de produits existante.
- **BR-PRD-02 (Intégrité des prix) :** Le prix d'un produit doit être un montant strictement positif (> 0) exprimé en Ariary (MGA).
- **BR-PRD-03 (Gestion stricte des stocks) :** 
  - La quantité en stock doit être un entier supérieur ou égal à zéro ($\ge 0$).
  - Si le stock atteint `0`, le produit passe automatiquement au statut `RUPTURE_DE_STOCK` et le bouton d'ajout au panier est désactivé.
- **BR-PRD-04 (Réservation de stock) :** Lors de la validation d'un panier et de l'initiation du paiement par le client, les quantités commandées sont temporairement réservées pour une durée configurable par l'administrateur de la plateforme. Si le paiement échoue ou expire, la réservation est annulée et le stock est restitué.
- **BR-PRD-05 (Suppression logique) :** Un produit ayant déjà fait l'objet d'au moins une commande ne peut pas être supprimé physiquement de la base de données. Il fait l'objet d'un archivage/désactivation logique (`is_active = false`).
- BR-PRD-06 (Modification de prix) :
Une modification du prix d'un produit n'affecte jamais les commandes déjà validées.

---

## 5. Gestion des commandes & cycle de vie (BR-CMD)

- **BR-CMD-01 (Montant minimum) :** Le sous-total d'une commande doit être supérieur ou égal à un montant minimal configurable (ex: 2 000 MGA).
- **BR-CMD-02 (Diagramme des états de commande) :** Une commande suit rigoureusement la machine à états suivante :
  `EN_ATTENTE_PAIEMENT` $\rightarrow$ `PAYÉE` $\rightarrow$ `EN_PRÉPARATION` $\rightarrow$ `EN_COURS_DE_LIVRAISON` $\rightarrow$ `LIVRÉE`.
- **BR-CMD-03 (Annulation de commande) :** 
  - Le client peut annuler une commande **uniquement** si elle est encore au statut `EN_ATTENTE_PAIEMENT`.
  - Une fois la commande au statut `PAYÉE` ou `EN_PRÉPARATION`, l'annulation nécessite l'accord du commerçant ou l'intervention de l'administrateur.
- **BR-CMD-04 (Immuabilité des commandes validées) :** Une fois le paiement confirmé, les articles, quantités, prix unitaires et frais de livraison associés à la commande ne peuvent plus être modifiés.
- BR-CMD-05 (Numérotation des commandes) :
Chaque commande possède un identifiant unique généré automatiquement.

- BR-CMD-06 (Historique des statuts) :
Chaque changement d'état d'une commande est historisé afin d'assurer sa traçabilité.

---

## 6. Gestion des paiements & transactions (BR-PAY)

- **BR-PAY-01 (Canal exclusif MVP) :** Dans la version MVP, la finalisation de commande s'effectue exclusivement via la passerelle de paiement intégrée **GoalPay** (Mobile Money : MVola, Orange Money, Airtel Money).
- BR-PAY-02 (Confirmation de paiement) : Le système doit confirmer de manière fiable le résultat de la transaction auprès de la passerelle de paiement avant toute modification de l'état d'une commande. Toute confirmation de paiement doit être traitée de manière idempotente afin de garantir qu'une même transaction ne puisse être validée qu'une seule fois.
- **BR-PAY-03 (Délai d'expiration du paiement) :** Une transaction de paiement initiée dispose d'un délai limite de traitement (ex: 10 minutes). Au-delà, la transaction est marquée `EXPIRÉE` et la commande repasse en échec.
- **BR-PAY-04 (Calcul de la commission) :** Sur chaque transaction validée, Bam'S Market prélève automatiquement une commission en pourcentage ($X\%$) et/ou des frais fixes de service avant de créditer le solde du commerçant.
- BR-PAY-05 (Unicité de la transaction) :
Une transaction de paiement ne peut être associée qu'à une seule commande.

---

## 7. Gestion de la logistique & livraisons (BR-LIV)

- **BR-LIV-01 (Zone géographique MVP) :** Le service de livraison est limité aux adresses situées dans le périmètre urbain et périmètre proche défini pour la ville de Fianarantsoa.
- **BR-LIV-02 (Attribution des livraisons) :** Une commande ne peut être attribuée qu'à un seul livreur validé à la fois.
- **BR-LIV-03 (Capacité du livreur) :** Un livreur ne peut pas prendre en charge plus de `N` courses simultanées (ex: maximum 3 livraisons actives) afin de garantir les délais de remise.
- **BR-LIV-04 (Preuve de livraison) :** La transition d'une commande vers le statut `LIVRÉE` nécessite la validation d'un code de confirmation secret transmis au client lors de sa commande ou la validation de la remise sur l'interface du livreur.
- BR-LIV-05 (Intégrité de livraison) :
Une commande ne peut être déclarée LIVRÉE que si elle est préalablement passée par l'état EN_COURS_DE_LIVRAISON.

---

## 8. Sécurité & Intégrité des données (BR-SEC)

- **BR-SEC-01 (Traces d'audit) :** Toute modification de statut critique (changement d'état d'une commande, approbation d'une boutique, validation de paiement) doit être enregistrée dans un journal d'audit (`Audit Trail`) contenant l'identifiant de l'auteur, la date/heure et la valeur précédente/nouvelle.
- **BR-SEC-02 (Inviolabilité des montants) :** Le calcul du sous-total, des taxes et du total général d'une commande doit être réexécuté et contrôlé côté serveur. Les montants calculés côté client ne doivent jamais être faits au niveau du Front-end sans contrôle du Back-end.
- **BR-SEC-03 (Consultation restreinte) :** Un commerçant n'a accès qu'aux commandes et statistiques associées à sa propre boutique. Un client n'a accès qu'à son propre historique d'achats.
- BR-SEC-04 (Confidentialité) :
Les données personnelles des utilisateurs ne peuvent être consultées que par les personnes autorisées conformément à leur rôle.

- BR-SEC-05 (Journalisation des erreurs critiques) :
Toute erreur critique impactant une transaction financière ou une commande doit être enregistrée dans les journaux du système.

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