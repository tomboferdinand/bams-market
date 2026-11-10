import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ReinitialiserMotDePassePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-container-lowest p-3 sm:p-6 md:p-8">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-outline-variant/30 bg-surface shadow-sm">
        <div className="absolute left-0 top-0 h-1 w-full bg-primary" />
        <div className="p-5 sm:p-8 md:p-10">
          <div className="mb-6 text-center md:mb-8">
            <h1 className="text-xl font-bold leading-7 text-primary sm:text-2xl sm:leading-8 md:text-3xl md:leading-9.5">
              Nouveau mot de passe
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant md:text-base">
              Choisissez un nouveau mot de passe pour votre compte.
            </p>
          </div>

          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 border-t border-outline-variant/30 pt-6 text-center md:mt-8">
            <Link href="/connexion" className="text-sm font-semibold text-primary hover:underline">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
