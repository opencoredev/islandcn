/*
 * The sample copy every preset demo shows. The gallery's demos and the
 * playground's starting points both read it, so a preset opened in the
 * playground says what it said in the gallery.
 */

/*
 * The cats in the upload and transfer samples are photographs generated for this site
 * (public/samples/), not stock or anyone's real pet: a real photo makes the thumbnail read as
 * the thing being sent, where a glyph read as an abstract progress bar.
 */
export const samplePhotos = {
  mochi: { name: "mochi-asleep.jpg", src: "/samples/mochi-asleep.jpg" },
  biscuit: { name: "biscuit-in-the-sun.jpg", src: "/samples/biscuit-in-the-sun.jpg" },
  pepper: { name: "pepper-in-a-box.jpg", src: "/samples/pepper-in-a-box.jpg" },
} as const satisfies Record<string, { name: string; src: string }>;

export type SamplePhoto = keyof typeof samplePhotos;

export const uploadSample = {
  fileName: samplePhotos.mochi.name,
  src: samplePhotos.mochi.src,
  destination: "Family",
  sizeMb: 6,
  /** Progress a still holds. */
  still: 0.42,
} as const;

export const timerSample = { label: "Pasta", minutes: 5 } as const;

/**
 * Made-up tracks with covers made for this site (public/covers/, generated images, no real
 * record's art): a photographic cover reads as a real song where a drawn one read as a placeholder.
 * Each accent is the cover's own light tint, which the player's meter takes, as the system's does.
 */
export const nowPlayingSample = {
  playlist: [
    { title: "Saltwater Static", artist: "The Lagoon Club", duration: 214_000, artwork: "/covers/saltwater-static.jpg", accent: "#fea170" },
    { title: "Low Tide Radio", artist: "Harbor Lights", duration: 187_000, artwork: "/covers/low-tide-radio.jpg", accent: "#ffb455" },
    { title: "Glass Pier", artist: "Mira Okafor", duration: 242_000, artwork: "/covers/glass-pier.jpg", accent: "#dec490" },
  ],
  /** Where the first track starts, so the scrubber shows progress straight away. */
  startAt: 38_000,
} as const;

/**
 * The cat sitter calling while you're away, saved under the cat's photo, as people set a pet's
 * picture for whoever looks after it. The photo (public/callers/mochi.jpg) is an image generated for
 * this site, not a real pet or a stock photo. "mobile" is the line a phone puts over a contact's name.
 */
export const callSample = { caller: "Mochi's sitter", subtitle: "mobile", avatar: "/callers/mochi.jpg" } as const;

export const etaSample = {
  // Short enough to fit beside the minutes on a 390 pt screen.
  ride: {
    title: "Driver is on the way",
    subtitle: "7KXR482 · Silver estate",
    /** The driver, plate and car as the expanded view shows them: the name top right, the plate under it, the car on the arrival row. */
    driverName: "Kofi A.",
    plate: "7KXR482",
    vehicle: "Silver estate",
  },
  delivery: { title: "Order is on its way", subtitle: "Two items from Corner Deli" },
  /** Minutes until arrival at the start. */
  minutes: 6,
  /** How long the trip has been going at the start. */
  elapsed: 90_000,
} as const;

export const recordingSample = { title: "Voice memo", elapsed: 12_000 } as const;

export const transferSample = {
  deviceName: "Maya's Laptop",
  itemName: samplePhotos.biscuit.name,
  src: samplePhotos.biscuit.src,
  /** What the other way round receives, so receiving shows a different cat. */
  receive: { itemName: samplePhotos.pepper.name, src: samplePhotos.pepper.src },
  /** Progress a still holds. */
  still: 0.64,
} as const;

export const batterySample = {
  name: "Battery",
  level: 0.42,
  /** Minutes a full charge takes from empty, for the time to full. */
  fullCharge: 95,
} as const;
