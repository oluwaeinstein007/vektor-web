// Regenerates ACCESS_MATRIX.md straight from the real nav config and RBAC
// model (lib/nav.ts, lib/rbac.ts, lib/roles.ts) — the same modules
// AppTopbar and RequireRole actually run against, not a hand-maintained
// description of them. Run after any change to NAV_ITEMS or the
// RoleRequirement tiers so this file can't silently drift from the code:
//   node --experimental-strip-types scripts/generate-access-matrix.ts
import { writeFile } from "node:fs/promises";
import { NAV_ITEMS } from "../src/lib/nav.ts";
import { satisfiesRequirement } from "../src/lib/rbac.ts";
import { ROLES, type Role } from "../src/lib/roles.ts";

function accessTable(): string {
  const header = `| Screen | Requires | ${ROLES.join(" | ")} |`;
  const divider = `|---|---|${ROLES.map(() => "---").join("|")}|`;
  const rows = NAV_ITEMS.map((item) => {
    const cells = ROLES.map((role: Role) => (satisfiesRequirement(role, item.requirement) ? "✓" : "—"));
    return `| ${item.label} (\`${item.href}\`) | \`${item.requirement}\` | ${cells.join(" | ")} |`;
  });
  return [header, divider, ...rows].join("\n");
}

function navByRole(): string {
  return ROLES.map((role) => {
    const visible = NAV_ITEMS.filter((item) => satisfiesRequirement(role, item.requirement));
    const list = visible.length > 0 ? visible.map((item) => `- ${item.label} (\`${item.href}\`)`).join("\n") : "- *(nothing beyond Settings)*";
    return `### ${role}\n\n${list}`;
  }).join("\n\n");
}

const generatedAt = new Date().toISOString();

const doc = `<!-- GENERATED FILE — do not hand-edit. Regenerate with:
     node --experimental-strip-types scripts/generate-access-matrix.ts
     Source of truth: src/lib/nav.ts + src/lib/rbac.ts + src/lib/roles.ts -->

# Access matrix

Generated ${generatedAt} from the same \`NAV_ITEMS\` / \`satisfiesRequirement\` code
AppTopbar and RequireRole actually run — this can't drift from what the app
does, only from having forgotten to re-run the generator after a nav change.

Settings isn't listed: it's the dev-auth bootstrap page, reachable with no
role at all, and isn't part of \`NAV_ITEMS\` for exactly that reason.

## By screen

${accessTable()}

## By role

${navByRole()}
`;

await writeFile(new URL("../ACCESS_MATRIX.md", import.meta.url), doc);
console.log("wrote ACCESS_MATRIX.md");
