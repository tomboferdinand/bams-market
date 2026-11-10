"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Search, LogIn } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/auth-context";
import { useCart } from "@/features/cart/cart-context";
import { accountLinkFor } from "@/features/auth/account-menu";

export function SiteHeader() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Le panier est réservé aux clients : on le masque pour les autres rôles connectés.
  const canUseCart = !user || user.role === "CLIENT";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-outline-variant bg-surface px-4 py-4 shadow-sm backdrop-blur-sm md:px-8">
      <span className="text-2xl font-bold text-primary">Bam&apos;S Market</span>

      <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
        <Link
          href="/"
          className={pathname === "/" ? "border-b-2 border-primary pb-1 text-primary" : "text-on-surface-variant transition-colors hover:text-primary"}
        >
          Accueil
        </Link>
        <Link
          href="/catalogue"
          className={pathname === "/catalogue" ? "border-b-2 border-primary pb-1 text-primary" : "text-on-surface-variant transition-colors hover:text-primary"}
        >
          Catalogue
        </Link>
        {user?.role === "CLIENT" && (
          <Link
            href="/commande"
            className={pathname.startsWith("/commande") ? "border-b-2 border-primary pb-1 text-primary" : "text-on-surface-variant transition-colors hover:text-primary"}
          >
            Mes Commandes
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-3">
        <div className="hidden items-center rounded-full border border-outline-variant bg-surface-container px-4 py-2 shadow-sm md:flex">
          <Search size={18} className="mr-2 text-on-surface-variant" />
          <input
            placeholder="Rechercher..."
            className="w-48 border-none bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
          />
        </div>

        {canUseCart && (
          <Link
            href="/panier"
            aria-label="Panier"
            className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          >
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
        )}

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu du compte"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full p-1 hover:bg-surface-container"
            >
              <Avatar name={`${user.firstName} ${user.lastName}`} role={user.role} size={36} />
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-56 rounded-lg border border-outline-variant bg-surface shadow-lg">
                <div className="border-b border-outline-variant px-4 py-3 text-sm">
                  <p className="font-semibold text-on-surface">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-on-surface-variant">{user.email ?? user.phone}</p>
                </div>
                <Link
                  href={accountLinkFor(user.role).href}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container"
                >
                  {accountLinkFor(user.role).label}
                </Link>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-error hover:bg-error-container/20"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/connexion"
            className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary md:flex"
          >
            <LogIn size={18} />
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
