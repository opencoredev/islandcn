"use client";

import { useState } from "react";

import { TextField } from "./controls";
import { type ActivitySpec, type Region, SAMPLE_TEXTS } from "./model";
import { type WordField, fieldsStillFit, layoutKey, wordFields, wordValue, withWords } from "./words";

interface WordFieldsProps {
  /** The activity whose words the fields edit. Required. */
  activity: ActivitySpec;
  /** Replaces the activity's regions. Required. */
  onRegions: (regions: ActivitySpec["regions"]) => void;
  /** A field took focus: the region its words show in, so the stage can show that view. Required. */
  onFocusRegion: (region: Region) => void;
}

interface Cached {
  readonly key: string;
  readonly fields: readonly WordField[];
}

/**
 * The field list for the activity. It holds still while the visitor types, even through an empty
 * field (a cleared name stays a field to type in), and is made again when the layout changes, a
 * region editor gives one field's regions different words, or words appear where no field reaches
 * (see `fieldsStillFit`).
 */
const useWordFields = (activity: ActivitySpec): readonly WordField[] => {
  const key = layoutKey(activity);
  const [cached, setCached] = useState<Cached>(() => ({ key, fields: wordFields(activity) }));
  if (fieldsStillFit({ activity, key: cached.key, fields: cached.fields })) return cached.fields;
  const next: Cached = { key, fields: wordFields(activity) };
  setCached(next);
  return next.fields;
};

/** The words the island shows, one plain field each, in the order the expanded view reads them. */
export const WordFields = ({ activity, onRegions, onFocusRegion }: WordFieldsProps) => {
  const fields = useWordFields(activity);
  if (fields.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {fields.map((field) => (
        <div key={field.id} onFocus={() => onFocusRegion(field.targets[0].region)} className="min-w-0">
          <TextField
            label={field.label}
            value={wordValue(activity, field)}
            max={field.max}
            samples={SAMPLE_TEXTS}
            onChange={(value) => onRegions(withWords({ regions: activity.regions, field, value }))}
          />
        </div>
      ))}
    </div>
  );
};
