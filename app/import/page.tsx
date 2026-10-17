import { ExtensionConnect } from "@/components/ExtensionConnect";
import { ImportView } from "@/components/ImportView";

export const metadata = { title: "Import — Corvus" };

export default function ImportPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-semibold">Bring your own history</h1>
      <p className="mt-1 text-[var(--muted)]">
        Import your Google Takeout so Corvus can remember what you actually watched and searched. It goes into your private
        workspace on this browser, and you can delete it any time.
      </p>
      <div className="mt-6">
        <ImportView />
      </div>
      <div className="mt-10">
        <ExtensionConnect />
      </div>
    </div>
  );
}
