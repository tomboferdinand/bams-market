import { redirect } from "next/navigation";

// Adresse de retour configurée chez GoalPay : renvoie vers la page de retour unique.
export default function Page() {
  redirect("/paiement/retour?r=canceled");
}
