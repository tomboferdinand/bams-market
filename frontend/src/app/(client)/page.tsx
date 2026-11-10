import Image from "next/image";
import { Truck, ShieldCheck, Award } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { VerificationBanner } from "@/components/layout/verification-banner";
import { PopularProducts } from "@/components/products/popular-products";
import Link from "next/link";

const CATEGORIES = [
    { name: "Fruits & Légumes Frais", subtitle: "Arrivage quotidien", image: "/images/fruit-legume.jpg", span: true },
    { name: "Épicerie", subtitle: "L'essentiel du quotidien", image: "/images/epicerie.jpg", span: false },
];

export default function AccueilPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />

            <VerificationBanner />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
                {/* Hero */}
                <section className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm md:flex-row">
                    <div className="flex flex-1 flex-col justify-center p-8 md:p-12">
                        <span className="mb-4 w-max rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-primary">
                            Livraison Express Fianarantsoa
                        </span>
                        <h1 className="mb-4 max-w-lg text-3xl font-bold leading-tight text-on-surface md:text-4xl">
                            Vos produits locaux livrés chez vous.
                        </h1>
                        <p className="mb-6 max-w-md text-base text-on-surface-variant md:text-lg">
                            Découvrez la fraîcheur du marché et l&apos;artisanat local, commandez en ligne et
                            recevez tout à votre porte en toute sécurité.
                        </p>
                        <div className="flex gap-3">
                            <button className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container">
                                Commander
                            </button>
                            <button className="h-11 rounded-lg border border-outline px-6 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container">
                                Parcourir le catalogue
                            </button>
                        </div>
                    </div>
                    <div className="relative min-h-62.5 flex-1">
                        <Image
                            src="/images/produit-locaux.jpg"
                            alt="Produits locaux"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </section>

                {/* Réassurance */}
                <section className="grid grid-cols-1 gap-6 border-y border-outline-variant py-6 md:grid-cols-3">
                    {[
                        { icon: Truck, title: "Livraison Rapide", subtitle: "Dans tout Fianarantsoa" },
                        { icon: ShieldCheck, title: "Paiement Sécurisé", subtitle: "Via GoalPay & Mobile Money" },
                        { icon: Award, title: "Qualité Locale", subtitle: "Produits frais et sélectionnés" },
                    ].map(({ icon: Icon, title, subtitle }) => (
                        <div key={title} className="flex flex-col items-center gap-2 p-4 text-center">
                            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-primary">
                                <Icon size={22} />
                            </div>
                            <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
                            <p className="text-sm text-on-surface-variant">{subtitle}</p>
                        </div>
                    ))}
                </section>

                {/* Catégories — placeholder visuel, sera piloté par l'API à l'étape 2 */}
                <section>
                    <h2 className="mb-4 text-2xl font-bold text-on-surface">Nos Catégories</h2>
                    <div className="grid auto-rows-50 grid-cols-1 gap-6 md:grid-cols-3">
                        {CATEGORIES.map((cat) => (
                            <div
                                key={cat.name}
                                className={`group relative cursor-pointer overflow-hidden rounded-xl border border-outline-variant shadow-sm ${cat.span ? "md:col-span-2" : ""}`}
                            >
                                <Image
                                    src={cat.image}
                                    alt={cat.name}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-6">
                                    <h3 className="text-xl font-semibold text-white">{cat.name}</h3>
                                    <p className="text-sm text-white/80">{cat.subtitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Placeholder produits — sera remplacé par l'API catalogue à l'étape 2 */}
                <section>
                    <div className="mb-4 flex items-end justify-between">
                        <h2 className="text-2xl font-bold text-on-surface">Produits Populaires</h2>
                        <Link href="/catalogue" className="hidden text-sm font-semibold text-primary hover:underline md:block">
                            Voir tout
                        </Link>
                    </div>
                    <PopularProducts />
                </section>
            </main>

            <footer className="mt-auto flex w-full flex-col items-center gap-4 border-t border-outline-variant bg-surface-container-low px-4 py-8 md:flex-row md:justify-between md:px-8">
                <div className="flex flex-col items-center gap-1 md:items-start">
                    <span className="text-lg font-bold text-primary">Bam&apos;S Market</span>
                    <span className="text-sm text-on-surface-variant">© 2026 Bam&apos;S Market Fianarantsoa. Tous droits réservés.</span>
                </div>
                <nav className="flex flex-wrap justify-center gap-6 text-xs text-on-surface-variant">
                    <a href="#" className="hover:text-primary">À propos</a>
                    <a href="#" className="hover:text-primary">Mentions légales</a>
                    <a href="#" className="hover:text-primary">Contact</a>
                </nav>
            </footer>
        </div>
    );
}
