import Image from "next/image";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function ConnexionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-container-low p-3 sm:p-6 md:p-8">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm md:min-h-150 md:flex-row">
        <div className="relative hidden min-h-150 w-1/2 md:block">
          <Image
            src="/images/auth/login-image.png"
            alt="Marché local de Fianarantsoa"
            fill
            sizes="50vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 text-white md:p-8">
            <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl md:leading-9.5">
              Bienvenue sur Bam&apos;S Market
            </h2>
            <p className="mt-2 max-w-sm text-sm text-white/90 md:text-base">
              Rejoignez la communauté et accédez aux meilleurs produits locaux de Fianarantsoa.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center p-5 sm:p-8 md:w-1/2 md:p-10 lg:p-12">
          <div className="mb-6 text-center md:mb-8 md:text-left">
            <Link href="/" className="mb-3 inline-flex items-center justify-center gap-2 text-xl font-bold text-primary sm:text-2xl md:mb-4 md:justify-start">
              <ShoppingBasket size={22} />
              Bam&apos;S Market
            </Link>
            <h1 className="text-xl font-bold leading-7 text-on-surface sm:text-2xl sm:leading-8 md:text-3xl md:leading-9.5">
              Connexion
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Entrez vos identifiants pour accéder à votre compte.
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 border-t border-outline-variant pt-4 text-center md:mt-8">
            <p className="text-sm text-on-surface-variant">
              Nouveau sur Bam&apos;S Market ?{" "}
              <Link href="/inscription" className="font-semibold text-primary hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
