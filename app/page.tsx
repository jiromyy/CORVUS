import { AskPanel } from "@/components/AskPanel";
import { ForYouPanel } from "@/components/ForYouPanel";
import { Welcome } from "@/components/Welcome";

export default function Home() {
  return (
    <div className="content-narrow">
      <Welcome />
      <AskPanel />
      <ForYouPanel />
    </div>
  );
}
