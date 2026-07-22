# Use Case Specification — Bam'S Market

## 1. Introduction & Vue d'ensemble

Ce document détaille les cas d'utilisation (*Use Cases*) fonctionnels pour le MVP de la plateforme **Bam'S Market**. Il sert de liaison directe entre les besoins exprimés dans le Backlog MVP, les règles métier (*Business Rules*) et les futurs diagrammes d'architecture UML (Diagrammes de cas d'utilisation, de séquence et de classes).

---

## 2. Acteurs du système

### Acteurs principaux
- **Client :** Utilisateur final achetant des produits sur la marketplace.
- **Commerçant :** Vendeur professionnel ou particulier gérant une boutique et son catalogue.
- **Livreur :** Agent responsable du retrait des commandes chez les commerçants et de la remise aux clients.
- **Administrateur :** Responsable du contrôle, de la modération, du paramétrage et du pilotage global de la plateforme.

### Acteurs secondaires / Systèmes externes
- **Passerelle de paiement (GoalPay) :** Service externe assurant l'exécution et la confirmation des transactions financières Mobile Money (MVola, Orange Money, Airtel Money).

---

## 3. Spécification détaillée des cas d'utilisation

### 3.1 Module : Gestion des utilisateurs & Accès

#### UC-001 : Créer un compte Client
- **Objectif :** Permettre à un nouveau client d'ouvrir un compte sur la plateforme afin de pouvoir effectuer des achats.
- **Acteur principal :** Client
- **Déclencheur (Trigger) :** Le client clique sur "Créer un compte".
- **Fréquence :** Élevée (à chaque nouvel utilisateur).
- **Préconditions :** Aucune.
- **Règles métier associées :** BR-USR-01, BR-USR-02, BR-USR-03, BR-USR-04.
- **Scénario principal :**
  1. Le client accède au formulaire d'inscription.
  2. Le client saisit ses informations (Nom, Prénom, Email, Téléphone, Mot de passe).
  3. Le système vérifie l'unicité et le format des identifiants (Email et Téléphone).
  4. Le système enregistre le nouveau compte avec le rôle `CLIENT` conformément aux règles de sécurité définies.
  5. Le système connecte automatiquement le client et l'oriente vers la page d'accueil.
  6. Le système envoie une notification de confirmation de création de compte au client.
- **Scénario alternatif (3a - Données invalides ou existantes) :**
  - Si le téléphone ou l'email est déjà utilisé ou si le mot de passe ne respecte pas les critères de sécurité :
    1. Le système affiche un message d'erreur explicite.
    2. Le client corrige ses données et soumet à nouveau.
- **Exceptions :**
  - **Indisponibilité du service :** Message d'erreur invitant l'utilisateur à réessayer ultérieurement.
- **Postconditions :** Le compte est créé et la session utilisateur est active.

---

#### UC-002 : S'authentifier (Connexion)
- **Objectif :** Permettre à un utilisateur enregistré d'accéder à son espace personnel de manière sécurisée.
- **Acteur principal :** Client, Commerçant, Livreur, Administrateur
- **Déclencheur (Trigger) :** L'utilisateur clique sur "Se connecter".
- **Fréquence :** Très élevée (quotidienne).
- **Préconditions :** Posséder un compte préalablement créé.
- **Règles métier associées :** BR-USR-04, BR-USR-05.
- **Scénario principal :**
  1. L'utilisateur saisit son identifiant (Email ou Téléphone) et son mot de passe.
  2. Le système vérifie la validité des identifiants et l'état du compte.
  3. Le système authentifie l'utilisateur et ouvre une session sécurisée.
  4. Le système redirige l'utilisateur vers son espace dédié selon son rôle (`CLIENT` $\rightarrow$ Catalogue, `COMMERÇANT` $\rightarrow$ Dashboard Vendeur, `LIVREUR` $\rightarrow$ App Livreur, `ADMINISTRATEUR` $\rightarrow$ Back-office).
- **Exceptions :**
  - **Identifiants incorrects :** Le système affiche un message d'erreur d'authentification générique.
  - **Compte suspendu (BR-USR-05) :** Le système refuse la connexion et informe l'utilisateur de contacter le support.
- **Postconditions :** L'utilisateur est authentifié et sa session est ouverte avec les droits correspondant à son rôle.

---

### 3.2 Module : Catalogue & Produits

#### UC-003 : Parcourir et rechercher dans le catalogue
- **Objectif :** Permettre aux visiteurs et clients de consulter la liste des produits disponibles et de trouver un article spécifique.
- **Acteur principal :** Client (ou Visiteur)
- **Déclencheur (Trigger) :** L'utilisateur accède à la page d'accueil ou de catalogue.
- **Fréquence :** Très élevée (continue).
- **Préconditions :** Aucune.
- **Règles métier associées :** BR-PRD-01, BR-BQT-01, BR-BQT-04.
- **Scénario principal :**
  1. L'utilisateur accède au catalogue principal.
  2. Le système affiche la liste des produits actifs appartenant à des boutiques validées et ouvertes.
  3. L'utilisateur applique un filtre par catégorie ou saisit un mot-clé dans la barre de recherche.
  4. Le système met à jour dynamiquement la liste des produits affichés avec leurs photos, prix et stock disponible.
- **Exceptions :**
  - **Aucun résultat :** Le système affiche un message indiquant qu'aucun produit ne correspond aux critères recherchés.
- **Postconditions :** L'utilisateur visualise les articles correspondant à ses critères de recherche.

---

#### UC-004 : Gérer le catalogue de produits (Ajout, Modification, Désactivation)
- **Objectif :** Permettre au commerçant de maintenir à jour le catalogue de sa boutique (produits, prix et stocks).
- **Acteur principal :** Commerçant
- **Déclencheur (Trigger) :** Le commerçant clique sur "Ajouter un produit" ou "Modifier un produit" depuis son tableau de bord.
- **Fréquence :** Régulière.
- **Préconditions :** Commerçant authentifié possédant une boutique au statut `VALIDÉE`.
- **Règles métier associées :** BR-PRD-01, BR-PRD-02, BR-PRD-03, BR-PRD-05.
- **Scénario principal (Ajout de produit) :**
  1. Le commerçant accède au formulaire d'ajout d'article.
  2. Il saisit le nom, la description, la catégorie, le prix en Ariary (MGA), le stock initial et télécharge l'image du produit.
  3. Le système contrôle la conformité des données (prix $> 0$, stock $\ge 0$).
  4. Le système associe le produit à la boutique du commerçant et l'enregistre dans le catalogue.
- **Scénarios alternatifs :**
  - **Modification :** Le commerçant met à jour les informations ou le stock d'un produit existant.
  - **Désactivation / Archivage (BR-PRD-05) :** Si le produit a déjà fait l'objet d'au moins une commande, la suppression physique est bloquée ; le produit passe à l'état désactivé (`is_active = false`).
- **Exceptions :**
  - **Données invalides :** Message d'erreur indiquant les champs à corriger (ex: prix négatif ou nul).
  - **Boutique suspendue :** Impossible de modifier ou d'ajouter des produits.
- **Postconditions :** Le catalogue de la boutique est mis à jour en base de données.

---

### 3.3 Module : Commandes & Paiements

#### UC-005 : Passer commande et payer via GoalPay
- **Objectif :** Permettre au client de finaliser son achat et d'effectuer le paiement sécurisé de sa commande.
- **Acteur principal :** Client
- **Acteur secondaire :** Passerelle de paiement GoalPay
- **Déclencheur (Trigger) :** Le client clique sur "Valider et Payer la commande".
- **Fréquence :** Élevée.
- **Préconditions :** Client connecté, panier non vide avec des articles en stock.
- **Règles métier associées :** BR-PRD-03, BR-PRD-04, BR-CMD-01, BR-CMD-02, BR-PAY-01, BR-PAY-02, BR-PAY-03, BR-SEC-02.
- **Scénario principal :**
  1. Le client valide son panier et saisit son adresse précise de livraison à Fianarantsoa.
  2. Le système calcule le sous-total, effectue le contrôle des prix côté serveur et calcule les frais de livraison.
  3. Le système crée une commande au statut `EN_ATTENTE_PAIEMENT` et bloque temporairement le stock (BR-PRD-04).
  4. Le système redirige le client vers le service de paiement GoalPay.
  5. Le client saisit ses coordonnées Mobile Money et valide la transaction sur son téléphone.
  6. GoalPay transmet le résultat de la transaction au système Bam'S Market.
  7. Le système enregistre la confirmation de paiement de manière idempotente (BR-PAY-02).
  8. La commande passe au statut `PAYÉE`.
  9. Le système envoie une notification de confirmation de commande au client et une notification de nouvelle commande au commerçant.
- **Exceptions :**
  - **Panier vide :** La validation de commande est bloquée.
  - **Produit devenu indisponible / Stock insuffisant :** Notification au client et mise à jour du panier.
  - **Échec ou Expiration du paiement (BR-PAY-03) :** Si le paiement n'est pas confirmé dans le délai imparti, la commande passe à l'état `ÉCHOUÉE` et la réservation du stock est annulée.
  - **Erreur/Indisponibilité GoalPay :** Notification du client pour réimpression ou choix d'un autre essai.
- **Postconditions :** La commande est enregistrée comme payée, le stock définitif est décrémenté, et la commande est transmise au commerçant.

---

### 3.4 Module : Traitement & Logistique

#### UC-006 : Préparer la commande
- **Objectif :** Permettre au commerçant d'emballer les articles et de signaler que la commande est prête à être récupérée.
- **Acteur principal :** Commerçant
- **Déclencheur (Trigger) :** Réception d'une nouvelle commande au statut `PAYÉE`.
- **Fréquence :** Élevée.
- **Préconditions :** Commande au statut `PAYÉE` associée à la boutique du commerçant.
- **Règles métier associées :** BR-CMD-02, BR-CMD-04.
- **Scénario principal :**
  1. Le commerçant consulte la liste des nouvelles commandes depuis son tableau de bord.
  2. Il prépare le colis selon le détail de la commande.
  3. Il clique sur "Marquer comme prête pour expédition".
  4. Le système passe le statut de la commande à `EN_PRÉPARATION`.
  5. Le système notifie le réseau de livreurs qu'une course est disponible.
- **Exceptions :**
  - **Rupture imprévue :** Le commerçant signale l'impossibilité d'honorer la commande, déclenchant le processus d'annulation et de remboursement.
- **Postconditions :** La commande est au statut `EN_PRÉPARATION` et prête pour la prise en charge logistique.

---

#### UC-007 : Prise en charge et livraison du colis
- **Objectif :** Permettre au livreur d'acheminer le colis du commerçant jusqu'au client et de valider sa réception.
- **Acteur principal :** Livreur
- **Déclencheur (Trigger) :** Une commande passe au statut `EN_PRÉPARATION`.
- **Fréquence :** Élevée.
- **Préconditions :** Livreur authentifié, commande au statut `EN_PRÉPARATION`.
- **Règles métier associées :** BR-LIV-01, BR-LIV-02, BR-LIV-03, BR-LIV-04.
- **Scénario principal :**
  1. Le livreur consulte les missions de livraison disponibles dans sa zone à Fianarantsoa.
  2. Il accepte la mission (sous réserve de respecter la limite de livraisons simultanées - BR-LIV-03).
  3. Le système lui attribue la commande et passe le statut à `EN_COURS_DE_LIVRAISON`.
  4. Le système notifie le client que son colis est en cours d'acheminement avec les coordonnées du livreur.
  5. Le livreur récupère le colis chez le commerçant et se rend à l'adresse du client.
  6. Lors de la remise du colis, le livreur saisit le code de confirmation transmis par le client (BR-LIV-04).
  7. Le système valide le code et passe le statut de la commande à `LIVRÉE`.
  8. Le système envoie une notification de livraison effectuée au client et au commerçant.
- **Exceptions :**
  - **Code de confirmation incorrect :** La validation de la livraison est bloquée.
  - **Absence du client :** Le livreur signale l'échec de remise et la commande passe en tentative d'échec de livraison.
- **Postconditions :** La livraison est clôturée et la commande passe au statut `LIVRÉE`.

---

### 3.5 Module : Administration & Back-Office

#### UC-008 : Approuver ou suspendre une boutique
- **Objectif :** Permettre à l'administrateur de modérer les boutiques sur la plateforme afin de garantir un écosystème de confiance.
- **Acteur principal :** Administrateur
- **Déclencheur (Trigger) :** Réception d'une nouvelle demande de création de boutique ou signalement de litige.
- **Fréquence :** Occasionnelle.
- **Préconditions :** Administrateur connecté à l'interface Back-office.
- **Règles métier associées :** BR-BQT-01, BR-BQT-03, BR-BQT-04, BR-SEC-01.
- **Scénario principal :**
  1. L'administrateur consulte la liste des demandes de création de boutiques en attente.
  2. Il vérifie la complétude des informations requises (Nom, adresse physique, téléphone, logo).
  3. L'administrateur valide la boutique.
  4. Le système passe le statut de la boutique à `VALIDÉE`.
  5. Le système envoie une notification d'approbation au commerçant.
- **Scénario alternatif (Suspension) :**
  - En cas de non-respect des conditions ou de litige grave, l'administrateur suspend une boutique.
  - Le système passe la boutique au statut `SUSPENDUE` et retire immédiatement tous ses produits de l'affichage public du catalogue (BR-BQT-04).
  - Le système notifie le commerçant de la suspension.
- **Postconditions :** Le statut de la boutique est mis à jour et l'action est enregistrée dans le journal d'audit (`Audit Trail`).

---

## 4. Matrice de traçabilité

| Use Case | Titre du Cas d'Utilisation | User Story associée | Business Rules appliquées |
|---|---|---|---|
| **UC-001** | Créer un compte Client | US-001 | BR-USR-01, BR-USR-02, BR-USR-03, BR-USR-04 |
| **UC-002** | S'authentifier (Connexion) | US-002 | BR-USR-04, BR-USR-05 |
| **UC-003** | Parcourir et rechercher dans le catalogue | US-004, US-005 | BR-PRD-01, BR-BQT-01, BR-BQT-04 |
| **UC-004** | Gérer le catalogue de produits | US-011 | BR-PRD-01, BR-PRD-02, BR-PRD-03, BR-PRD-05 |
| **UC-005** | Passer commande et payer via GoalPay | US-006, US-007, US-009 | BR-PRD-03, BR-PRD-04, BR-CMD-01, BR-CMD-02, BR-PAY-01 à BR-PAY-03, BR-SEC-02 |
| **UC-006** | Préparer la commande | US-012 | BR-CMD-02, BR-CMD-04 |
| **UC-007** | Prise en charge et livraison du colis | US-013, US-014 | BR-LIV-01, BR-LIV-02, BR-LIV-03, BR-LIV-04 |
| **UC-008** | Approuver ou suspendre une boutique | US-015 | BR-BQT-01, BR-BQT-03, BR-BQT-04, BR-SEC-01 |