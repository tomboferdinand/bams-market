# Bam'S Market

Place de marché multi-vendeurs pour **Fianarantsoa (Madagascar)** : des commerçants vendent leurs produits, des clients les commandent et paient par Mobile Money, des livreurs les acheminent.

Projet de soutenance (ENI Fianarantsoa) conçu pour pouvoir être utilisé réellement.

## Ce que fait la plateforme

| Acteur | Fonctions principales |
|---|---|
| **Client** | Catalogue et recherche, panier (une boutique par commande), commande, paiement Mobile Money, suivi, annulation, code de livraison, « Commander à nouveau » |
| **Commerçant** | Boutique, produits et stock, commandes payées, préparation, portefeuille et retraits |
| **Livreur** | Missions disponibles, prise en charge, confirmation par code, déclaration « livraison impossible », portefeuille et retraits |
| **Administrateur** | Validation des boutiques, demandes de rôle, utilisateurs, catégories, commandes, paiements, retraits, remboursements, journal d'audit |

Règles clés : commission de 10 % sur le sous-total, frais de passerelle à la charge de l'acheteur, livreur payé à la livraison confirmée, stock réservé dès la commande puis restitué en cas d'annulation, d'expiration ou de livraison échouée, remboursement enregistré une seule fois par commande.

## Technologies

- **Frontend** : Next.js (App Router), React, Tailwind CSS, react-hook-form + zod
- **Backend** : NestJS, Prisma, PostgreSQL
- **Paiement** : GoalPay (Mobile Money), avec un mode de simulation pour les démonstrations
- **Tests** : Jest (unitaires et de bout en bout), Vitest, Playwright

## Installation

Prérequis : Node.js 20+, PostgreSQL.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # puis remplir les valeurs (voir le fichier)
npx prisma migrate deploy   # crée les tables
npx prisma generate         # génère le client Prisma
npm run create-admin        # crée le compte administrateur (variables ADMIN_*)
npm run start:dev           # API sur http://localhost:3000/api
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                 # site sur http://localhost:3001
```

## Tests

```bash
# backend
npm test                    # tests unitaires
npm run test:e2e            # parcours de bout en bout (base de test dédiée)

# frontend
npx vitest run              # tests unitaires
npx playwright test         # parcours navigateur (lance le backend compilé : `npm run build` dans backend/ avant)
```

## Mode démonstration

Avec `PAYMENT_MODE=simulation` et `PAYOUT_MODE=simulation`, le paiement et les retraits sont simulés : le parcours complet (commande, paiement, préparation, livraison, crédit, retrait) se déroule sans argent réel. Pour un usage réel, passer `PAYMENT_MODE=goalpay` et renseigner les clés GoalPay.

## Documentation

Le cahier des charges est dans [`docs/cahier-des-charges`](docs/cahier-des-charges) : vision, charte, parties prenantes, backlog, règles métier, cas d'utilisation. L'état d'avancement et les perspectives sont dans [`docs/etat-avancement-et-perspectives.md`](docs/etat-avancement-et-perspectives.md).

## Sécurité

Les secrets (`.env`, clés, jetons) ne sont jamais publiés : ils sont exclus par `.gitignore`. Le fichier `.env.example` ne contient que des valeurs d'exemple.

## Licence

Voir [LICENSE](LICENSE).
