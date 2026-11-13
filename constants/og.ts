import { ROUTES } from "./routes";

/** URL of the generated Open Graph image for a page. */
export const ogImageUrl = ({ title, description }: { title: string; description: string }) => {
  const params = new URLSearchParams({ title, description });
  return `${ROUTES.OG}?${params.toString()}`;
};
