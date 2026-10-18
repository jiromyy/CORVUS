import { ExtensionConnect } from "@/components/ExtensionConnect";
import { ImportView } from "@/components/ImportView";

export const metadata = { title: "Import — Corvus" };

export default function ImportPage() {
  return (
    <div className="content-wide">
      <header className="page-header">
        <div>
          <span className="eyebrow">Memory sources</span>
          <h1>
            Bring your own <em>history</em>
          </h1>
          <p>
            Import your Google Takeout so Corvus remembers what you actually watched and searched, then pair the extension to keep
            it current. It all goes into your private workspace on this browser, and you can delete it any time.
          </p>
        </div>
      </header>
      <ImportView />
      <div className="mt-10">
        <ExtensionConnect />
      </div>
    </div>
  );
}
