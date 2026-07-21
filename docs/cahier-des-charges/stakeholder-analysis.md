# Stakeholder Analysis — Bam'S Market

## 1. Introduction

L'identification et l'analyse des parties prenantes (*Stakeholder Analysis*) constituent une étape essentielle dans la conception de Bam'S Market. Une marketplace ne répond pas aux besoins d'un seul utilisateur, mais d'un ensemble d'acteurs qui interagissent autour d'un même écosystème commercial.

Cette analyse permet de :

- identifier les principaux acteurs du système et leurs responsabilités ;
- comprendre leurs objectifs et leurs attentes ;
- définir les besoins métier qui guideront les User Stories et les cas d'utilisation ;
- faciliter la conception de l'architecture logicielle, du modèle de données et des règles métier ;
- réduire les risques fonctionnels lors du déploiement progressif de la plateforme.

Dans le cadre du MVP, Bam'S Market sera déployé en priorité à Fianarantsoa avant une extension progressive vers d'autres villes de Madagascar.

---

# 2. Parties prenantes principales

## 2.1 Client

### Description

Le client est toute personne souhaitant acheter des produits proposés par des commerçants locaux via Bam'S Market, depuis un smartphone ou un ordinateur.

### Objectifs

- Trouver facilement les produits recherchés.
- Comparer les offres disponibles.
- Commander simplement.
- Effectuer un paiement sécurisé.
- Suivre sa commande jusqu'à la livraison.

### Besoins

- Catalogue clair et régulièrement mis à jour.
- Informations fiables sur les produits.
- Paiement sécurisé.
- Suivi des commandes.
- Gestion des réclamations en cas de problème.

### Interactions avec la plateforme

- Créer et gérer son compte.
- Rechercher et consulter les produits.
- Ajouter des produits au panier.
- Passer une commande.
- Effectuer un paiement.
- Suivre l'état de la commande.
- Consulter son historique d'achat.
- Évaluer les produits et les commerçants.

---

## 2.2 Commerçant

### Description

Le commerçant est un professionnel ou un vendeur souhaitant développer son activité en commercialisant ses produits via Bam'S Market sans créer son propre site de commerce électronique.

Les commerçants peuvent être validés par l'administrateur avant de pouvoir vendre sur la plateforme afin de renforcer la confiance des clients.

### Objectifs

- Développer sa visibilité.
- Augmenter ses ventes.
- Simplifier la gestion quotidienne.
- Fidéliser sa clientèle.

### Besoins

- Gestion simple du catalogue.
- Gestion des stocks.
- Suivi des commandes.
- Tableau de bord des ventes.
- Gestion des paiements.
- Validation du profil vendeur pour renforcer la confiance.

### Interactions avec la plateforme

- Créer sa boutique.
- Publier et gérer ses produits.
- Mettre à jour les stocks.
- Accepter ou refuser une commande.
- Préparer les commandes.
- Consulter les statistiques.
- Gérer son profil.

---

## 2.3 Livreur / Service de livraison

### Description

Le livreur ou service de livraison est responsable de l'acheminement des commandes entre les commerçants et les clients.

Il peut être un livreur indépendant ou représenter une entreprise partenaire.

### Objectifs

- Recevoir des missions de livraison.
- Organiser ses déplacements.
- Garantir la livraison des commandes.

### Besoins

- Informations précises sur les commandes.
- Mise à jour simple des statuts.
- Historique des livraisons.

### Interactions avec la plateforme

- Consulter les livraisons attribuées.
- Accepter une mission.
- Mettre à jour le statut.
- Confirmer la livraison.
- Consulter son historique.

---

## 2.4 Administrateur

### Description

L'administrateur assure le bon fonctionnement de Bam'S Market en supervisant les utilisateurs, les contenus et les opérations.

### Objectifs

- Garantir la qualité du service.
- Assurer la sécurité.
- Gérer les litiges.
- Superviser les activités.

### Besoins

- Tableau de bord global.
- Gestion utilisateurs.
- Gestion catégories.
- Gestion commissions.
- Outils de modération.
- Rapports statistiques.

### Interactions avec la plateforme

- Valider les comptes commerçants.
- Gérer les utilisateurs.
- Superviser les commandes.
- Traiter les réclamations.
- Consulter les indicateurs.
- Configurer les paramètres.

---

# 3. Parties prenantes secondaires

## 3.1 Prestataires de paiement

### Description

Les prestataires de paiement permettent la réalisation et la confirmation des transactions électroniques selon les modalités du fournisseur.

### Exemples

- GoalPay
- MVola
- Orange Money
- Airtel Money

### Contribution

- Validation des paiements.
- Sécurisation des transactions.
- Confirmation des opérations financières.

---

## 3.2 Partenaires logistiques

### Description

Les partenaires logistiques accompagnent Bam'S Market dans l'organisation des livraisons lorsque la plateforme collabore avec plusieurs services de transport.

### Contribution

- Mise à disposition de livreurs.
- Optimisation de la distribution.
- Extension de la couverture géographique.

---

## 3.3 Partenaires institutionnels

### Description

Les associations de commerçants, collectivités locales et partenaires économiques favorisent l'adoption de Bam'S Market.

### Contribution

- Sensibilisation des commerçants.
- Accompagnement numérique.
- Développement du réseau.

---

## 3.4 Équipe technique

### Description

L'équipe technique assure le développement, la maintenance et l'évolution de la plateforme.

### Contribution

- Développement des fonctionnalités.
- Correction des anomalies.
- Maintenance technique.
- Sécurité et amélioration des performances.

---

# 4. Synthèse des parties prenantes

| Partie prenante | Importance | Influence | Principal besoin |
|---|---|---|---|
| Client | Haute | Haute | Acheter simplement et en confiance |
| Commerçant | Haute | Haute | Développer et gérer son activité |
| Livreur / Service de livraison | Moyenne | Moyenne | Assurer efficacement les livraisons |
| Administrateur | Haute | Haute | Superviser et sécuriser la plateforme |
| Prestataire de paiement | Haute | Haute | Garantir des transactions fiables |
| Partenaire logistique | Moyenne | Moyenne | Optimiser la distribution |
| Partenaire institutionnel | Moyenne | Faible | Favoriser l'adoption |
| Équipe technique | Haute | Haute | Maintenir et faire évoluer la plateforme |

---

# 5. Conclusion

L'identification des parties prenantes montre que Bam'S Market constitue un véritable écosystème numérique réunissant plusieurs acteurs aux objectifs complémentaires.

Cette analyse servira de fondation pour :

- l'analyse des besoins métier ;
- les User Stories ;
- les diagrammes UML ;
- les règles métier ;
- le modèle de données ;
- la définition des droits et permissions.
     
Elle garantit que les futures décisions fonctionnelles et techniques resteront alignées avec les besoins réels des utilisateurs et la vision du projet.