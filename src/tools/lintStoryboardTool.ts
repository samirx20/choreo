import { useProjectStore } from "@/store/useProjectStore";
import { lintStoryboard as runLinter, LintReport } from "@/engine/perception/linter";
import { LintStoryboardInput, LintStoryboardInputSchema, ToolResult } from "@/types/agentTools";

/**
 * Agent Tool: lint_storyboard.
 * Pre-flight AST linter ensuring zero black frames, no ghost cards, no banned eyebrows,
 * and valid grid alignment.
 */
export function lintStoryboard(
  rawInput?: LintStoryboardInput,
  targetStore = useProjectStore
): ToolResult<LintReport> {
  const parseResult = LintStoryboardInputSchema.safeParse(rawInput || {});
  const input: LintStoryboardInput = parseResult.success ? parseResult.data : {};

  const state = targetStore.getState();
  const report = runLinter(state.document, {
    sceneId: input.sceneId,
    strictMode: input.strictMode,
  });

  const notices: string[] = [];
  if (report.errors.length > 0) {
    notices.push(`Found ${report.errors.length} fatal lint error(s).`);
  }
  if (report.warnings.length > 0) {
    notices.push(`Found ${report.warnings.length} craft warning(s).`);
  }

  return {
    success: report.valid,
    data: report,
    notices,
    error: report.valid ? undefined : `Storyboard failed lint check with score ${report.score}/100.`,
  };
}
