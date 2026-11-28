
import { Suspense } from "react";
import CheckoutContent from "./CheckoutContent";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p role="status">Loading checkout…</p>}>
      <CheckoutContent />
    </Suspense>
  );
}
export const metadata = { title: "Review and pay for your ride" };
