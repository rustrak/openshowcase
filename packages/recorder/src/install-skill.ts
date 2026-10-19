import { cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The skill the published package ships next to this file (see rslib.config.ts). */
export const BUNDLED_SKILL_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "skill",
);

/** Copies the skill into `<project>/.claude/skills/openshowcase-demo`; resolves with its SKILL.md. */
export async function installSkill(
  projectDir: string,
  skillDir: string,
): Promise<string> {
  const dest = join(projectDir, ".claude", "skills", "openshowcase-demo");
  await cp(skillDir, dest, { recursive: true, force: true });
  return join(dest, "SKILL.md");
}
