import { ExtensionConnect } from "@/components/ExtensionConnect";

export const metadata = { title: "Browser extension — Corvus" };

export default function ExtensionPage() {
  return (
    <div className="content-wide">
      <header className="page-header">
        <div>
          <span className="eyebrow">Forward memory</span>
          <h1>
            Bring Corvus into <em>your browser</em>
          </h1>
          <p>
            Capture new activity from this point forward: YouTube watches, Google searches, and the websites you approve in
            Privacy &amp; memory. You can pause it any time.
          </p>
        </div>
      </header>
      <ExtensionConnect />
    </div>
  );
}
