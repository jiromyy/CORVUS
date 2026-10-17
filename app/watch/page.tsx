import { Suspense } from "react";
import { WatchView } from "@/components/WatchView";

export const metadata = { title: "Watch — Corvus" };

export default function WatchPage() {
  return (
    <Suspense fallback={<p className="animate-pulse text-[var(--muted)]">Loading the moment…</p>}>
      <WatchView />
    </Suspense>
  );
}
