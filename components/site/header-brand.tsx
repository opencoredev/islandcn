"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { useIsland } from "@/lib/island";

import { BrandLockup, BrandMark } from "./brand-lockup";
import { cn } from "./cn";

/*
 * The header's brand. From lg up it is always the full lockup. Below lg the page's island sits in
 * the middle of the same row: idle it is a 95 pt pill with room for the wordmark beside it, and
 * open it covers the row (`IslandClearance` fades the row out). A compact or split island spans up
 * to 260 pt and would run into the word; shrunk to the mark, the brand read as a wordmark cut down
 * to two dots beside the pill. So while one is up the whole brand fades out, as a phone's status bar
 * gives way to an activity, and comes back whole when it ends. Under 360 px even the idle pill
 * leaves too little room for the word, so the mark stands alone there.
 */
export const HeaderBrand = () => {
  const { presentation } = useIsland();
  const wide = presentation === "compact" || presentation === "minimal";
  return (
    <Link
      href={ROUTES.HOME}
      aria-label="islandcn home"
      className={cn(
        "-m-2 rounded-[10px] p-2 transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none",
        wide && "max-lg:invisible max-lg:opacity-0",
      )}
    >
      <BrandLockup className="text-[17px] max-lg:text-[15px] max-[359px]:hidden" />
      <BrandMark className="text-[15px] min-[360px]:hidden" />
    </Link>
  );
};
