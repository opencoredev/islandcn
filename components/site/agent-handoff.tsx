import { useId } from "react";

import { type Assistant, agentPrompt, assistantLink } from "@/lib/agent-discovery/agent-prompt";

import { BrandMark, type BrandMarkName } from "./brand-marks";
import { CopyButton } from "./copy-button";

interface AssistantEntry {
  assistant: Assistant;
  /** The product's mark, when we have one we may use. ChatGPT goes by its name only: see brand-marks.tsx. */
  mark: BrandMarkName | null;
  name: string;
}

const ASSISTANTS = [
  { assistant: "claude", mark: "claude", name: "Claude" },
  { assistant: "chatgpt", mark: null, name: "ChatGPT" },
] as const satisfies readonly AssistantEntry[];

/*
 * One segment of the track. The site's controls sit on a fill with a raised thumb, so a hovered
 * segment lifts to the raised surface rather than darkening. Quieter than the playground button
 * on purpose: muted 13 px text on a fill, no ink. The segment is drawn 32 px tall, but its
 * touch area reaches 44 px (6 px above and below, never sideways into its neighbour). The press
 * shrink is left out under reduced motion.
 */
const segment =
  "relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-site-muted transition-[color,background-color,box-shadow] duration-150 ease-out after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:bg-site-raised hover:text-site-ink hover:shadow-[0_1px_2px_rgb(0_0_0/0.08)] motion-safe:transition-[color,background-color,box-shadow,scale] motion-safe:active:scale-[0.96]";

/**
 * Hands islandcn to a coding agent: copy a short prompt, or open it in Claude or ChatGPT with the
 * prompt already in the box. The prompt is built on the server, from `SITE_URL`.
 */
export const AgentHandoff = () => {
  const labelId = useId();
  const prompt = agentPrompt();
  return (
    /*
     * On a phone, and up to md, it sits on its own line under the two calls, with a line that
     * says what it is for (between sm and md the row would squeeze the playground button onto two
     * lines). From md it joins their row after a hairline, so it shows on the first screen at
     * 1440x900 too, and the line becomes the group's name for screen readers only.
     */
    <div className="mt-2 flex flex-col items-center gap-2 sm:mt-1 sm:basis-full md:mt-0 md:basis-auto md:flex-row md:gap-0">
      <span aria-hidden className="hidden h-6 w-px bg-site-line md:mr-5 md:block" />
      <p id={labelId} className="text-[13px] text-site-muted md:sr-only">
        Using a coding agent?
      </p>
      <div role="group" aria-labelledby={labelId} className="inline-flex items-center rounded-full bg-site-fill p-[3px]">
        <CopyButton
          value={prompt}
          label="Copy prompt for your coding agent"
          failHint="Couldn't copy. Open it in Claude or ChatGPT"
          feedback="inline"
          text="Copy prompt"
          buttonClassName={`${segment} pr-3 pl-2.5`}
        />
        {ASSISTANTS.map((entry) => (
          <a
            key={entry.assistant}
            href={assistantLink({ assistant: entry.assistant, prompt })}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open in ${entry.name} (new tab)`}
            className={segment}
          >
            {entry.mark === null ? null : <BrandMark name={entry.mark} />}
            {entry.name}
          </a>
        ))}
      </div>
    </div>
  );
};
