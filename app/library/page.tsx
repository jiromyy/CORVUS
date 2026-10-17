import { LibraryView } from "@/components/LibraryView";

export const metadata = { title: "Memory — Corvus" };

export default function LibraryPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Your memory</h1>
      <p className="mt-1 text-[var(--muted)]">
        Everything Corvus remembers. Deleting a memory removes it from every future answer.
      </p>
      <div className="mt-6">
        <LibraryView />
      </div>
    </div>
  );
}
