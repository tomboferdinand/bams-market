# MVP Backlog — Bam'S Market

> **Version 1.1 — novembre 2026.** Chaque user story porte son état de réalisation. Les stories US-017 à US-023 sont apparues pendant la réalisation et ont été intégrées au MVP.

## 1. Epic : Gestion des utilisateurs

### US-001 : Inscription client

**En tant que** Client,
**Je veux** créer un compte sur Bam'S Market,
**Afin de** pouvoir acheter des produits, suivre mes commandes et accéder aux services de la plateforme.

**Critères d'acceptation :**

* Le formulaire collecte les informations nécessaires à la création du compte conformément aux règles métier de Bam'S Market.
* Les informations minimales sont : nom, prénom, téléphone ou adresse e-mail, mot de passe et acceptation des Conditions Générales d'Utilisation (CGU).
* L'unicité du numéro de téléphone ou de l'adresse e-mail est vérifiée.
* Le compte est créé avec succès et peut être utilisé pour accéder à la plateforme.

**Priorité :** Haute

---

### US-002 : Authentification

**En tant qu'** Utilisateur (Client, Commerçant, Livreur ou Administrateur),
**Je veux** m'authentifier sur la plateforme,
**Afin de** pouvoir accéder aux fonctionnalités correspondant à mon rôle.

**Critères d'acceptation :**

* L'utilisateur saisit ses identifiants.
* Le système vérifie leur validité.
* En cas d'échec, un message explicite est affiché.
* En cas de succès, l'utilisateur est dirigé vers son espace personnel.

**Priorité :** Haute

---

### US-003 : Gestion du profil

**En tant que** Client,
**Je veux** consulter et modifier les informations de mon profil,
**Afin de** maintenir mes informations personnelles à jour.

**Critères d'acceptation :**

* Le client peut modifier ses informations personnelles autorisées.
* Le client peut gérer ses adresses de livraison.
* Les modifications sont enregistrées et immédiatement prises en compte.

**Priorité :** Moyenne

---

## 2. Epic : Gestion du catalogue

### US-004 : Consultation du catalogue

**En tant que** Visiteur ou Client,
**Je veux** consulter le catalogue des produits,
**Afin de** trouver facilement les articles recherchés.

**Critères d'acceptation :**

* Les produits affichent une photo, un nom, un prix, leur disponibilité et le commerçant.
* Une recherche par mot-clé est disponible.
* Des filtres par catégorie sont proposés.

**Priorité :** Haute

---

### US-005 : Consultation d'une fiche produit

**En tant que** Visiteur ou Client,
**Je veux** consulter les détails d'un produit,
**Afin de** disposer de toutes les informations nécessaires avant mon achat.

**Critères d'acceptation :**

* La fiche présente la description, les photos, le prix, la disponibilité et les informations sur la boutique.
* L'ajout au panier est possible uniquement lorsque le produit est disponible.

**Priorité :** Haute

---

## 3. Epic : Gestion du panier et des commandes

### US-006 : Gestion du panier

**En tant que** Client,
**Je veux** ajouter, modifier ou supprimer des produits de mon panier,
**Afin de** préparer ma commande.

**Critères d'acceptation :**

* Le client peut ajouter ou retirer des articles.
* Les quantités sont modifiables.
* Le montant total est recalculé automatiquement.
* Le panier est sauvegardé et reste disponible lors des prochaines connexions.

**Priorité :** Haute

---

### US-007 : Création d'une commande

**En tant que** Client connecté,
**Je veux** confirmer mon panier et choisir une adresse de livraison,
**Afin de** créer une commande.

**Critères d'acceptation :**

* Un récapitulatif complet est affiché.
* L'adresse de livraison est enregistrée.
* Une commande est créée avec le statut « En attente de paiement ».

**Priorité :** Haute

---

### US-008 : Suivi des commandes

**En tant que** Client,
**Je veux** consulter mes commandes,
**Afin de** suivre leur évolution.

**Critères d'acceptation :**

* L'historique des commandes est disponible.
* Les statuts sont clairement affichés : En attente, Payée, En préparation, En cours de livraison, Livrée, Annulée ou Échouée.

**Priorité :** Haute

---

## 4. Epic : Paiement

### US-009 : Paiement via GoalPay

**En tant que** Client,
**Je veux** payer ma commande via GoalPay,
**Afin de** finaliser mon achat de manière sécurisée.

**Critères d'acceptation :**

* Le paiement est initié depuis la plateforme.
* Le système confirme automatiquement le résultat du paiement.
* Le statut de la commande est mis à jour selon le résultat obtenu.

**Priorité :** Haute

---

## 5. Epic : Gestion des commerçants

### US-010 : Création d'une boutique

**En tant que** Commerçant,
**Je veux** créer ma boutique,
**Afin de** vendre mes produits sur Bam'S Market.

**Critères d'acceptation :**

* Les informations principales de la boutique sont renseignées.
* La demande est soumise à validation par l'administrateur.

**Priorité :** Haute

---

### US-011 : Gestion des produits

**En tant que** Commerçant validé,
**Je veux** gérer mon catalogue de produits,
**Afin de** maintenir une offre à jour.

**Critères d'acceptation :**

* Ajouter un produit.
* Modifier un produit.
* Désactiver ou supprimer un produit.
* Mettre à jour le stock.

**Priorité :** Haute

---

### US-012 : Traitement des commandes

**En tant que** Commerçant,
**Je veux** consulter les commandes payées,
**Afin de** préparer les produits avant leur expédition.

**Critères d'acceptation :**

* Les nouvelles commandes sont visibles.
* Le commerçant peut indiquer qu'une commande est prête pour la livraison.

**Priorité :** Haute

---

## 6. Epic : Livraison

### US-013 : Gestion des missions

**En tant que** Livreur,
**Je veux** consulter et accepter une mission de livraison,
**Afin de** transporter une commande jusqu'au client.

**Critères d'acceptation :**

* Les missions disponibles sont affichées.
* Le livreur peut accepter une mission.
* Le statut de livraison est mis à jour.

**Priorité :** Haute

---

### US-014 : Confirmation de livraison

**En tant que** Livreur,
**Je veux** confirmer la remise du colis,
**Afin de** clôturer la livraison.

**Critères d'acceptation :**

* La remise de la commande est confirmée.
* Le statut devient « Livrée ».

**Priorité :** Haute

---

## 7. Epic : Administration

### US-015 : Validation des commerçants

**En tant qu'** Administrateur,
**Je veux** approuver ou refuser les demandes d'ouverture de boutique,
**Afin de** garantir la qualité et la confiance sur la plateforme.

**Critères d'acceptation :**

* Les demandes en attente sont consultables.
* L'administrateur peut accepter ou refuser une demande.
* Une notification est envoyée au commerçant.

**Priorité :** Haute

---

### US-016 : Supervision de la plateforme

**En tant qu'** Administrateur,
**Je veux** superviser les utilisateurs, les catégories et les commandes,
**Afin de** assurer le bon fonctionnement de Bam'S Market.

**Critères d'acceptation :**

* Gestion des catégories.
* Consultation des utilisateurs.
* Supervision des commandes.
* Consultation des paiements.
* Tableau de bord global.

**Priorité :** Haute

---

## 8. Epic : Comptes, argent et incidents *(ajouté en v1.1)*

### US-017 : Devenir commerçant ou livreur

**En tant que** Client,
**Je veux** demander à devenir commerçant ou livreur,
**Afin de** participer à la plateforme comme vendeur ou transporteur.

**Critères d'acceptation :**

* La demande indique le rôle et le numéro Mobile Money de retrait.
* L'administrateur approuve ou refuse (motif).
* Après approbation, le rôle ne change qu'à l'ouverture du lien reçu par e-mail.

**Priorité :** Haute

---

### US-018 : Sécuriser son compte

**En tant qu'** Utilisateur,
**Je veux** vérifier mon e-mail et pouvoir réinitialiser mon mot de passe,
**Afin de** protéger mon compte et pouvoir le récupérer.

**Critères d'acceptation :**

* Un lien de vérification est envoyé par e-mail ; sans vérification, pas de commande ni de retrait.
* Le mot de passe oublié passe par un lien à usage unique valable 1 heure.
* Les échecs de connexion répétés verrouillent temporairement le compte.

**Priorité :** Haute

---

### US-019 : Comprendre l'état d'une commande non aboutie

**En tant que** Client,
**Je veux** voir clairement pourquoi une commande est annulée ou échouée et quoi faire,
**Afin de** ne pas rester bloqué.

**Critères d'acceptation :**

* « Mes commandes » classe les commandes en En cours / Terminées / Annulées ou échouées.
* Une commande non payée affiche son heure limite et s'annule automatiquement.
* Un message distinct explique annulation, paiement non abouti et livraison impossible.

**Priorité :** Haute

---

### US-020 : Déclarer une livraison impossible

**En tant que** Livreur,
**Je veux** déclarer qu'une livraison est impossible,
**Afin de** clore la mission sans fausser les comptes.

**Critères d'acceptation :**

* La mission passe à « Échec », la commande à « Échouée », le stock est restitué.
* Personne n'est crédité.

**Priorité :** Haute

---

### US-021 : Portefeuille et retraits

**En tant que** Commerçant ou Livreur,
**Je veux** voir mes gains et les retirer par Mobile Money,
**Afin de** être payé pour mon activité.

**Critères d'acceptation :**

* Le solde provient d'un livre de comptes non modifiable.
* Le retrait va vers le numéro verrouillé, après confirmation par mot de passe, avec frais affichés.
* Un retrait refusé annule le débit.

**Priorité :** Haute

---

### US-022 : Rembourser un client

**En tant qu'** Administrateur,
**Je veux** enregistrer le remboursement d'une commande dont la livraison a échoué,
**Afin de** savoir qui est remboursé et d'éviter un double remboursement.

**Critères d'acceptation :**

* Le montant est celui du paiement enregistré.
* Le remboursement est enregistré une seule fois par commande, avec la référence de la transaction.
* Le client voit « remboursé » sur sa commande.

**Priorité :** Haute

---

### US-023 : Modifier un numéro de retrait

**En tant qu'** Administrateur,
**Je veux** modifier le numéro de retrait d'un commerçant ou d'un livreur avec un motif,
**Afin de** traiter un numéro perdu ou erroné sans ouvrir de faille.

**Critères d'acceptation :**

* Le numéro ne peut appartenir qu'à un compte.
* Le motif est obligatoire et la modification est journalisée.

**Priorité :** Moyenne

---

# État de réalisation du MVP

| User story | État |
|---|---|
| US-001 à US-014 | Réalisées |
| US-015 Validation des commerçants | Réalisée |
| US-016 Supervision (utilisateurs, catégories, commandes, paiements, retraits, journal d'audit, tableau de bord) | Réalisée |
| US-017 à US-023 | Réalisées |

# Priorisation du MVP

| Epic                     | Priorité |
| ------------------------ | -------- |
| Gestion des utilisateurs | Haute    |
| Catalogue produits       | Haute    |
| Panier et commandes      | Haute    |
| Paiement GoalPay         | Haute    |
| Gestion des commerçants  | Haute    |
| Livraison                | Haute    |
| Administration           | Haute    |

## Fonctionnalités prévues après le MVP

* Demande de changement de numéro de retrait depuis l'application (aujourd'hui : contact de l'administration).
* Blocage de l'accès au site tant que l'e-mail n'est pas vérifié.
* Remboursement automatique par la passerelle de paiement et réconciliation des paiements.
* Page de statistiques détaillées pour le commerçant.
* Notifications dans l'application et par SMS.
* Avis et évaluations.
* Recommandations intelligentes.
* Nouveaux moyens de paiement (Orange Money, MVola, Airtel Money, paiement à la livraison).
* Promotions et publicités.
* Application mobile Android/iOS.
* Optimisation automatique des livraisons.
