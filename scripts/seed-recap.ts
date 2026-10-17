/**
 * Pre-generates Maya's demo recap so the live demo plays instantly.
 *   npm run seed:recap            (English)
 *   npm run seed:recap -- fil     (Filipino)
 */
import { dayRange, namedRanges } from "../lib/dates";
import { createRecap } from "../lib/recap";
import { DEMO_WORKSPACE } from "./seed/demo-data";

async function main() {
  const language = process.argv[2] === "fil" ? "fil" : "en";
  const r = namedRanges();
  const range = dayRange(r.last30Days.from, r.today);
  const t = Date.now();
  const recap = await createRecap({
    ownerWorkspaceId: DEMO_WORKSPACE,
    workspaceIds: [DEMO_WORKSPACE],
    hidden: new Set(),
    from: range.from!,
    to: range.to!,
    language,
    focus: "Learning basic Python programming",
  });
  console.log(`${recap.id} "${recap.title}" ${recap.durationSeconds}s in ${((Date.now() - t) / 1000).toFixed(0)}s`);
  for (const c of recap.chapters) console.log(`  ${c.startSeconds.toFixed(1)}s  ${c.title}  [${c.memoryIds.length} sources]\n     ${c.text}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
