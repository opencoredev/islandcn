/**
 * Syntax colours for every code block on the site: the MDX docs (via
 * source.config.ts) and `CodeBlock`. One table, so both paths stay in step.
 *
 * GitHub's newer "default" themes keep every token at 4.5:1 or better on our
 * code backgrounds, except the light comment grey (#6e7781 measures 4.1:1 on
 * --site-code-bg). It is swapped for a darker grey of the same hue, 5.5:1.
 * The older github-light/github-dark pair measured 3.2:1 (orange parameters)
 * and 3.4:1 (dark comments).
 */
export const CODE_HIGHLIGHT = {
  themes: { light: "github-light-default", dark: "github-dark-default" },
  defaultColor: false,
  colorReplacements: { "github-light-default": { "#6e7781": "#59636e" } },
} as const satisfies {
  themes: { light: string; dark: string };
  defaultColor: false;
  colorReplacements: Record<string, Record<string, string>>;
};
