import { LibraryView } from "@/components/LibraryView";

export const metadata = { title: "Memory — Corvus" };

export default function LibraryPage() {
  return (
    <div className="content-wide">
      <header className="page-header">
        <div>
          <span className="eyebrow">Everything Corvus remembers</span>
          <h1>
            Your memory, <em>in context</em>
          </h1>
          <p>A timeline of what Corvus can support with evidence. Forgetting a memory removes it from every future answer.</p>
        </div>
      </header>
      <LibraryView />
    </div>
  );
}
