import { ForYouPanel } from "@/components/ForYouPanel";

export const metadata = { title: "For you — Corvus" };

export default function ForYouPage() {
  return (
    <div className="content-wide foryou-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Your personal algorithm</span>
          <h1>
            Worth your attention <em>next</em>
          </h1>
          <p>
            Ranked from what you’ve been learning and the context you choose, not optimised for endless watch time. Every
            suggestion says why it’s here.
          </p>
        </div>
      </header>
      <ForYouPanel />
    </div>
  );
}
