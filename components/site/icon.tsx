import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

/**
 * The site's one icon set: Hugeicons free (MIT), outline variant. Shipped
 * registry files never import this.
 */
interface IconProps {
  icon: IconSvgElement;
  /** Size in px. Defaults to 16. */
  size?: number;
  /** Stroke width; 1.5 sits beside regular text. Defaults to 1.5. */
  strokeWidth?: number;
  /** Extra classes. Defaults to none. */
  className?: string;
}

export const Icon = ({ icon, size = 16, strokeWidth = 1.5, className }: IconProps) => (
  <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} className={className} aria-hidden />
);
