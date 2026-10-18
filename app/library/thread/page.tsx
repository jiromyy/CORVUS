import { Suspense } from "react";
import { ThreadView } from "@/components/ThreadView";

export const metadata = { title: "Interest thread — Corvus" };

export default function ThreadPage() {
  return (
    <Suspense fallback={<p className="loading-line">Connecting the thread…</p>}>
      <ThreadView />
    </Suspense>
  );
}
