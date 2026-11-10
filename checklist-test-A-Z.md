# Bam'S Market — Checklist de test manuel A–Z

Comptes utilisés : **client**, **commerçant**, **livreur**, **admin** (les 4 comptes réels existants, e-mails vérifiés).
Principe : cochez une case seulement si le résultat observé est exactement celui attendu. Au moindre écart, notez-le dans le tableau « Anomalies » tout en bas (étape, ce que vous avez fait, ce qui s'est passé, capture).

---

## 0. Préparation (une seule fois)

- [ ] Backend lancé (port 3000) et frontend lancé (port 3001), base de développement `bams_market`.
- [ ] `PAYMENT_MODE=simulation` et `PAYOUT_MODE=simulation` dans `backend/.env` (puis redémarrer le backend).
- [ ] `WALLET_HOLD_HOURS=0` (l'argent est retirable dès la livraison confirmée).
- [ ] SMTP configuré (Gmail) : vous devez recevoir de vrais e-mails. Si rien n'arrive, regardez le terminal du backend (message « Envoi d'e-mail impossible »).
- [ ] 4 sessions séparées ouvertes en même temps (sinon les cookies se mélangent) : par exemple Chrome (client), Chrome navigation privée (commerçant), Edge (livreur), Firefox ou un 2ᵉ profil (admin).
- [ ] Les 4 comptes se connectent avec leur e-mail ou leur téléphone, et chacun arrive dans **son** espace (client → accueil, commerçant → /commercant/dashboard, livreur → /livreur/dashboard, admin → /admin/dashboard).

## 1. Comptes et sécurité de base

- [ ] Client : essayer d'ouvrir `/admin/dashboard` → refusé / redirigé.
- [ ] Commerçant : ouvrir `/livreur/dashboard` → refusé / redirigé.
- [ ] Déconnecté : ouvrir `/commercant/dashboard` → redirigé vers la connexion.
- [ ] Mauvais mot de passe → « Identifiants incorrects », et on reste sur la page de connexion.
- [ ] « Mot de passe oublié ? » avec l'e-mail du **client** → e-mail reçu → lien → nouveau mot de passe → connexion avec le nouveau. (Remettez ensuite le mot de passe que vous voulez garder.)
- [ ] Une adresse e-mail inconnue dans « Mot de passe oublié ? » donne le **même** message neutre (on ne révèle pas si le compte existe).

## 2. Catalogue (admin → commerçant)

- [ ] Admin : créer une catégorie (ex. « Alimentation »).
- [ ] Commerçant : créer sa boutique (nom, description, adresse, téléphone de contact). Statut = **en attente de validation**.
- [ ] Commerçant : essayer de publier un produit avant validation → refusé.
- [ ] Admin : valider la boutique (Boutiques → valider).
- [ ] Commerçant : publier un produit (prix **5 000 Ar**, stock **20**, photo, catégorie).
- [ ] Client (ou visiteur non connecté) : le produit apparaît dans le catalogue et sa fiche s'ouvre.

## 3. Commande et paiement SIMULÉ

- [ ] Client : ajouter une adresse (profil ou au moment de commander).
- [ ] Client : ajouter **2** unités au panier → panier = 10 000 Ar.
- [ ] Client : récapitulatif de commande → sous-total 10 000, frais de livraison (2 000 par défaut), **total 12 000**.
- [ ] Client : valider la commande → statut « En attente de paiement ». Un **code de livraison à 6 chiffres** est visible sur la commande (le noter).
- [ ] Commerçant : cette commande **n'apparaît pas encore** dans ses commandes (non payée).
- [ ] Client : payer en simulation → **Succès** → commande « Payée », page de succès.
- [ ] Client : 2ᵉ commande → paiement simulé en **Échec** → message d'échec, commande « Échouée ».
- [ ] Client : 3ᵉ commande → **Annuler** avant paiement → « Annulée ». Une commande **payée** ne peut plus être annulée.
- [ ] Stock du produit : diminué pour les commandes payées, rétabli pour l'annulée / échouée.

## 4. Préparation par le commerçant

- [ ] Commerçant : la commande payée apparaît ; le détail ne montre **ni téléphone, ni adresse exacte, ni code** du client (seulement prénom, initiale, ville).
- [ ] Commerçant : « Passer en préparation » → statut « En préparation ». Refaire l'action → refusée.

## 5. Livraison (livreur)

- [ ] Livreur : « Missions disponibles » → la mission apparaît avec la zone seulement (pas de téléphone ni d'adresse exacte), jamais le code.
- [ ] Livreur : accepter → la mission passe « En cours » ; maintenant il voit le téléphone et l'adresse du client.
- [ ] Client : sa commande est « En cours de livraison » et le code à 6 chiffres est visible.
- [ ] Livreur : saisir un **mauvais code** → refusé, la livraison reste en cours.
- [ ] Livreur : saisir le **bon code** → livraison terminée ; la commande est « Livrée » côté client. Ressaisir le code → refusé.
- [ ] La livraison apparaît dans l'historique du livreur.

## 6. Portefeuilles (calculs)

Pour une commande de 10 000 Ar de sous-total, commission 10 % :

- [ ] Commerçant : solde = **9 000 Ar** (10 000 − 1 000), une ligne « Vente ».
- [ ] Livreur : solde = **2 000 Ar**, une ligne « Livraison ».
- [ ] Client : aucun gain (pas de portefeuille à retirer).
- [ ] Le client ne voit nulle part la commission ni la part du commerçant.
- [ ] Rejouer la confirmation de livraison ne crédite rien de plus.

## 7. Retraits SIMULÉS (commerçant, puis livreur)

- [ ] Le numéro de réception est affiché avec un cadenas et **ne peut pas être modifié** par l'utilisateur.
- [ ] Saisir un montant < 1 000 Ar → message d'erreur. Saisir plus que le disponible → message d'erreur.
- [ ] Montant **5 000** → « Continuer » → récapitulatif : reçoit 5 000, numéro, frais (2 % en simulation = 100), **débit total 5 100**.
- [ ] « Modifier le montant » ramène à la saisie.
- [ ] Confirmer avec un **mauvais mot de passe** → « Mot de passe incorrect », vous **restez connecté**, rien n'est débité.
- [ ] Confirmer avec le **bon mot de passe** → « Retrait effectué », solde réduit de 5 100, retrait « Réussi » dans l'historique.
- [ ] **E-mail reçu** pour ce retrait (montant, numéro, frais).
- [ ] 5 mauvais mots de passe de suite → blocage de 15 minutes (message clair) ; même le bon mot de passe est refusé pendant ce temps.
- [ ] Refaire un retrait pour le **livreur** (min 1 000 Ar sur 2 000 de solde) : même comportement.

## 8. Administration

- [ ] Admin : Commandes → la commande livrée s'ouvre (détail, paiement validé, livreur) **sans** le code de livraison.
- [ ] Admin : Paiements → le paiement de la commande est « Validé » avec la bonne commission.
- [ ] Admin : Retraits → les retraits du commerçant et du livreur sont listés.
- [ ] Admin : Journal d'activité → on retrouve : changement de statut de commande, de paiement, validation de boutique, `PAYOUT_REQUESTED`.
- [ ] Admin : Utilisateurs → colonne « N° de retrait » remplie pour le commerçant et le livreur.
- [ ] Admin : changer le numéro de retrait d'un compte (motif obligatoire) → message de succès, **e-mail reçu par le titulaire**, ligne `PAYOUT_PHONE_CHANGED` dans le journal.
- [ ] Admin : essayer de mettre sur un compte le numéro d'un autre compte → refusé.
- [ ] Commerçant : le nouveau numéro est affiché dans « Mes gains » ; le retrait suivant part vers ce nouveau numéro.
- [ ] Admin : suspendre un compte → ce compte ne peut plus se connecter ; le réactiver → il se reconnecte. L'admin ne peut pas modifier **son propre** statut.

---

# Partie B — Paiement RÉEL (GoalPay)

⚠️ De l'argent réel est en jeu : utilisez un **petit montant** et votre propre numéro Mobile Money. Les **retraits restent en simulation** (les vrais retraits GoalPay ne sont pas encore branchés).

## B0. Préparation

- [ ] Sauvegarde : notez les valeurs actuelles de `PAYMENT_MODE` et des clés GoalPay dans `.env`.
- [ ] Le backend doit être joignable **depuis Internet** pour recevoir la confirmation de GoalPay (webhook) : tunnel public vers le port 3000 (ex. ngrok / Cloudflare Tunnel), et l'URL publique correspondante renseignée là où GoalPay l'attend (variables de callback / `FRONTEND_URL` / URL du backend selon votre configuration).
- [ ] `PAYMENT_MODE=goalpay`, clés GoalPay en place, backend redémarré.
- [ ] Commerçant : publier un produit **à petit prix** (par exemple 200 à 500 Ar, selon le minimum accepté par GoalPay) pour ce test.

## B1. Paiement réel réussi

- [ ] Client : commander ce produit → page de paiement → redirection vers la page GoalPay.
- [ ] Payer avec le numéro Mobile Money du client et valider sur le téléphone.
- [ ] Retour sur le site : page « Paiement réussi ». La commande passe **Payée** (sans cliquer sur rien de plus).
- [ ] Le paiement apparaît « Validé » côté admin avec le bon montant (sous-total + frais de livraison + frais GoalPay payés par l'acheteur) et la bonne commission (10 % du sous-total).
- [ ] Le terminal du backend ne montre aucune erreur « montant/devise différents ».

## B2. Cas d'échec et d'abandon

- [ ] Client : commander à nouveau, **annuler** sur la page GoalPay → retour sur la page d'annulation, commande non payée.
- [ ] Client : paiement refusé / code erroné sur le téléphone → page d'échec, commande « Échouée ».
- [ ] Client : relancer le paiement d'une commande en attente → on retombe sur le **même** paiement (pas de doublon).

## B3. Suite du parcours avec l'argent réel

- [ ] Commerçant : prépare ; livreur : accepte et confirme avec le code → mêmes résultats qu'en partie A.
- [ ] Portefeuilles crédités (commerçant : sous-total − 10 %, livreur : 2 000).
- [ ] Retrait (simulé) du commerçant : fonctionne comme en section 7 (aucun argent réel ne bouge).

## B4. Retour à la normale

- [ ] Remettre `PAYMENT_MODE=simulation` (ou la valeur notée en B0), redémarrer le backend.
- [ ] Désactiver / supprimer le produit à petit prix si vous ne voulez pas qu'il reste en vente.

---

# Limites connues (à ne PAS compter comme des bugs de ce test)

- Livraison échouée : la mission passe en « Échec » mais la commande reste « En cours de livraison » (gestion à venir).
- Pas de remboursement automatique si un paiement arrive après expiration de la commande (cas relevé dans les journaux, à traiter à la main).
- Vrais retraits Mobile Money (GoalPay) : pas encore branchés, seule la simulation existe.
- Pas d'e-mail de notification pour les changements de statut de commande.

# Anomalies relevées

| # | Étape | Ce que j'ai fait | Ce qui s'est passé | Ce qui était attendu | Capture |
|---|-------|------------------|--------------------|----------------------|---------|
|   |       |                  |                    |                      |         |
