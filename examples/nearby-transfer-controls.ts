import { type Knob, viewKnob } from "./controls";

export const nearbyTransferControls = [
  {
    kind: "select",
    key: "direction",
    label: "Direction",
    options: [
      { value: "send", label: "Send" },
      { value: "receive", label: "Receive" },
    ],
    initial: "send",
  },
  { kind: "text", key: "deviceName", label: "Device name", initial: "Maya's Laptop" },
  {
    kind: "select",
    key: "device",
    label: "Device",
    options: [
      { value: "phone", label: "Phone" },
      { value: "tablet", label: "Tablet" },
      { value: "laptop", label: "Laptop" },
      { value: "desktop", label: "Desktop" },
    ],
    initial: "laptop",
  },
  { kind: "range", key: "seconds", label: "Transfer time", min: 2, max: 20, step: 1, initial: 6, unit: "s" },
  viewKnob,
] as const satisfies readonly Knob[];
