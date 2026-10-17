import { Suspense } from "react";
import { ReadView } from "@/components/ReadView";

export const metadata = { title: "Read — Corvus" };

export default function ReadPage() {
  return (
    <Suspense fallback={<p className="animate-pulse text-[var(--muted)]">Loading…</p>}>
      <ReadView />
    </Suspense>
  );
}
