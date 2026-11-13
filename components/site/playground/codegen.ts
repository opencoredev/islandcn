import { shadcnAdd } from "@/constants/site";

import { activitySource, buildNames } from "./activity";
import { type Imports, type RegistryItemName, indent, mergeImports } from "./content";
import type { Build } from "./model";
import { type Springs, motionPropSource } from "./motion";

/*
 * Turns a build into one file the user pastes into their app, and the shadcn
 * command that installs exactly the registry items that file imports.
 */

/** Install order: the engine, the shared kit, then the rest by name. */
const ITEM_ORDER = ["island-core", "island-content"] as const satisfies readonly RegistryItemName[];

const sortItems = (items: ReadonlySet<RegistryItemName>) => {
  const rest = [...items].filter((item) => !ITEM_ORDER.some((first) => first === item)).toSorted();
  return [...ITEM_ORDER.filter((item) => items.has(item)), ...rest];
};

/** react first, then packages, the engine, then the kit; names sorted, `type` ignored for order. */
const importLines = (all: Imports) => {
  const rank = (from: string) => (from === "react" ? 0 : from.startsWith("@/lib/") ? 2 : from.startsWith("@/") ? 3 : 1);
  return [...all.entries()]
    .toSorted(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([from, names]) => {
      const sorted = [...names].toSorted((a, b) => a.replace(/^type /, "").localeCompare(b.replace(/^type /, "")));
      return `import { ${sorted.join(", ")} } from "${from}";`;
    })
    .join("\n");
};

export interface GeneratedCode {
  /** The whole file. */
  code: string;
  /** `npx shadcn@latest add ...` for every item the file imports, then `npm install` for outside packages. */
  install: string;
  /** The registry items in `install`, in its order. */
  items: readonly RegistryItemName[];
  /** npm packages the file imports that no registry item installs, in `install`'s order. */
  packages: readonly string[];
}

export const FILE_NAME = "app-island.tsx";

export const generateCode = ({
  build,
  springs,
  reduced,
  registryUrl,
}: {
  build: Build;
  springs: Springs;
  reduced: boolean;
  registryUrl: string;
}): GeneratedCode => {
  const split = build.second !== null;
  const names = buildNames(build.primary, build.second);
  const primary = activitySource(build.primary, { priority: split ? 1 : null, names: names.primary });
  const second = build.second === null || names.second === null ? null : activitySource(build.second, { priority: null, names: names.second });
  const activities = second === null ? [primary] : [primary, second];

  const motion = motionPropSource(springs);
  const providerProps = [motion, reduced ? `reducedMotion="always"` : null].filter((prop): prop is string => prop !== null);
  const provider =
    providerProps.length === 0
      ? "<IslandProvider>"
      : `<IslandProvider\n${indent(providerProps.join("\n"), 4)}\n  >`;

  const imports = mergeImports([
    ...activities.map((activity) => activity.imports),
    new Map([
      ["react", new Set(["type ReactNode", "useEffect"])],
      ["@/lib/island", new Set(["Island", "IslandProvider"])],
    ]),
  ]);

  const items = new Set<RegistryItemName>();
  for (const activity of activities) for (const item of activity.items) items.add(item);
  const sorted = sortItems(items);

  const shows = activities.map((activity) => `    ${activity.local}.show(${activity.exampleArgument});`).join("\n");
  const dismisses = activities.map((activity) => `      ${activity.local}.dismiss();`).join("\n");
  const hooks = activities.map((activity) => `  const ${activity.local} = ${activity.hook}();`).join("\n");
  const deps = activities.map((activity) => activity.local).join(", ");

  const code = `"use client";

${importLines(imports)}

/*
 * Built in the islandcn playground. Wrap your app in <AppIsland> once, near
 * the root, then call the activity hooks from any component inside it.
 */
export const AppIsland = ({ children }: { children: ReactNode }) => (
  ${provider}
    <Island placement="viewport" />
    {children}
  </IslandProvider>
);

${activities.map((activity) => activity.source).join("\n\n")}

/**
 * Shows what you built as soon as it mounts${split ? ": the second activity splits the island" : ""}.
 * In your app, call show() and update() from the events that matter instead.
 */
export const IslandExample = () => {
${hooks}
  useEffect(() => {
${shows}
    return () => {
${dismisses}
    };
  }, [${deps}]);
  return null;
};
`;

  // An outside package no registry item installs has to be added by the command, or the pasted file
  // doesn't compile. Icons don't need one: the glyphs ship with island-content, which installs Hugeicons.
  const packages = [...imports.keys()].filter((from) => !from.startsWith("@/") && from !== "react").toSorted();
  const registry = shadcnAdd({ registryUrl, items: sorted });
  const install = packages.length === 0 ? registry : `${registry} && npm install ${packages.join(" ")}`;
  return { code, install, items: sorted, packages };
};
