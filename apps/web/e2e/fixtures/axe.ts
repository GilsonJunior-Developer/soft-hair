import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export type AxeOptions = {
  /** CSS selectors to scope the scan (defaults to whole document). */
  include?: string | string[];
  /** CSS selectors to exclude (e.g. third-party widgets we don't own). */
  exclude?: string | string[];
  /** WCAG / best-practice tag set. Defaults to WCAG 2.1 AA. */
  tags?: string[];
  /** Minimum severity that fails the assertion (story HARD.1 AC2: 0 critical). */
  failOnImpact?: 'minor' | 'moderate' | 'serious' | 'critical';
};

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

/**
 * Run axe-core against the current page and assert the configured impact
 * threshold is not breached. Default: 0 critical violations (HARD.1 AC2).
 *
 * Source of truth: docs/front-end-spec.md#979 — "Accessibility violations
 * (axe) | 0 critical | CI gate".
 */
export async function assertNoA11yViolations(
  page: Page,
  options: AxeOptions = {},
): Promise<void> {
  const { include, exclude, tags = [...DEFAULT_TAGS], failOnImpact = 'critical' } = options;

  let builder = new AxeBuilder({ page }).withTags(tags);
  if (include) builder = builder.include(include as string);
  if (exclude) builder = builder.exclude(exclude as string);

  const { violations } = await builder.analyze();
  const impactRank: Record<NonNullable<AxeOptions['failOnImpact']>, number> = {
    minor: 1,
    moderate: 2,
    serious: 3,
    critical: 4,
  };
  const threshold = impactRank[failOnImpact];

  const blocking = violations.filter((v) => {
    const impact = (v.impact ?? 'minor') as keyof typeof impactRank;
    return impactRank[impact] >= threshold;
  });

  if (blocking.length > 0) {
    const summary = blocking
      .map(
        (v) =>
          `  - [${v.impact}] ${v.id}: ${v.help}\n    nodes: ${v.nodes.length}\n    docs: ${v.helpUrl}`,
      )
      .join('\n');
    throw new Error(
      `axe-core: ${blocking.length} ${failOnImpact}+ violation(s) on ${page.url()}\n${summary}`,
    );
  }
}
