/**
 * The presets track C ships in `components/islandcn/`, in gallery order. The
 * site uses this table for the gallery, the home index, the docs and the
 * sitemap; each preset's docs page lives at `docs/content/presets/<slug>.mdx`.
 *
 * `slug` is the docs URL and the key the site uses everywhere. `item` is the
 * registry item (`<REGISTRY_URL>/<item>.json`) and `file` the path it writes.
 * `presentation` is the view the preset rests in.
 */

export const PRESENTATIONS = ["idle", "compact", "minimal", "expanded"] as const;

export type Presentation = (typeof PRESENTATIONS)[number];

export interface PresetInfo {
  /** Docs slug and site key, kebab-case. */
  readonly slug: string;
  /** Registry item name. */
  readonly item: string;
  /** Path the item writes in the user's project. */
  readonly file: string;
  /** Main export the docs show in usage. */
  readonly exportName: string;
  readonly title: string;
  /** One sentence, the same as the docs page description. */
  readonly purpose: string;
  readonly presentation: Presentation;
}

export const PRESETS = [
  {
    slug: "upload",
    item: "upload-activity",
    file: "components/islandcn/upload-activity.tsx",
    exportName: "UploadActivity",
    title: "Upload",
    purpose: "A photo or file upload, as a posting app shows it: the thumbnail, a ring with the percentage, and a check when it lands.",
    presentation: "compact",
  },
  {
    slug: "timer",
    item: "timer-activity",
    file: "components/islandcn/timer-activity.tsx",
    exportName: "TimerActivity",
    title: "Timer",
    purpose: "A countdown with the time left on the trailing side and pause and cancel buttons when expanded.",
    presentation: "compact",
  },
  {
    slug: "now-playing",
    item: "now-playing-activity",
    file: "components/islandcn/now-playing-activity.tsx",
    exportName: "NowPlayingActivity",
    title: "Now playing",
    purpose: "Artwork on the leading side, a live level meter on the trailing side, transport controls when expanded.",
    presentation: "compact",
  },
  {
    slug: "incoming-call",
    item: "call-activity",
    file: "components/islandcn/call-activity.tsx",
    exportName: "CallActivity",
    title: "Incoming call",
    purpose: "A caller's name with accept and decline buttons, expanded while it rings, then a call timer.",
    presentation: "expanded",
  },
  {
    slug: "eta",
    item: "eta-activity",
    file: "components/islandcn/eta-activity.tsx",
    exportName: "EtaActivity",
    title: "Ride or delivery ETA",
    purpose: "Minutes until a ride or delivery arrives, with the driver, plate and a message button when expanded.",
    presentation: "compact",
  },
  {
    slug: "recording",
    item: "recording-activity",
    file: "components/islandcn/recording-activity.tsx",
    exportName: "RecordingActivity",
    title: "Recording",
    purpose: "A recording indicator with an elapsed timer and a level meter, for audio, screen or camera capture.",
    presentation: "compact",
  },
  {
    slug: "transfer",
    item: "nearby-transfer-activity",
    file: "components/islandcn/nearby-transfer-activity.tsx",
    exportName: "NearbyTransferActivity",
    title: "Nearby transfer",
    purpose: "A photo or file going to a device nearby, or coming from it: who it goes to, the photo on its corner, and a ring with a stop button.",
    presentation: "compact",
  },
  {
    slug: "battery",
    item: "battery-activity",
    file: "components/islandcn/battery-activity.tsx",
    exportName: "BatteryActivity",
    title: "Battery",
    purpose: "Charge level and charging state, shown briefly when power connects or runs low.",
    presentation: "compact",
  },
  {
    slug: "split",
    item: "split-demo",
    file: "examples/split-demo.tsx",
    exportName: "SplitDemo",
    title: "Split",
    purpose: "Two activities at once: one stays attached to the pill, the other moves to a capsule beside it.",
    presentation: "minimal",
  },
] as const satisfies readonly PresetInfo[];

export type PresetSlug = (typeof PRESETS)[number]["slug"];

export const presetBySlug = (slug: string): PresetInfo | undefined => PRESETS.find((preset) => preset.slug === slug);

export const isPresetSlug = (value: string): value is PresetSlug => PRESETS.some((preset) => preset.slug === value);
