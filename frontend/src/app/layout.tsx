import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/features/auth/auth-context";
import "../styles/globals.css";
import { CartProvider } from "@/features/cart/cart-context";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Bam'S Market",
  description: "Achetez sans vous déplacer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={geist.variable}>
      <body>
        <AuthProvider>
           <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}