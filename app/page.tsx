import { AskPanel } from "@/components/AskPanel";
import { ForYouPanel } from "@/components/ForYouPanel";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Remember the idea. Recover the source.</h1>
      <p className="mt-3 text-[var(--muted)]">
        Ask about anything you watched, searched, or read — in English or Filipino — and jump back to the exact moment.
      </p>
      <div className="mt-8">
        <AskPanel />
      </div>
      <ForYouPanel />
    </div>
  );
}
