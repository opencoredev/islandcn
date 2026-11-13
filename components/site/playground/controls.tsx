"use client";

import { type CSSProperties, type ReactNode, useId, useRef, useState } from "react";

import { cn } from "@/components/site/cn";

import { IconArt } from "./content";
import styles from "./controls.module.css";
import { ICON_NAMES, type IconName } from "./model";
import { useRevealOnOpen } from "./reveal";

/*
 * The inspector's controls, one set: every field, menu, segmented control and
 * button is 32 pt tall with an 8 pt radius (6 inside a 2 pt inset), fills
 * instead of borders, 13 pt text (16 on phones, so focusing a field never
 * zooms the page). Type runs in three steps: 15 semibold section titles,
 * 13 regular labels in ink, 12 hints in grey.
 */

/** Spring-like ease for chrome that moves: fast start, long soft landing. */
export const EASE_OUT = "cubic-bezier(0.23,1,0.32,1)";

export const inputClass =
  "h-8 w-full min-w-0 rounded-[8px] bg-site-fill px-2.5 text-[16px] text-site-ink outline-offset-1 transition-[background-color] duration-150 ease-out placeholder:text-site-muted hover:bg-[color-mix(in_oklab,var(--site-fill),var(--site-ink)_4%)] sm:text-[13px]";

/** A secondary action inside the inspector: same height and radius as a field. */
export const fieldButton =
  "inline-flex h-8 flex-none cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-site-fill px-3 text-[13px] font-medium whitespace-nowrap text-site-ink outline-offset-1 transition-[background-color,opacity,scale] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--site-fill),var(--site-ink)_6%)] active:scale-[0.96] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-site-fill disabled:active:scale-100";

/** A text-only action, for section headers and lists: no fill until hovered. */
export const textButton =
  "inline-flex h-7 flex-none cursor-pointer items-center gap-1 rounded-[7px] px-2 text-[13px] font-medium whitespace-nowrap text-site-muted outline-offset-1 transition-[background-color,color,opacity,scale] duration-150 ease-out hover:bg-site-fill hover:text-site-ink active:scale-[0.96] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-site-muted disabled:active:scale-100";

/** The label above a control. */
export const labelClass = "text-[13px] leading-[18px] text-site-ink";

/** A hint under a control, or a note in a section. */
export const hintClass = "text-[12px] leading-[17px] text-pretty text-site-muted";

interface SectionProps {
  /** The section's heading. */
  title: string;
  /** One line under the heading. Defaults to none. */
  description?: ReactNode;
  /** A control at the heading's end, such as a reset. Defaults to none. */
  action?: ReactNode;
  children: ReactNode;
  /** Defaults to none. */
  className?: string;
}

export const Section = ({ title, description, action, children, className }: SectionProps) => (
  // Scrolled to, its title lands below the panel's top fade (lg) or the folded phone strip and its fade.
  <section className={cn("flex min-w-0 scroll-mt-4 flex-col gap-4 border-t border-site-line px-5 pt-4 pb-5 first:border-t-0 max-lg:scroll-mt-[216px]", className)}>
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h3 className="text-[15px] leading-5 font-semibold tracking-[-0.01em] text-site-ink">{title}</h3>
        {action}
      </div>
      {description === undefined ? null : <p className={hintClass}>{description}</p>}
    </div>
    {children}
  </section>
);

interface DisclosureProps {
  /** The heading, which is also the button that opens it. */
  title: string;
  /** Shown beside the title while closed, so it says what's inside. Defaults to none. */
  summary?: ReactNode;
  /** Defaults to false. */
  defaultOpen?: boolean;
  /** The rows bring their own padding and dividers (sections inside). Defaults to false. */
  flush?: boolean;
  children: ReactNode;
}

/**
 * A section that opens in place, for what most visitors never need to touch.
 * The rows ease open on a grid track; closed content is inert, so tabbing
 * skips it.
 */
export const Disclosure = ({ title, summary, defaultOpen = false, flush = false, children }: DisclosureProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const section = useRef<HTMLElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  // Opened near the window's foot, the page scrolls until its rows show: their final foot is the
  // heading's foot plus their own height, though the track is still easing open.
  useRevealOnOpen(open, () => {
    const heading = section.current?.firstElementChild;
    const rows = body.current;
    if (!heading || !rows) return null;
    const head = heading.getBoundingClientRect();
    return { top: head.top, bottom: head.bottom + rows.offsetHeight };
  });
  return (
    <section ref={section} className="flex min-w-0 scroll-mt-4 flex-col border-t border-site-line first:border-t-0 max-lg:scroll-mt-[216px]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="group flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-5 text-left outline-offset-[-2px]"
        >
          <span className="text-[15px] leading-5 font-semibold tracking-[-0.01em] text-site-ink">{title}</span>
          <span className={cn("min-w-0 flex-1 truncate text-right text-[12px] text-site-muted transition-opacity duration-200 ease-out", open ? "opacity-0" : "opacity-100")}>
            {summary}
          </span>
          <Chevron className={cn("flex-none text-site-muted transition-transform duration-300 group-hover:text-site-ink motion-reduce:transition-none", open ? "rotate-90" : "")} />
        </button>
      </h3>
      <div
        id={id}
        inert={!open}
        className="grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, transitionTimingFunction: EASE_OUT }}
      >
        <div className="min-h-0 overflow-hidden">
          <div ref={body} className={cn("flex min-w-0 flex-col", flush ? "border-t border-site-line" : "gap-4 px-5 pt-0.5 pb-5")}>{children}</div>
        </div>
      </div>
    </section>
  );
};

const Chevron = ({ className }: { className?: string }) => (
  <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} style={{ transitionTimingFunction: EASE_OUT }}>
    <path d="M4.5 2.5 8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface FieldProps {
  label: string;
  /** The input the label names. Defaults to none (the label is plain text). */
  htmlFor?: string;
  /** A reading at the label's end, such as a slider's value. Defaults to none. */
  value?: string;
  /** Defaults to none. */
  hint?: ReactNode;
  /** Id for the hint, so the control can point at it. Defaults to none. */
  hintId?: string;
  children: ReactNode;
}

export const Field = ({ label, htmlFor, value, hint, hintId, children }: FieldProps) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {value === undefined ? null : <span className="text-[13px] text-site-muted tabular-nums">{value}</span>}
    </div>
    {children}
    {hint === undefined ? null : (
      <p id={hintId} className={hintClass}>
        {hint}
      </p>
    )}
  </div>
);

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when the field loses focus, to tidy what was typed. Defaults to none. */
  onCommit?: (value: string) => void;
  /** Longest text accepted. Defaults to 60. */
  max?: number;
  /** Defaults to none. */
  hint?: ReactNode;
  /** Defaults to none. */
  placeholder?: string;
  /** Marks the field as needing a fix; the hint says what. Defaults to false. */
  invalid?: boolean;
  /** Monospaced, for identifiers. Defaults to false. */
  mono?: boolean;
  /**
   * Sample words the field may still hold. Focusing it while it holds one selects it all, so the
   * first keystroke replaces the sample. Defaults to none.
   */
  samples?: ReadonlySet<string>;
}

/**
 * How full a field gets before it shows its count: from three quarters of `max`, so the limit is
 * never a surprise (a 40-character title stopped mid-word with nothing to say why).
 */
const COUNT_FROM = 0.75;

export const TextField = ({ label, value, onChange, onCommit, max = 60, hint, placeholder, invalid = false, mono = false, samples }: TextFieldProps) => {
  const id = useId();
  // Set when focus selected a sample, so the click's own mouseup doesn't drop the selection for a caret.
  const selectedOnFocus = useRef(false);
  const hintId = `${id}-hint`;
  const counted = value.length >= Math.ceil(max * COUNT_FROM);
  return (
    <Field label={label} htmlFor={id} value={counted ? `${value.length}/${max}` : undefined} hint={hint} hintId={hint === undefined ? undefined : hintId}>
      <input
        id={id}
        className={cn(inputClass, mono && "font-mono sm:text-[12.5px]", invalid && "shadow-[inset_0_0_0_1px_#ff9f0a]")}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        aria-describedby={hint === undefined ? undefined : hintId}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          if (samples?.has(event.currentTarget.value) !== true) return;
          event.currentTarget.select();
          selectedOnFocus.current = true;
        }}
        onMouseUp={(event) => {
          if (!selectedOnFocus.current) return;
          selectedOnFocus.current = false;
          event.preventDefault();
        }}
        onBlur={(event) => {
          selectedOnFocus.current = false;
          onCommit?.(event.target.value);
        }}
      />
    </Field>
  );
};

interface SliderProps {
  label: string;
  value: number;
  /** The reading shown at the label's end. */
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export const Slider = ({ label, value, display, min, max, step, onChange }: SliderProps) => {
  const id = useId();
  const fill = max === min ? 0 : (value - min) / (max - min);
  // The track paints ink up to the knob's centre (WebKit has no ::-moz-range-progress). See `.range` for why it is a fraction.
  const fillStyle: CSSProperties & Record<"--fill", string> = { "--fill": String(fill) };
  return (
    <Field label={label} htmlFor={id} value={display}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(event) => onChange(Number(event.target.value))}
        className={styles.range}
        style={fillStyle}
      />
    </Field>
  );
};

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  /** Spoken name of the group. */
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export const Segmented = <T extends string>({ label, options, value, onChange }: SegmentedProps<T>) => {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="grid h-8 auto-cols-fr grid-flow-col gap-0.5 rounded-[8px] bg-site-fill p-[2px]">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "relative grid min-w-0 cursor-pointer place-items-center rounded-[6px] px-2 text-[13px] transition-[background-color,color,box-shadow] duration-150 ease-out",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-site-focus",
            option.value === value
              ? "bg-site-raised font-medium text-site-ink shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.12)]"
              : "text-site-muted hover:text-site-ink",
          )}
        >
          <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)} className="sr-only" />
          <span className="truncate">{option.label}</span>
        </label>
      ))}
    </div>
  );
};

interface SelectProps<T extends string> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Defaults to none. */
  hint?: ReactNode;
  /** Hide the label visually (it stays spoken), when a heading already names the menu. Defaults to false. */
  hideLabel?: boolean;
}

export const Select = <T extends string>({ label, options, value, onChange, hint, hideLabel = false }: SelectProps<T>) => {
  const id = useId();
  const menu = (
    <span className="relative flex min-w-0">
      <select
        id={id}
        value={value}
        aria-label={hideLabel ? label : undefined}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value);
          if (next) onChange(next.value);
        }}
        className={cn(inputClass, styles.select)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <UpDown className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-site-muted" />
    </span>
  );
  if (hideLabel) return menu;
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      {menu}
    </Field>
  );
};

/** The pop-up button's double chevron. */
const UpDown = ({ className }: { className?: string }) => (
  <svg aria-hidden width="10" height="14" viewBox="0 0 10 14" fill="none" className={className}>
    <path d="M2 5 5 2l3 3M2 9l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * The current icon on a button; pressing it opens the grid in place below.
 * `allowNone` adds a first cell that clears the icon.
 */
export const IconPicker = ({
  label,
  value,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: IconName | null;
  onChange: (icon: IconName | null) => void;
  allowNone?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const gridId = useId();
  const root = useRef<HTMLDivElement | null>(null);
  const grid = useRef<HTMLDivElement | null>(null);
  // The grid opens in place under the button; near the window's foot the page scrolls until all of it shows.
  useRevealOnOpen(open, () => {
    const from = root.current;
    const to = grid.current;
    if (!from || !to) return null;
    return { top: from.getBoundingClientRect().top, bottom: to.getBoundingClientRect().bottom };
  });
  return (
    <div ref={root} className="flex min-w-0 flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={gridId}
        onClick={() => setOpen((current) => !current)}
        className={cn(inputClass, "flex cursor-pointer items-center gap-2 text-left sm:text-[13px]")}
      >
        {value === null ? <span className="size-4 rounded-full border border-dashed border-site-muted" /> : <IconArt name={value} size={16} />}
        <span className="min-w-0 flex-1 truncate">{value === null ? "None" : splitWords(value)}</span>
        <span aria-hidden className={cn("text-site-muted transition-transform duration-200 motion-reduce:transition-none", open ? "rotate-180" : "")} style={{ transitionTimingFunction: EASE_OUT }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div ref={grid} id={gridId} hidden={!open} role="radiogroup" aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(34px,1fr))] gap-0.5 rounded-[10px] bg-site-fill p-[3px]">
        {allowNone ? (
          <IconCell label="None" selected={value === null} onSelect={() => {
            onChange(null);
            setOpen(false);
          }}>
            <span className="size-4 rounded-full border border-dashed border-current" />
          </IconCell>
        ) : null}
        {ICON_NAMES.map((name) => {
          return (
            <IconCell key={name} label={splitWords(name)} selected={value === name} onSelect={() => {
              onChange(name);
              setOpen(false);
            }}>
              <IconArt name={name} size={18} />
            </IconCell>
          );
        })}
      </div>
    </div>
  );
};

const IconCell = ({ label, selected, onSelect, children }: { label: string; selected: boolean; onSelect: () => void; children: ReactNode }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-label={label}
    title={label}
    onClick={onSelect}
    className={cn(
      "grid aspect-square cursor-pointer place-items-center rounded-[6px] outline-offset-0 transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
      selected ? "bg-site-raised text-site-ink shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.12)]" : "text-site-muted hover:bg-site-ink/[0.05] hover:text-site-ink",
    )}
  >
    {children}
  </button>
);

/** `CloudArrowUp` to `Cloud arrow up`. */
export const splitWords = (name: string) => {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};
