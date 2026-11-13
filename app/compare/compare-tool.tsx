"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FrameRoot } from "@/app/api/dev/dirs";
import type { FidelityRow, FidelitySeries, FrameListing, FrameSet } from "@/app/api/dev/types";

interface Source {
  root: FrameRoot;
  name: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LoadedSide {
  source: Source;
  images: HTMLImageElement[];
  /** Pill bounding box per frame in points, or null when no pill was found. */
  boxes: (Box | null)[];
  scale: number;
  fps: number;
}

type OverlayMode = "onion" | "difference";

const parseSource = (value: string | null): Source | null => {
  if (!value) return null;
  const [root, name] = value.split(":");
  if ((root !== "ref" && root !== "cap") || !name) return null;
  return { root, name };
};

const sourceKey = (source: Source | null) => (source ? `${source.root}:${source.name}` : "");

const frameUrl = (source: Source, index: number) =>
  `/api/dev/frames/${source.root}/${encodeURIComponent(source.name)}/${String(index + 1).padStart(4, "0")}.png`;

const loadImage = async (url: string) => {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
};

const pixelsOf = (image: HTMLImageElement, width = image.naturalWidth, height = image.naturalHeight) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
};

/**
 * Bounding box of the island on a light stage, sampled every other pixel: the largest dark
 * component, so the status bar's black glyphs on the reference don't count.
 */
const pillBox = (image: HTMLImageElement, scale: number): Box | null => {
  const data = pixelsOf(image);
  if (!data) return null;
  const step = 2;
  const w = Math.ceil(data.width / step);
  const h = Math.ceil(data.height / step);
  const dark = new Uint8Array(w * h);
  for (let gy = 0; gy < h; gy += 1) {
    for (let gx = 0; gx < w; gx += 1) {
      const i = (gy * step * data.width + gx * step) * 4;
      const luma = 0.2126 * (data.data[i] ?? 255) + 0.7152 * (data.data[i + 1] ?? 255) + 0.0722 * (data.data[i + 2] ?? 255);
      dark[gy * w + gx] = luma <= 40 ? 1 : 0;
    }
  }
  const label = new Int32Array(w * h);
  let best: { size: number; minX: number; minY: number; maxX: number; maxY: number } | null = null;
  let next = 0;
  const stack: number[] = [];
  for (let start = 0; start < w * h; start += 1) {
    if (!dark[start] || label[start]) continue;
    next += 1;
    label[start] = next;
    stack.push(start);
    const blob = { size: 0, minX: w, minY: h, maxX: -1, maxY: -1 };
    while (stack.length > 0) {
      const at = stack.pop() ?? 0;
      const x = at % w;
      const y = (at - x) / w;
      blob.size += 1;
      blob.minX = Math.min(blob.minX, x);
      blob.maxX = Math.max(blob.maxX, x);
      blob.minY = Math.min(blob.minY, y);
      blob.maxY = Math.max(blob.maxY, y);
      for (const n of [at - 1, at + 1, at - w, at + w]) {
        if (n < 0 || n >= w * h || label[n] || !dark[n]) continue;
        if ((n === at - 1 && x === 0) || (n === at + 1 && x === w - 1)) continue;
        label[n] = next;
        stack.push(n);
      }
    }
    if (!best || blob.size > best.size) best = blob;
  }
  if (!best) return null;
  return {
    x: (best.minX * step) / scale,
    y: (best.minY * step) / scale,
    width: ((best.maxX - best.minX + 1) * step) / scale,
    height: ((best.maxY - best.minY + 1) * step) / scale,
  };
};

/** Sequences in the order the brief ranks them; the page opens the first one with both sides. */
const preferred = ["expand", "collapse", "alert", "dismiss", "split", "unsplit", "split-alert", "appear", "appear-alert", "press"];

/** Status bar band: the top 54 pt, outside the island, is left out of the difference score. */
const statusBand = 54;

const loadSide = async (source: Source, set: FrameSet): Promise<LoadedSide> => {
  const images = await Promise.all(Array.from({ length: set.frames }, (_, index) => loadImage(frameUrl(source, index))));
  const scale = set.scale ?? 3;
  return { source, images, boxes: images.map((image) => pillBox(image, scale)), scale, fps: set.fps ?? 60 };
};

const fmt = (n: number) => n.toFixed(1);
const fmtBox = (box: Box | null | undefined) =>
  box ? `${fmt(box.width)} × ${fmt(box.height)} at ${fmt(box.x)}, ${fmt(box.y)}` : "none";

export const CompareTool = ({ initial }: { initial: { seq: string | null; left: string | null; right: string | null } }) => {
  const [listing, setListing] = useState<FrameListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<Source | null>(parseSource(initial.left));
  const [right, setRight] = useState<Source | null>(parseSource(initial.right));
  const [sides, setSides] = useState<{ left: LoadedSide | null; right: LoadedSide | null }>({ left: null, right: null });
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<OverlayMode>("difference");
  const [onion, setOnion] = useState(0.5);
  const [diffScore, setDiffScore] = useState<number | null>(null);
  const [maskStatus, setMaskStatus] = useState(true);
  const [fidelity, setFidelity] = useState<FidelitySeries | null>(null);
  // Shifts the right side in time, so takes whose events start at different frames line up.
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetch("/api/dev/frames", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`frame listing failed: ${response.status}`);
        const data: FrameListing = await response.json();
        setListing(data);
        // Default: reference on the left and our capture on the right for the requested sequence,
        // or the first sequence that has both.
        const both = (name: string) => data.ref.some((s) => s.name === name) && data.cap.some((s) => s.name === name);
        const common = data.ref.map((s) => s.name).filter(both);
        const seq = initial.seq ?? preferred.find(both) ?? common[0] ?? data.ref[0]?.name ?? data.cap[0]?.name ?? null;
        if (!seq) return;
        setLeft((current) => current ?? (data.ref.some((s) => s.name === seq) ? { root: "ref", name: seq } : { root: "cap", name: seq }));
        setRight((current) => current ?? { root: "cap", name: seq });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [initial.seq]);

  const findSet = useCallback((source: Source | null) => (source && listing ? listing[source.root].find((s) => s.name === source.name) : undefined), [listing]);

  useEffect(() => {
    const leftSet = findSet(left);
    const rightSet = findSet(right);
    if (!left || !right || !leftSet || !rightSet) return;
    let cancelled = false;
    setLoading(true);
    setPlaying(false);
    Promise.all([loadSide(left, leftSet), loadSide(right, rightSet)])
      .then(([l, r]) => {
        if (cancelled) return;
        setSides({ left: l, right: r });
        setIndex(0);
        const url = new URL(window.location.href);
        url.searchParams.set("left", sourceKey(left));
        url.searchParams.set("right", sourceKey(right));
        window.history.replaceState(null, "", url);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [left, right, findSet]);

  // Per-frame measure.py numbers for the sequence on the right (captures/_fidelity).
  const fidelitySeq = right?.name ?? left?.name ?? null;
  useEffect(() => {
    if (!fidelitySeq) return;
    let cancelled = false;
    fetch(`/api/dev/fidelity/${encodeURIComponent(fidelitySeq)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data: FidelitySeries = await response.json();
        return data;
      })
      .then((data) => !cancelled && setFidelity(data))
      .catch(() => !cancelled && setFidelity(null));
    return () => {
      cancelled = true;
    };
  }, [fidelitySeq]);

  const count = Math.max(sides.left?.images.length ?? 0, sides.right?.images.length ?? 0);
  const fps = sides.left?.fps ?? 60;
  const clampIndex = useCallback((value: number) => Math.max(0, Math.min(count - 1, value)), [count]);

  // Playback at the capture frame rate times the chosen speed.
  useEffect(() => {
    if (!playing || count === 0) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    const loop = (now: number) => {
      carry += ((now - last) / 1000) * fps * speed;
      last = now;
      const steps = Math.floor(carry);
      if (steps > 0) {
        carry -= steps;
        setIndex((i) => (i + steps) % count);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, count, fps, speed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight") setIndex((i) => clampIndex(i + 1));
      else if (event.key === "ArrowLeft") setIndex((i) => clampIndex(i - 1));
      else if (event.key === " ") {
        event.preventDefault();
        setPlaying((p) => !p);
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clampIndex]);

  const frameOf = (side: LoadedSide | null, i: number) => (side ? Math.max(0, Math.min(side.images.length - 1, i)) : 0);
  const rightIndex = frameOf(sides.right, index - offset);
  const leftImage = sides.left?.images[frameOf(sides.left, index)];
  const rightImage = sides.right?.images[rightIndex];
  const leftBoxNow = sides.left?.boxes[frameOf(sides.left, index)];
  const rightBoxNow = sides.right?.boxes[rightIndex];

  const leftCanvas = useRef<HTMLCanvasElement>(null);
  const rightCanvas = useRef<HTMLCanvasElement>(null);
  const overlayCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const draw = (canvas: HTMLCanvasElement | null, image: HTMLImageElement | undefined) => {
      if (!canvas || !image) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")?.drawImage(image, 0, 0);
    };
    draw(leftCanvas.current, leftImage);
    draw(rightCanvas.current, rightImage);

    const overlay = overlayCanvas.current;
    if (!overlay || !leftImage || !rightImage) return;
    const width = leftImage.naturalWidth;
    const height = leftImage.naturalHeight;
    overlay.width = width;
    overlay.height = height;
    const context = overlay.getContext("2d");
    if (!context) return;
    if (mode === "onion") {
      context.globalAlpha = 1;
      context.drawImage(leftImage, 0, 0);
      context.globalAlpha = onion;
      context.drawImage(rightImage, 0, 0, width, height);
      context.globalAlpha = 1;
      setDiffScore(null);
      return;
    }
    // Absolute difference per pixel, shown as a heatmap: black is identical, yellow is far apart.
    const a = pixelsOf(leftImage, width, height);
    const b = pixelsOf(rightImage, width, height);
    if (!a || !b) return;
    const out = context.createImageData(width, height);
    let total = 0;
    let counted = 0;
    // Left out of the score: the status bar band left and right of both islands.
    const scale = sides.left?.scale ?? 3;
    const boxes = [leftBoxNow, rightBoxNow].filter((box): box is Box => box !== null && box !== undefined);
    const spanMin = boxes.length ? Math.min(...boxes.map((box) => box.x)) * scale - 12 : width / 2;
    const spanMax = boxes.length ? Math.max(...boxes.map((box) => box.x + box.width)) * scale + 12 : width / 2;
    const bandBottom = statusBand * scale;
    for (let i = 0; i < a.data.length; i += 4) {
      const px = (i / 4) % width;
      const py = Math.floor(i / 4 / width);
      if (maskStatus && py < bandBottom && (px < spanMin || px > spanMax)) {
        out.data[i] = 40;
        out.data[i + 1] = 40;
        out.data[i + 2] = 60;
        out.data[i + 3] = 255;
        continue;
      }
      counted += 1;
      const d = Math.max(
        Math.abs((a.data[i] ?? 0) - (b.data[i] ?? 0)),
        Math.abs((a.data[i + 1] ?? 0) - (b.data[i + 1] ?? 0)),
        Math.abs((a.data[i + 2] ?? 0) - (b.data[i + 2] ?? 0)),
      );
      total += d;
      const v = d / 255;
      out.data[i] = Math.min(255, v * 3 * 255);
      out.data[i + 1] = Math.max(0, Math.min(255, (v * 3 - 1) * 255));
      out.data[i + 2] = Math.max(0, Math.min(255, v < 0.33 ? v * 3 * 180 : (1 - v) * 180));
      out.data[i + 3] = 255;
    }
    context.putImageData(out, 0, 0);
    setDiffScore((total / (Math.max(1, counted) * 255)) * 100);
  }, [leftImage, rightImage, mode, onion, maskStatus, leftBoxNow, rightBoxNow, sides.left?.scale]);

  const leftBox = leftBoxNow;
  const rightBox = rightBoxNow;
  const measured = (rows: FidelityRow[] | null | undefined, i: number) => (rows ? (rows[i] ?? null) : null);
  const refRow = measured(fidelity?.ref, frameOf(sides.left, index));
  const webRow = measured(fidelity?.web, rightIndex);

  const sets = useMemo(
    () => (listing ? [...listing.ref.map((s) => ({ root: "ref" as const, set: s })), ...listing.cap.map((s) => ({ root: "cap" as const, set: s }))] : []),
    [listing],
  );

  const picker = (label: string, value: Source | null, onChange: (source: Source | null) => void) => (
    <label style={field}>
      <span style={muted}>{label}</span>
      <select value={sourceKey(value)} onChange={(event) => onChange(parseSource(event.target.value))} style={select}>
        <option value="">Choose frames</option>
        {sets.map(({ root, set }) => (
          <option key={`${root}:${set.name}`} value={`${root}:${set.name}`}>
            {root === "ref" ? "reference" : "capture"} / {set.name} ({set.frames})
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <main style={page}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Compare</h1>
        {picker("Left", left, setLeft)}
        {picker("Right", right, setRight)}
        <label style={field}>
          <span style={muted}>Right offset (frames)</span>
          <input
            type="number"
            value={offset}
            onChange={(event) => setOffset(Math.round(Number(event.target.value) || 0))}
            style={{ ...select, width: 110 }}
          />
        </label>
        <span style={muted}>{loading ? "Loading frames…" : error ?? (listing && sets.length === 0 ? "No frames found in the reference or capture folders." : "")}</span>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Panel title={left ? `${left.root === "ref" ? "Reference" : "Capture"}: ${left.name}` : "Left"}>
          <canvas ref={leftCanvas} style={canvasStyle} />
        </Panel>
        <Panel title={right ? `${right.root === "ref" ? "Reference" : "Capture"}: ${right.name}` : "Right"}>
          <canvas ref={rightCanvas} style={canvasStyle} />
        </Panel>
      </section>

      <section style={controls}>
        <button type="button" style={button(false)} onClick={() => setIndex((i) => clampIndex(i - 1))} aria-label="Previous frame">
          ←
        </button>
        <button type="button" style={button(playing)} onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" style={button(false)} onClick={() => setIndex((i) => clampIndex(i + 1))} aria-label="Next frame">
          →
        </button>
        {[1, 0.25].map((value) => (
          <button key={value} type="button" style={button(speed === value)} onClick={() => setSpeed(value)}>
            {value}x
          </button>
        ))}
        <input
          type="range"
          min={0}
          max={Math.max(0, count - 1)}
          value={index}
          onChange={(event) => {
            setPlaying(false);
            setIndex(Number(event.target.value));
          }}
          style={{ flex: 1, minWidth: 200 }}
          aria-label="Frame"
        />
        <span style={{ ...muted, minWidth: 150, textAlign: "right" }}>
          Frame {count === 0 ? 0 : index + 1} of {count} · {((index * 1000) / fps).toFixed(0)} ms
        </span>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 12, alignItems: "start" }}>
        <Panel
          title={mode === "onion" ? "Onion skin: right over left" : `Difference${diffScore === null ? "" : ` · mean ${diffScore.toFixed(2)}%`}`}
          actions={
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {mode === "onion" ? (
                <input type="range" min={0} max={1} step={0.05} value={onion} onChange={(event) => setOnion(Number(event.target.value))} aria-label="Onion opacity" />
              ) : null}
              <button type="button" style={button(maskStatus)} onClick={() => setMaskStatus((m) => !m)} aria-pressed={maskStatus}>
                Mask status bar
              </button>
              <button type="button" style={button(mode === "difference")} onClick={() => setMode("difference")}>
                Difference
              </button>
              <button type="button" style={button(mode === "onion")} onClick={() => setMode("onion")}>
                Onion
              </button>
            </div>
          }
        >
          <canvas ref={overlayCanvas} style={canvasStyle} />
        </Panel>
        <Panel title="Pill box (points)">
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontVariantNumeric: "tabular-nums" }}>
            <dt style={muted}>Left</dt>
            <dd style={{ margin: 0 }}>{fmtBox(leftBox)}</dd>
            <dt style={muted}>Right</dt>
            <dd style={{ margin: 0 }}>{fmtBox(rightBox)}</dd>
            <dt style={muted}>Delta</dt>
            <dd style={{ margin: 0 }}>
              {leftBox && rightBox
                ? `w ${fmt(rightBox.width - leftBox.width)}, h ${fmt(rightBox.height - leftBox.height)}, x ${fmt(rightBox.x - leftBox.x)}, y ${fmt(rightBox.y - leftBox.y)}`
                : "none"}
            </dd>
          </dl>
          <MeasuredTable refRow={refRow} webRow={webRow} series={fidelity} offset={offset} />
          <SizeChart
            left={sides.left?.boxes ?? []}
            right={[...Array.from({ length: Math.max(0, offset) }, () => null), ...(sides.right?.boxes ?? []).slice(Math.max(0, -offset))]}
            index={index}
            onPick={(i) => setIndex(clampIndex(i))}
          />
        </Panel>
      </section>
    </main>
  );
};

const fields = [
  { key: "left", label: "left", pick: (r: FidelityRow) => r.left },
  { key: "right", label: "right", pick: (r: FidelityRow) => (r.left !== null && r.width !== null ? r.left + r.width : null) },
  { key: "top", label: "top", pick: (r: FidelityRow) => r.top },
  { key: "height", label: "height", pick: (r: FidelityRow) => r.height },
  { key: "bubble", label: "bubble left", pick: (r: FidelityRow) => r.bubbleLeft },
] as const;

/**
 * measure.py numbers for this frame (reference on the left, web on the right, with the offset),
 * and the RMS / max of web minus reference over the whole sequence on the 60 fps grid.
 */
const MeasuredTable = ({ refRow, webRow, series, offset }: { refRow: FidelityRow | null; webRow: FidelityRow | null; series: FidelitySeries | null; offset: number }) => {
  if (!series?.ref || !series.web) {
    return <p style={{ ...muted, margin: "14px 0 0" }}>No measure.py numbers for this pair yet (scripts/fidelity/capture.sh).</p>;
  }
  const ref = series.ref;
  const web = series.web;
  const totals = fields.map((field) => {
    const errors: number[] = [];
    ref.forEach((row, i) => {
      const other = web[i - offset];
      const a = field.pick(row);
      const b = other ? field.pick(other) : null;
      if (a !== null && b !== null) errors.push(b - a);
    });
    const rmsValue = errors.length ? Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length) : null;
    const maxValue = errors.length ? Math.max(...errors.map(Math.abs)) : null;
    return { rms: rmsValue, max: maxValue };
  });
  const num = (value: number | null) => (value === null ? "–" : value.toFixed(2));
  return (
    <table style={{ marginTop: 14, width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
      <thead>
        <tr style={muted}>
          <th style={cellStyle}>measured (pt)</th>
          <th style={cellStyle}>ref</th>
          <th style={cellStyle}>web</th>
          <th style={cellStyle}>Δ</th>
          <th style={cellStyle}>RMS / max</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field, i) => {
          const a = refRow ? field.pick(refRow) : null;
          const b = webRow ? field.pick(webRow) : null;
          const total = totals[i];
          return (
            <tr key={field.key}>
              <td style={{ ...cellStyle, ...muted }}>{field.label}</td>
              <td style={cellStyle}>{num(a)}</td>
              <td style={cellStyle}>{num(b)}</td>
              <td style={cellStyle}>{a !== null && b !== null ? num(b - a) : "–"}</td>
              <td style={cellStyle}>{total ? `${num(total.rms)} / ${num(total.max)}` : "–"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const cellStyle: CSSProperties = { textAlign: "right", padding: "3px 4px", fontWeight: 400 };

/** Pill width (solid) and height (dashed) over time for both sides; click to jump to a frame. */
const SizeChart = ({ left, right, index, onPick }: { left: (Box | null)[]; right: (Box | null)[]; index: number; onPick: (frame: number) => void }) => {
  const count = Math.max(left.length, right.length);
  if (count < 2) return null;
  const width = 316;
  const height = 150;
  const values = [...left, ...right].flatMap((box) => (box ? [box.width, box.height] : []));
  const max = Math.max(1, ...values) * 1.05;
  const x = (i: number) => (i / (count - 1)) * width;
  const y = (v: number) => height - (v / max) * height;
  const line = (boxes: (Box | null)[], pick: (box: Box) => number) =>
    boxes.map((box, i) => (box ? `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(pick(box)).toFixed(1)}` : "")).join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ marginTop: 14, display: "block", cursor: "pointer" }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onPick(Math.round(((event.clientX - rect.left) / rect.width) * (count - 1)));
      }}
      role="img"
      aria-label="Pill width and height per frame, left in blue, right in orange"
    >
      <path d={line(left, (b) => b.width)} fill="none" stroke="#64a8ff" strokeWidth={1.5} />
      <path d={line(right, (b) => b.width)} fill="none" stroke="#ffab40" strokeWidth={1.5} />
      <path d={line(left, (b) => b.height)} fill="none" stroke="#64a8ff" strokeWidth={1.5} strokeDasharray="3 3" />
      <path d={line(right, (b) => b.height)} fill="none" stroke="#ffab40" strokeWidth={1.5} strokeDasharray="3 3" />
      <line x1={x(index)} x2={x(index)} y1={0} y2={height} stroke="#f5f5f7" strokeOpacity={0.5} />
    </svg>
  );
};

const Panel = ({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) => (
  <div style={{ background: "#1c1c1e", borderRadius: 14, padding: 12, minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, minHeight: 30 }}>
      <span style={{ fontWeight: 600 }}>{title}</span>
      {actions}
    </div>
    {children}
  </div>
);

const page: CSSProperties = {
  minHeight: "100dvh",
  padding: 20,
  display: "grid",
  gap: 14,
  alignContent: "start",
  background: "#0b0b0c",
  color: "#f5f5f7",
  font: "14px/1.4 -apple-system, BlinkMacSystemFont, Inter, Geist, system-ui, sans-serif",
};
const muted: CSSProperties = { color: "#a1a1a6" };
const field: CSSProperties = { display: "grid", gap: 4, fontSize: 12 };
const select: CSSProperties = { minHeight: 32, background: "#2c2c2e", color: "#f5f5f7", border: 0, borderRadius: 8, padding: "0 8px", font: "inherit", fontSize: 14 };
const controls: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", background: "#1c1c1e", borderRadius: 14, padding: 10 };
const canvasStyle: CSSProperties = { display: "block", width: "100%", height: "auto", background: "#fff", borderRadius: 6 };
const button = (active: boolean): CSSProperties => ({
  minHeight: 32,
  padding: "4px 12px",
  borderRadius: 8,
  border: 0,
  background: active ? "#f5f5f7" : "#2c2c2e",
  color: active ? "#000" : "#f5f5f7",
  font: "inherit",
  cursor: "pointer",
});
