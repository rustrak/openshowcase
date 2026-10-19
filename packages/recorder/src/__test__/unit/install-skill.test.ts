import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { installSkill } from "../../install-skill";

const skillDir = join(import.meta.dirname, "../../../skill");

describe("installSkill", () => {
  it("copies the skill into the project's .claude/skills", async () => {
    const project = mkdtempSync(join(tmpdir(), "project-"));
    const installed = await installSkill(project, skillDir);

    expect(installed).toBe(
      join(project, ".claude", "skills", "openshowcase-demo", "SKILL.md"),
    );
    expect(readFileSync(installed, "utf8")).toBe(
      readFileSync(join(skillDir, "SKILL.md"), "utf8"),
    );
  });

  it("updates a skill installed before", async () => {
    const project = mkdtempSync(join(tmpdir(), "project-"));
    const installed = await installSkill(project, skillDir);
    writeFileSync(installed, "old");
    await installSkill(project, skillDir);
    expect(readFileSync(installed, "utf8")).not.toBe("old");
  });

  it("ships a skill Claude Code can load (name + description frontmatter)", () => {
    const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    expect(existsSync(join(skillDir, "SKILL.md"))).toBe(true);
    expect(skill).toMatch(/^---\nname: openshowcase-demo\ndescription: .+\n/);
  });
});
