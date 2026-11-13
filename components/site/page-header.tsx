import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Page title, the page's only h1. Required. */
  title: string;
  /** One sentence under the title. Required. */
  children: ReactNode;
}

/** The top of a tool page: the title and one sentence, nothing else. */
export const PageHeader = ({ title, children }: PageHeaderProps) => (
  <header className="mx-auto max-w-[1120px] px-5 pt-12 pb-8 sm:px-8 sm:pt-16 sm:pb-10">
    <h1 className="text-title text-balance">{title}</h1>
    <p className="mt-3 max-w-[36rem] text-body text-pretty text-site-muted">{children}</p>
  </header>
);
