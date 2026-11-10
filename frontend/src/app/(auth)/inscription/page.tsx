import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function InscriptionPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-container-lowest p-3 sm:p-6 md:p-8">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-outline-variant/30 bg-surface shadow-sm">
        <div className="absolute left-0 top-0 h-1 w-full bg-primary" />

        <div className="p-5 sm:p-8 md:p-10">
          <div className="mb-6 text-center md:mb-8">
            <h1 className="text-xl font-bold leading-7 text-primary sm:text-2xl sm:leading-8 md:text-3xl md:leading-9.5">
              Bam&apos;S Market
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant md:text-base">
              Créez votre compte pour commencer
            </p>
          </div>

          <RegisterForm />

          <div className="mt-6 border-t border-outline-variant/30 pt-6 text-center md:mt-8">
            <p className="text-sm text-on-surface-variant">
              Vous avez déjà un compte ?{" "}
              <Link href="/connexion" className="font-semibold text-primary hover:underline">
                Connectez-vous
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
