import { Suspense } from "react";
import { RecapView } from "@/components/RecapView";

export const metadata = { title: "Recap — Corvus" };

export default function RecapPage() {
  return (
    <Suspense fallback={<p className="animate-pulse text-[var(--muted)]">Loading your recap…</p>}>
      <RecapView />
    </Suspense>
  );
}
